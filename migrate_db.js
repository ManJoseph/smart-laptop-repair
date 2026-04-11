const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./slr.db');

db.serialize(() => {
  // Check if column exists
  db.all("PRAGMA table_info(parts)", [], (err, columns) => {
    if (err) {
      console.error('Error fetching table info:', err);
      process.exit(1);
    }
    
    const hasSupplierId = columns.some(c => c.name === 'supplier_id');
    
    if (!hasSupplierId) {
      db.run("ALTER TABLE parts ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id)", (err) => {
        if (err) {
          console.error('Error adding column:', err);
        } else {
          console.log('✅ Success: supplier_id column added to parts table.');
        }
        process.exit(0);
      });
    } else {
      console.log('ℹ️ Info: supplier_id column already exists.');
      process.exit(0);
    }
  });
});
