const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'keenfresh.sqlite');

if (!fs.existsSync(dbPath)) {
  console.log('Database does not exist yet. No users registered.');
  process.exit(0);
}

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
});

console.log('--- Registered Users ---');
db.all('SELECT id, email, created_at FROM users', [], (err, rows) => {
  if (err) {
    console.error('Error fetching users:', err.message);
  } else if (rows.length === 0) {
    console.log('No users registered yet.');
  } else {
    console.table(rows);
    console.log(`\nTotal users: ${rows.length}`);
  }
  db.close();
});
