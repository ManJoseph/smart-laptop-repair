const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const SALT_ROUNDS = 10;

app.use(cors());
app.use(express.json());

// ─── PostgreSQL Database ───────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

// NOTE: You must manually create your tables in PostgreSQL. See README for schema.
// Optionally, you can add a migration script to create tables and seed data.
console.log('✅ Connected to PostgreSQL.');

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
  query('SELECT * FROM users WHERE email = $1', [email])
    .then(async result => {
      const row = result.rows[0];
      if (!row) return res.status(401).json({ error: 'Invalid credentials' });
      const match = await bcrypt.compare(password, row.password);
      if (!match) return res.status(401).json({ error: 'Invalid credentials' });
      const { password: _pw, ...user } = row;
      res.json({ user });
    })
    .catch(err => res.status(500).json({ error: err.message }));
});

// REGISTER – hashes password before storing
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  query('SELECT id FROM users WHERE email = $1', [email])
    .then(async result => {
      if (result.rows.length > 0) return res.status(409).json({ error: 'Email already registered' });
      const hashed = await bcrypt.hash(password, SALT_ROUNDS);
      const insertRes = await query('INSERT INTO users (name,email,password,role) VALUES ($1,$2,$3,$4) RETURNING id',
        [name, email, hashed, 'customer']);
      res.json({ user: { id: insertRes.rows[0].id, name, email, role: 'customer' } });
    })
    .catch(err => res.status(500).json({ error: err.message }));
});

