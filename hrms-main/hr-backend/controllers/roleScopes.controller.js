const db = require('../db/mysql');

exports.listForRole = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.promise().execute('SELECT id, role_id, label, sort_order FROM role_scopes WHERE role_id = ? ORDER BY sort_order, id', [id]);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('listForRole error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { role_id, label, sort_order } = req.body;
    const [result] = await db.promise().execute('INSERT INTO role_scopes (role_id, label, sort_order) VALUES (?,?,?)', [role_id, label, sort_order || 0]);
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('create role scope error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    await db.promise().execute('DELETE FROM role_scopes WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('delete role scope error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
