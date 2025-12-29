const db = require('../db/mysql');

exports.listScores = async (req, res) => {
  try {
    const sql = `SELECT s.*, c.candidate_name
      FROM employee_performance_scores s
      LEFT JOIN candidates c ON c.id = s.employee_id
      ORDER BY s.updated_at DESC, s.id DESC`;
    const [rows] = await db.promise().execute(sql);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('listScores error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.upsertScore = async (req, res) => {
  try {
    const {
      id,
      employee_id,
      category_1,
      category_2,
      category_3,
      category_4,
      category_5,
      period_start,
      period_end
    } = req.body || {};

    if (!employee_id) {
      return res.status(400).json({ success: false, message: 'employee_id required' });
    }

    if (id) {
      const sql = `UPDATE employee_performance_scores
        SET employee_id = ?, category_1 = ?, category_2 = ?, category_3 = ?, category_4 = ?, category_5 = ?,
            period_start = ?, period_end = ?
        WHERE id = ?`;
      const params = [
        employee_id,
        category_1 ?? null,
        category_2 ?? null,
        category_3 ?? null,
        category_4 ?? null,
        category_5 ?? null,
        period_start ?? null,
        period_end ?? null,
        id
      ];
      await db.promise().execute(sql, params);
    } else {
      const sql = `INSERT INTO employee_performance_scores
        (employee_id, category_1, category_2, category_3, category_4, category_5, period_start, period_end)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      const params = [
        employee_id,
        category_1 ?? null,
        category_2 ?? null,
        category_3 ?? null,
        category_4 ?? null,
        category_5 ?? null,
        period_start ?? null,
        period_end ?? null
      ];
      await db.promise().execute(sql, params);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('upsertScore error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteScore = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'id required' });
    }
    await db.promise().execute('DELETE FROM employee_performance_scores WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('deleteScore error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.listActions = async (req, res) => {
  try {
    const sql = `SELECT * FROM employee_performance_actions ORDER BY updated_at DESC, id DESC`;
    const [rows] = await db.promise().execute(sql);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('listActions error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.upsertAction = async (req, res) => {
  try {
    const { employee_id, action, increment_ctc, training_feedback } = req.body || {};
    if (!employee_id) {
      return res.status(400).json({ success: false, message: 'employee_id required' });
    }
    if (!action) {
      return res.status(400).json({ success: false, message: 'action required' });
    }

    const sql = `INSERT INTO employee_performance_actions (employee_id, action, increment_ctc, training_feedback)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        action = VALUES(action),
        increment_ctc = VALUES(increment_ctc),
        training_feedback = VALUES(training_feedback)`;
    await db.promise().execute(sql, [employee_id, action, increment_ctc ?? null, training_feedback ?? null]);

    if ((action === 'increment' || action === 'promotion_increment') && increment_ctc) {
      await db.promise().execute('UPDATE employees SET offer_ctc = ? WHERE candidate_id = ?', [increment_ctc, employee_id]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('upsertAction error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
