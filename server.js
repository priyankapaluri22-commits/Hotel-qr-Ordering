const express = require('express');
const QRCode = require('qrcode');
const db = require('./db');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// 1. Get menu
app.get('/api/menu', (req, res) => {
  res.json(db.prepare('SELECT * FROM menu').all());
});

// 2. Place order (price is calculated on the SERVER, never trust the client)
app.post('/api/orders', (req, res) => {
  const { table, items } = req.body; // items: [{id, qty}]
  if (!table || !items || !items.length)
    return res.status(400).json({ error: 'Invalid order' });

  const getItem = db.prepare('SELECT * FROM menu WHERE id=?');
  let total = 0;
  const lines = [];

  for (const it of items) {
    const m = getItem.get(it.id);
    if (!m || it.qty < 1) return res.status(400).json({ error: 'Bad item' });
    total += m.price * it.qty;
    lines.push({ name: m.name, price: m.price, qty: it.qty });
  }

  const r = db.prepare('INSERT INTO orders (table_no, items, total) VALUES (?,?,?)')
    .run(table, JSON.stringify(lines), total);
  res.json({ id: r.lastInsertRowid, total });
});

// 3. List orders (?table=5 for a customer, no param = all unpaid for the kitchen)
app.get('/api/orders', (req, res) => {
  const rows = req.query.table
    ? db.prepare('SELECT * FROM orders WHERE table_no=? AND paid=0 ORDER BY id DESC').all(req.query.table)
    : db.prepare('SELECT * FROM orders WHERE paid=0 ORDER BY id DESC').all();
  res.json(rows.map(o => ({ ...o, items: JSON.parse(o.items) })));
});

// 4. Kitchen updates status
app.patch('/api/orders/:id', (req, res) => {
  db.prepare('UPDATE orders SET status=? WHERE id=?').run(req.body.status, req.params.id);
  res.json({ ok: true });
});

// 5. Bill for a table (all unpaid orders combined)
app.get('/api/bill/:table', (req, res) => {
  const row = db.prepare('SELECT COALESCE(SUM(total),0) s FROM orders WHERE table_no=? AND paid=0')
    .get(req.params.table);
  const subtotal = row.s;
  const tax = +(subtotal * 0.05).toFixed(2); // 5% tax
  res.json({ subtotal, tax, total: subtotal + tax });
});

// 6. Pay (fake payment: marks everything paid)
app.post('/api/pay/:table', (req, res) => {
  db.prepare('UPDATE orders SET paid=1 WHERE table_no=? AND paid=0').run(req.params.table);
  res.json({ success: true });
});

// 7. QR code image for a table: open /qr/5 in the browser`
app.get('/qr/:table', async (req, res) => {
  const url = `${req.protocol}://${req.get('host')}/menu.html?table=${req.params.table}`;
  res.type('png').send(await QRCode.toBuffer(url, { width: 400 }));
});

app.listen(3000, '0.0.0.0', () => console.log('Running on http://localhost:3000'));