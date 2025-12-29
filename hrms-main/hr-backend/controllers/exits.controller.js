const db = require('../db/mysql');

exports.listExits = async (req, res) => {
  try {
    const [rows] = await db.promise().execute('SELECT * FROM employee_exits ORDER BY updated_at DESC, id DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('listExits error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.upsertExit = async (req, res) => {
  try {
    const { employee_id, exit_reason } = req.body || {};
    if (!employee_id) {
      return res.status(400).json({ success: false, message: 'employee_id required' });
    }
    if (!exit_reason || String(exit_reason).trim() === '') {
      return res.status(400).json({ success: false, message: 'exit_reason required' });
    }
    const sql = `INSERT INTO employee_exits (employee_id, exit_reason, exit_date)
      VALUES (?, ?, CURDATE())
      ON DUPLICATE KEY UPDATE
        exit_reason = VALUES(exit_reason),
        exit_date = VALUES(exit_date)`;
    await db.promise().execute(sql, [employee_id, exit_reason]);
    res.json({ success: true });
  } catch (err) {
    console.error('upsertExit error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
