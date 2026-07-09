const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
  res.json(categories);
});

router.post('/', (req, res) => {
  const { name, color = '#6b7280' } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  try {
    const result = db.prepare('INSERT INTO categories (name, color) VALUES (?, ?)').run(name.trim(), color);
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(category);
  } catch (err) {
    res.status(409).json({ error: 'category already exists' });
  }
});

module.exports = router;
