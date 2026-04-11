const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./slr.db');

async function resetPasswords() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const techHash = await bcrypt.hash('tech123', 10);
  const custHash = await bcrypt.hash('client123', 10);

  db.serialize(() => {
    db.run("UPDATE users SET password = ? WHERE email = 'admin@slr.com'", [adminHash]);
    db.run("UPDATE users SET password = ? WHERE email = 'tech@slr.com'", [techHash]);
    db.run("UPDATE users SET password = ? WHERE email = 'customer@slr.com'", [custHash]);
    console.log('✅ Demo accounts updated to secure hashed format!');
  });
}

resetPasswords();
