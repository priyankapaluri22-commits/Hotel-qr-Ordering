const Database = require('better-sqlite3');
const db = new Database('hotel.db');

db.exec(`
CREATE TABLE IF NOT EXISTS menu (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT, price REAL, category TEXT
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_no INTEGER,
  items TEXT,
  total REAL,
  status TEXT DEFAULT 'Received',
  paid INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

if (db.prepare('SELECT COUNT(*) c FROM menu').get().c === 0) {
  const ins = db.prepare('INSERT INTO menu (name, price, category) VALUES (?,?,?)');
  [
    ['Paneer Tikka', 220, 'Starters'],
    ['Veg Spring Rolls', 150, 'Starters'],
    ['Butter Chicken', 320, 'Main Course'],
    ['Veg Biryani', 240, 'Main Course'],
    ['Garlic Naan', 50, 'Breads'],
    ['Gulab Jamun', 90, 'Desserts'],
    ['Masala Chai', 40, 'Drinks'],
    ['Fresh Lime Soda', 70, 'Drinks'],
  ].forEach(r => ins.run(...r));
}

module.exports = db;