const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all users
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM users');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create user
router.post('/', async (req, res) => {
    const { name, email, role } = req.body;
    try {
        const [result] = await db.query('INSERT INTO users (name, email, role) VALUES (?, ?, ?)', [name, email, role]);
        res.status(201).json({ id: result.insertId, name, email, role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update user
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, role } = req.body;
    try {
        await db.query('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?', [name, email, role, id]);
        res.json({ id, name, email, role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete user
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
