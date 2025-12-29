const db = require('../db/mysql');

exports.createRole = async (req, res) => {
  try {
    const { department_id, title, key_name, description } = req.body;
    const [result] = await db.promise().execute(
      'INSERT INTO roles (department_id, title, key_name, description) VALUES (?,?,?,?)',
      [department_id || null, title, key_name || null, description || null]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('createRole error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.listRoles = async (req, res) => {
  try {
    const { department_id, key_name } = req.query;
    let sql = 'SELECT r.id, r.department_id, r.title, r.key_name, r.description, r.created_at, d.name as department_name FROM roles r LEFT JOIN departments d ON d.id = r.department_id';
    const params = [];
    if (department_id) { sql += ' WHERE r.department_id = ?'; params.push(department_id); }
    if (key_name) {
      sql += (params.length ? ' AND' : ' WHERE') + ' r.key_name = ?';
      params.push(key_name);
    }
    sql += ' ORDER BY r.title';
    const [rows] = await db.promise().execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('listRoles error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getRole = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.promise().execute('SELECT id, department_id, title, key_name, description, created_at FROM roles WHERE id = ? LIMIT 1', [id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('getRole error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { department_id, title, key_name, description } = req.body;
    const updates = [];
    const params = [];
    if (typeof department_id !== 'undefined') { updates.push('department_id = ?'); params.push(department_id); }
    if (typeof title !== 'undefined') { updates.push('title = ?'); params.push(title); }
    if (typeof key_name !== 'undefined') { updates.push('key_name = ?'); params.push(key_name); }
    if (typeof description !== 'undefined') { updates.push('description = ?'); params.push(description); }
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'nothing to update' });
    params.push(id);
    await db.promise().execute(`UPDATE roles SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true });
  } catch (err) {
    console.error('updateRole error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    await db.promise().execute('DELETE FROM roles WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('deleteRole error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
