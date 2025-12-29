const db = require('../db/mysql');

const toDateOnly = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toISOString().slice(0, 10);
};

exports.getByCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const [rows] = await db.promise().execute('SELECT * FROM employees WHERE candidate_id = ? LIMIT 1', [candidateId]);
    if (!rows[0]) return res.json({ success: true, data: null });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('getByCandidate error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.upsertEmployee = async (req, res) => {
  try {
    const { candidate_id } = req.body || {};
    if (!candidate_id) return res.status(400).json({ success: false, message: 'candidate_id required' });

    const [cRows] = await db.promise().execute('SELECT status FROM candidates WHERE id = ? LIMIT 1', [candidate_id]);
    if (!cRows[0]) return res.status(404).json({ success: false, message: 'Candidate not found' });
    if (cRows[0].status === 'rejected') {
      return res.status(400).json({ success: false, message: 'Cannot save offer details for rejected candidates' });
    }

    const fields = req.body || {};
    const allowed = ['offer_date','offer_address_line1','offer_address_line2','offer_address_line3','offer_designation','offer_joining_date','offer_basic','offer_conveyance','offer_medical','offer_hra','offer_special','offer_gross','offer_pf','offer_tds','offer_net','offer_employer_pf','offer_insurance','offer_ctc'];
    const updates = [];
    const params = [];

    for (const k of allowed) {
      if (typeof fields[k] !== 'undefined') {
        if (k === 'offer_date' || k === 'offer_joining_date') {
          updates.push(`${k} = ?`);
          params.push(toDateOnly(fields[k]));
        } else {
          updates.push(`${k} = ?`);
          params.push(fields[k]);
        }
      }
    }

    const [eRows] = await db.promise().execute('SELECT id FROM employees WHERE candidate_id = ? LIMIT 1', [candidate_id]);
    if (eRows[0]) {
      if (updates.length === 0) return res.status(400).json({ success: false, message: 'nothing to update' });
      const sql = `UPDATE employees SET ${updates.join(', ')} WHERE candidate_id = ?`;
      params.push(candidate_id);
      await db.promise().execute(sql, params);
      return res.json({ success: true });
    }

    const columns = ['candidate_id', ...updates.map(u => u.split(' = ')[0])];
    const placeholders = columns.map(() => '?');
    const insertParams = [candidate_id, ...params];
    const insertSql = `INSERT INTO employees (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    await db.promise().execute(insertSql, insertParams);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('upsertEmployee error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.listEmployees = async (req, res) => {
  try {
    const sql = `SELECT c.id AS candidate_id, c.candidate_name, c.phone, c.email, c.role_key, e.offer_ctc
      FROM candidates c
      INNER JOIN employees e ON e.candidate_id = c.id
      WHERE c.status = 'hired'
      ORDER BY c.candidate_name`;
    const [rows] = await db.promise().execute(sql);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('listEmployees error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
