const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const SALT_ROUNDS = 10;

app.use(cors());
app.use(express.json());

// ─── Database ────────────────────────────────────────────
const db = new sqlite3.Database('./slr.db', (err) => {
  if (err) { console.error('DB error:', err); }
  else { console.log('✅ Connected to SQLite.'); initDatabase(); }
});

function initDatabase() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('customer','technician','admin'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact TEXT DEFAULT '',
      email TEXT DEFAULT '',
      address TEXT DEFAULT ''
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      stock_level INTEGER DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      supplier_id INTEGER,
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS repairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      technician_id INTEGER,
      device_model TEXT NOT NULL,
      problem_description TEXT NOT NULL,
      status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending','Diagnosing','Fixing','Completed','Cancelled')),
      notes TEXT DEFAULT '',
      cost REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(customer_id) REFERENCES users(id),
      FOREIGN KEY(technician_id) REFERENCES users(id)
    )`);

    // Seed admin users with hashed passwords
    db.get("SELECT COUNT(*) AS count FROM users WHERE role='admin'", async (err, row) => {
      if (row && row.count === 0) {
        const adminHash = await bcrypt.hash('admin123', SALT_ROUNDS);
        const techHash  = await bcrypt.hash('tech123',  SALT_ROUNDS);
        const custHash  = await bcrypt.hash('client123', SALT_ROUNDS);
        db.run(`INSERT INTO users (name,email,password,role) VALUES ('Admin','admin@slr.com',?,'admin')`, [adminHash]);
        db.run(`INSERT INTO users (name,email,password,role) VALUES ('Tech 1','tech@slr.com',?,'technician')`, [techHash]);
        db.run(`INSERT INTO users (name,email,password,role) VALUES ('Customer A','customer@slr.com',?,'customer')`, [custHash]);
      }
    });

    db.get("SELECT COUNT(*) AS count FROM suppliers", (err, row) => {
      if (row && row.count === 0) {
        db.run(`INSERT INTO suppliers (name,contact,email,address) VALUES ('TechParts Rwanda','+250788000001','info@techparts.rw','Kigali, Rwanda')`);
        db.run(`INSERT INTO suppliers (name,contact,email,address) VALUES ('LaptopSpares Ltd','+250788000002','sales@laptopspares.com','Nairobi, Kenya')`);
      }
    });

    db.get("SELECT COUNT(*) AS count FROM parts", (err, row) => {
      if (row && row.count === 0) {
        db.run(`INSERT INTO parts (name,stock_level,cost,supplier_id) VALUES ('Screen 15.6"',5,80.00,1)`);
        db.run(`INSERT INTO parts (name,stock_level,cost,supplier_id) VALUES ('Battery 6-cell',10,45.00,1)`);
        db.run(`INSERT INTO parts (name,stock_level,cost,supplier_id) VALUES ('Thermal Paste',50,10.00,2)`);
        db.run(`INSERT INTO parts (name,stock_level,cost,supplier_id) VALUES ('Cooling Fan',12,25.00,2)`);
        db.run(`INSERT INTO parts (name,stock_level,cost,supplier_id) VALUES ('RAM 8GB DDR4',8,35.00,1)`);
        db.run(`INSERT INTO parts (name,stock_level,cost,supplier_id) VALUES ('SSD 256GB',6,60.00,2)`);
      }
    });
  });
}

// ─── AI Diagnosis Module ──────────────────────────────────
const aiDiagnose = (desc) => {
  const d = desc.toLowerCase();
  const s = [];
  if (d.includes('heat')||d.includes('hot')||d.includes('shut')||d.includes('fan'))  { s.push({cause:'Clogged Fan',probability:70,action:'Clean fan & check airflow'}); s.push({cause:'Dried Thermal Paste',probability:20,action:'Re-apply thermal paste'}); }
  if (d.includes('screen')||d.includes('display')||d.includes('crack')||d.includes('lines')) { s.push({cause:'Broken Screen Panel',probability:85,action:'Replace Screen'}); s.push({cause:'Loose Ribbon Cable',probability:10,action:'Reseat display cable'}); }
  if (d.includes('battery')||d.includes('charge')||d.includes('power')||d.includes('dead')) { s.push({cause:'Degraded Battery',probability:60,action:'Replace Battery'}); s.push({cause:'Faulty Charger/Port',probability:30,action:'Test with new charger'}); }
  if (d.includes('slow')||d.includes('freeze')||d.includes('crash')||d.includes('lag'))  { s.push({cause:'Failing HDD/SSD',probability:50,action:'Run disk health check / Replace'}); s.push({cause:'Insufficient RAM',probability:30,action:'Upgrade RAM'}); }
  if (d.includes('keyboard')||d.includes('key')||d.includes('typing'))  { s.push({cause:'Faulty Keyboard',probability:75,action:'Replace keyboard unit'}); }
  if (d.includes('wifi')||d.includes('internet')||d.includes('network'))  { s.push({cause:'Failed WiFi Card',probability:65,action:'Replace WiFi module'}); s.push({cause:'Driver Corruption',probability:25,action:'Reinstall WiFi drivers'}); }
  if (s.length === 0) s.push({cause:'Unknown Issue',probability:50,action:'Perform full system diagnostic'});
  return s;
};

// ─── API Routes ───────────────────────────────────────────

// LOGIN – now uses bcrypt compare
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, row.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const { password: _pw, ...user } = row; // never send password to client
    res.json({ user });
  });
});

// REGISTER – hashes password before storing
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  db.get('SELECT id FROM users WHERE email = ?', [email], async (err, existing) => {
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    db.run('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)',
      [name, email, hashed, 'customer'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ user: { id: this.lastID, name, email, role: 'customer' } });
    });
  });
});

// PARTS
app.get('/api/parts', (req, res) => {
  db.all('SELECT p.*, s.name as supplier_name FROM parts p LEFT JOIN suppliers s ON p.supplier_id = s.id', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/parts', (req, res) => {
  const { name, stock_level, cost, supplier_id } = req.body;
  db.run('INSERT INTO parts (name,stock_level,cost,supplier_id) VALUES (?,?,?,?)',
    [name, stock_level || 0, cost || 0, supplier_id || null], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
  });
});

app.put('/api/parts/:id', (req, res) => {
  const { stock_level, cost, supplier_id } = req.body;
  db.run('UPDATE parts SET stock_level=COALESCE(?,stock_level), cost=COALESCE(?,cost), supplier_id=COALESCE(?,supplier_id) WHERE id=?',
    [stock_level, cost, supplier_id, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
  });
});

app.delete('/api/parts/:id', (req, res) => {
  db.run('DELETE FROM parts WHERE id=?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// SUPPLIERS
app.get('/api/suppliers', (req, res) => {
  db.all('SELECT * FROM suppliers ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/suppliers', (req, res) => {
  const { name, contact, email, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Supplier name required' });
  db.run('INSERT INTO suppliers (name,contact,email,address) VALUES (?,?,?,?)',
    [name, contact || '', email || '', address || ''], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
  });
});

app.put('/api/suppliers/:id', (req, res) => {
  const { name, contact, email, address } = req.body;
  db.run('UPDATE suppliers SET name=COALESCE(?,name), contact=COALESCE(?,contact), email=COALESCE(?,email), address=COALESCE(?,address) WHERE id=?',
    [name, contact, email, address, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
  });
});

app.delete('/api/suppliers/:id', (req, res) => {
  db.run('DELETE FROM suppliers WHERE id=?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// REPAIRS
app.get('/api/repairs', (req, res) => {
  const { customer_id } = req.query;
  let query = `SELECT r.*, u.name as customer_name, t.name as technician_name
    FROM repairs r
    LEFT JOIN users u ON r.customer_id = u.id
    LEFT JOIN users t ON r.technician_id = t.id`;
  const params = [];
  if (customer_id) { query += ' WHERE r.customer_id = ?'; params.push(customer_id); }
  query += ' ORDER BY r.created_at DESC';
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/repairs/:id', (req, res) => {
  db.get(`SELECT r.*, u.name as customer_name, u.email as customer_email, t.name as technician_name
    FROM repairs r LEFT JOIN users u ON r.customer_id = u.id LEFT JOIN users t ON r.technician_id = t.id
    WHERE r.id=?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });
});