// PARTS
app.get('/api/parts', (req, res) => {
  query('SELECT p.*, s.name as supplier_name FROM parts p LEFT JOIN suppliers s ON p.supplier_id = s.id')
    .then(result => res.json(result.rows))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.post('/api/parts', (req, res) => {
  const { name, stock_level, cost, supplier_id } = req.body;
  query('INSERT INTO parts (name,stock_level,cost,supplier_id) VALUES ($1,$2,$3,$4) RETURNING id',
    [name, stock_level || 0, cost || 0, supplier_id || null])
    .then(result => res.json({ success: true, id: result.rows[0].id }))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.put('/api/parts/:id', (req, res) => {
  const { stock_level, cost, supplier_id } = req.body;
  query('UPDATE parts SET stock_level=COALESCE($1,stock_level), cost=COALESCE($2,cost), supplier_id=COALESCE($3,supplier_id) WHERE id=$4',
    [stock_level, cost, supplier_id, req.params.id])
    .then(() => res.json({ success: true }))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.delete('/api/parts/:id', (req, res) => {
  query('DELETE FROM parts WHERE id=$1', [req.params.id])
    .then(() => res.json({ success: true }))
    .catch(err => res.status(500).json({ error: err.message }));
});

// SUPPLIERS
app.get('/api/suppliers', (req, res) => {
  query('SELECT * FROM suppliers ORDER BY name')
    .then(result => res.json(result.rows))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.post('/api/suppliers', (req, res) => {
  const { name, contact, email, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Supplier name required' });
  query('INSERT INTO suppliers (name,contact,email,address) VALUES ($1,$2,$3,$4) RETURNING id',
    [name, contact || '', email || '', address || ''])
    .then(result => res.json({ success: true, id: result.rows[0].id }))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.put('/api/suppliers/:id', (req, res) => {
  const { name, contact, email, address } = req.body;
  query('UPDATE suppliers SET name=COALESCE($1,name), contact=COALESCE($2,contact), email=COALESCE($3,email), address=COALESCE($4,address) WHERE id=$5',
    [name, contact, email, address, req.params.id])
    .then(() => res.json({ success: true }))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.delete('/api/suppliers/:id', (req, res) => {
  query('DELETE FROM suppliers WHERE id=$1', [req.params.id])
    .then(() => res.json({ success: true }))
    .catch(err => res.status(500).json({ error: err.message }));
});

// REPAIRS
app.get('/api/repairs', (req, res) => {
  const { customer_id } = req.query;
  let q = `SELECT r.*, u.name as customer_name, t.name as technician_name
    FROM repairs r
    LEFT JOIN users u ON r.customer_id = u.id
    LEFT JOIN users t ON r.technician_id = t.id`;
  const params = [];
  if (customer_id) { q += ' WHERE r.customer_id = $1'; params.push(customer_id); }
  q += ' ORDER BY r.created_at DESC';
  query(q, params)
    .then(result => res.json(result.rows))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.get('/api/repairs/:id', (req, res) => {
  query(`SELECT r.*, u.name as customer_name, u.email as customer_email, t.name as technician_name
    FROM repairs r LEFT JOIN users u ON r.customer_id = u.id LEFT JOIN users t ON r.technician_id = t.id
    WHERE r.id=$1`, [req.params.id])
    .then(result => {
      const row = result.rows[0];
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    })
    .catch(err => res.status(500).json({ error: err.message }));
});

app.post('/api/repairs', (req, res) => {
  const { customer_id, device_model, problem_description } = req.body;
  query('INSERT INTO repairs (customer_id,device_model,problem_description) VALUES ($1,$2,$3) RETURNING id',
    [customer_id, device_model, problem_description])
    .then(result => res.json({ id: result.rows[0].id, status: 'Pending' }))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.put('/api/repairs/:id', (req, res) => {
  const { status, technician_id, cost, notes } = req.body;
  query('UPDATE repairs SET status=COALESCE($1,status), technician_id=COALESCE($2,technician_id), cost=COALESCE($3,cost), notes=COALESCE($4,notes) WHERE id=$5',
    [status, technician_id, cost, notes, req.params.id])
    .then(() => res.json({ success: true }))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.put('/api/repairs/:id/assign', (req, res) => {
  const { technician_id } = req.body;
  query('UPDATE repairs SET technician_id=$1 WHERE id=$2', [technician_id, req.params.id])
    .then(() => res.json({ success: true }))
    .catch(err => res.status(500).json({ error: err.message }));
});

// AI DIAGNOSIS
app.get('/api/ai-diagnose/:repairId', (req, res) => {
  query('SELECT problem_description FROM repairs WHERE id=$1', [req.params.repairId])
    .then(result => {
      const row = result.rows[0];
      if (!row) return res.status(404).json({ error: 'Repair not found' });
      res.json({ diagnosis: aiDiagnose(row.problem_description) });
    })
    .catch(err => res.status(500).json({ error: err.message }));
});

// ANALYTICS
app.get('/api/analytics', (req, res) => {
  Promise.all([
    query("SELECT COUNT(*) as totalRepairs, COALESCE(SUM(cost),0) as totalIncome FROM repairs WHERE status='Completed'"),
    query("SELECT COUNT(*) as pendingRepairs FROM repairs WHERE status NOT IN ('Completed','Cancelled')"),
    query("SELECT problem_description as problem, COUNT(*) as count FROM repairs GROUP BY problem_description ORDER BY count DESC LIMIT 5"),
    query(`SELECT to_char(created_at, 'YYYY-MM-DD') as day, COUNT(*) as count, COALESCE(SUM(cost),0) as income
      FROM repairs WHERE status='Completed' AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY to_char(created_at, 'YYYY-MM-DD') ORDER BY day ASC`),
    query("SELECT COUNT(*) as c FROM users WHERE role='customer'"),
    query("SELECT COUNT(*) as c FROM users WHERE role='technician'")
  ]).then(([completed, pending, common, weekly, cust, tech]) => {
    res.json({
      totalRepairsCompleted: completed.rows[0].totalrepairs || 0,
      totalIncome: completed.rows[0].totalincome || 0,
      pendingRepairs: pending.rows[0].pendingrepairs || 0,
      totalCustomers: cust.rows[0].c || 0,
      totalTechnicians: tech.rows[0].c || 0,
      commonProblems: common.rows || [],
      weeklyData: weekly.rows || []
    });
  }).catch(err => res.status(500).json({ error: err.message }));
});

// USERS (Admin)
app.get('/api/users', (req, res) => {
  query('SELECT id,name,email,role FROM users ORDER BY role,name')
    .then(result => res.json(result.rows))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.post('/api/users', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  query('INSERT INTO users (name,email,password,role) VALUES ($1,$2,$3,$4) RETURNING id',
    [name, email, hashed, role])
    .then(result => res.json({ success: true, id: result.rows[0].id }))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.delete('/api/users/:id', (req, res) => {
  query('DELETE FROM users WHERE id=$1', [req.params.id])
    .then(() => res.json({ success: true }))
    .catch(err => res.status(500).json({ error: err.message }));
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
  query(`SELECT r.id as "Repair ID", u.name as "Customer", r.device_model as "Device",
    r.problem_description as "Problem", r.status as "Status",
    r.cost as "Cost ($)", t.name as "Technician", r.notes as "Notes",
    r.created_at as "Date"
    FROM repairs r LEFT JOIN users u ON r.customer_id=u.id LEFT JOIN users t ON r.technician_id=t.id
    ORDER BY r.created_at DESC`)
    .then(result => sendExcel(res, result.rows, 'Repairs', 'SLR_Repairs_Report'))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.get('/api/export/parts', (req, res) => {
  query(`SELECT p.id as "Part ID", p.name as "Part Name", p.stock_level as "Stock",
    p.cost as "Unit Cost ($)", s.name as "Supplier"
    FROM parts p LEFT JOIN suppliers s ON p.supplier_id=s.id ORDER BY p.name`)
    .then(result => sendExcel(res, result.rows, 'Parts Inventory', 'SLR_Parts_Inventory'))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.get('/api/export/suppliers', (req, res) => {
  query(`SELECT id as "ID", name as "Supplier Name", contact as "Contact", email as "Email", address as "Address" FROM suppliers ORDER BY name`)
    .then(result => sendExcel(res, result.rows, 'Suppliers', 'SLR_Suppliers'))
    .catch(err => res.status(500).json({ error: err.message }));
});
// ─── Serve Frontend ───────────────────────────────────────
app.use(express.static(path.join(__dirname, 'client', 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`🚀 SLR server running on port ${PORT}`));
}

module.exports = app;
