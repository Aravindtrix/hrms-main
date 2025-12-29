const db = require('../db/mysql');

exports.createDepartment = async (req, res) => {
  try {
    const { name, key_name, description } = req.body;
    const [result] = await db.promise().execute(
      'INSERT INTO departments (name, key_name, description) VALUES (?,?,?)',
      [name, key_name || null, description || null]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('createDepartment error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.listDepartments = async (req, res) => {
  try {
    const [rows] = await db.promise().execute('SELECT id, name, key_name, description, created_at FROM departments ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('listDepartments error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.promise().execute('SELECT id, name, key_name, description, created_at FROM departments WHERE id = ? LIMIT 1', [id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('getDepartment error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, key_name, description } = req.body;
    const updates = [];
    const params = [];
    if (typeof name !== 'undefined') { updates.push('name = ?'); params.push(name); }
    if (typeof key_name !== 'undefined') { updates.push('key_name = ?'); params.push(key_name); }
    if (typeof description !== 'undefined') { updates.push('description = ?'); params.push(description); }
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'nothing to update' });
    params.push(id);
    await db.promise().execute(`UPDATE departments SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true });
  } catch (err) {
    console.error('updateDepartment error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    await db.promise().execute('DELETE FROM departments WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('deleteDepartment error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