app.post('/api/repairs', (req, res) => {
  const { customer_id, device_model, problem_description } = req.body;
  db.run('INSERT INTO repairs (customer_id,device_model,problem_description) VALUES (?,?,?)',
    [customer_id, device_model, problem_description], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, status: 'Pending' });
  });
});

app.put('/api/repairs/:id', (req, res) => {
  const { status, technician_id, cost, notes } = req.body;
  db.run('UPDATE repairs SET status=COALESCE(?,status), technician_id=COALESCE(?,technician_id), cost=COALESCE(?,cost), notes=COALESCE(?,notes) WHERE id=?',
    [status, technician_id, cost, notes, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
  });
});

app.put('/api/repairs/:id/assign', (req, res) => {
  const { technician_id } = req.body;
  db.run('UPDATE repairs SET technician_id=? WHERE id=?', [technician_id, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// AI DIAGNOSIS
app.get('/api/ai-diagnose/:repairId', (req, res) => {
  db.get('SELECT problem_description FROM repairs WHERE id=?', [req.params.repairId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Repair not found' });
    res.json({ diagnosis: aiDiagnose(row.problem_description) });
  });
});

// ANALYTICS
app.get('/api/analytics', (req, res) => {
  db.get("SELECT COUNT(*) as totalRepairs, COALESCE(SUM(cost),0) as totalIncome FROM repairs WHERE status='Completed'", [], (err, completedRow) => {
    db.get("SELECT COUNT(*) as pendingRepairs FROM repairs WHERE status NOT IN ('Completed','Cancelled')", [], (err, pendingRow) => {
      db.all("SELECT problem_description as problem, COUNT(*) as count FROM repairs GROUP BY problem_description ORDER BY count DESC LIMIT 5", [], (err, commonRows) => {
        db.all(`SELECT date(created_at) as day, COUNT(*) as count, COALESCE(SUM(cost),0) as income
          FROM repairs WHERE status='Completed' AND created_at >= date('now','-7 days')
          GROUP BY date(created_at) ORDER BY day ASC`, [], (err, weeklyRows) => {
          db.get("SELECT COUNT(*) as c FROM users WHERE role='customer'", [], (err, custRow) => {
            db.get("SELECT COUNT(*) as c FROM users WHERE role='technician'", [], (err, techRow) => {
              res.json({
                totalRepairsCompleted: completedRow.totalRepairs || 0,
                totalIncome: completedRow.totalIncome || 0,
                pendingRepairs: pendingRow.pendingRepairs || 0,
                totalCustomers: custRow.c || 0,
                totalTechnicians: techRow.c || 0,
                commonProblems: commonRows || [],
                weeklyData: weeklyRows || []
              });
            });
          });
        });
      });
    });
  });
});

// USERS (Admin)
app.get('/api/users', (req, res) => {
  db.all('SELECT id,name,email,role FROM users ORDER BY role,name', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/users', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  db.run('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)',
    [name, email, hashed, role], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
  });
});

app.delete('/api/users/:id', (req, res) => {
  db.run('DELETE FROM users WHERE id=?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ─── EXCEL EXPORTS ────────────────────────────────────────
function sendExcel(res, data, sheetName, fileName) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
}

app.get('/api/export/repairs', (req, res) => {
  db.all(`SELECT r.id as "Repair ID", u.name as "Customer", r.device_model as "Device",
    r.problem_description as "Problem", r.status as "Status",
    r.cost as "Cost ($)", t.name as "Technician", r.notes as "Notes",
    r.created_at as "Date"
    FROM repairs r LEFT JOIN users u ON r.customer_id=u.id LEFT JOIN users t ON r.technician_id=t.id
    ORDER BY r.created_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    sendExcel(res, rows, 'Repairs', 'SLR_Repairs_Report');
  });
});

app.get('/api/export/parts', (req, res) => {
  db.all(`SELECT p.id as "Part ID", p.name as "Part Name", p.stock_level as "Stock",
    p.cost as "Unit Cost ($)", s.name as "Supplier"
    FROM parts p LEFT JOIN suppliers s ON p.supplier_id=s.id ORDER BY p.name`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    sendExcel(res, rows, 'Parts Inventory', 'SLR_Parts_Inventory');
  });
});

app.get('/api/export/suppliers', (req, res) => {
  db.all(`SELECT id as "ID", name as "Supplier Name", contact as "Contact", email as "Email", address as "Address" FROM suppliers ORDER BY name`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    sendExcel(res, rows, 'Suppliers', 'SLR_Suppliers');
  });
});

app.listen(PORT, () => console.log(`🚀 SLR server running on port ${PORT}`));
