const db = require('../db/mysql');

exports.createTicket = async (req, res) => {
  try {
    const { role_key, role_id, department, quantity, created_by, jd_required, payload, expected_date } = req.body;
    // accept either role_key (legacy) or role_id (preferred) along with department and creator
    if ((!role_key && typeof role_id === 'undefined') || !department || !created_by) return res.status(400).json({ success: false, message: 'role_key or role_id, department and created_by required' });

    // normalize expected_date to MySQL DATE (YYYY-MM-DD) if provided
    let expectedDateValue = null;
    if (expected_date) {
      if (typeof expected_date === 'string') {
        expectedDateValue = expected_date.split('T')[0];
      } else {
        try {
          const d = new Date(expected_date);
          if (!isNaN(d.getTime())) expectedDateValue = d.toISOString().slice(0, 10);
        } catch (e) { expectedDateValue = null; }
      }
    }

    const [result] = await db.promise().execute(
      'INSERT INTO tickets (role_key, role_id, department, quantity, created_by, jd_required, payload, expected_date) VALUES (?,?,?,?,?,?,?,?)',
      [role_key || null, (typeof role_id !== 'undefined' ? role_id : null), department, quantity || 1, created_by, jd_required ? 1 : 0, JSON.stringify(payload || {}), expectedDateValue]
    );

    // Return created row id
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('createTicket error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.listTickets = async (req, res) => {
  try {
    const { forRole, created_by, department, unreadOnly } = req.query;

    if (forRole === 'hr') {
      let sql = 'SELECT * FROM tickets';
      const params = [];
      if (unreadOnly === 'true') {
        sql += ' WHERE is_read_by_hr = 0 AND status = ?';
        params.push('new');
      }
      sql += ' ORDER BY created_at DESC';
      const [rows] = await db.promise().execute(sql, params);
      return res.json({ success: true, data: rows });
    }

    // for heads: filter by created_by or department
    if (!created_by && !department) return res.status(400).json({ success: false, message: 'created_by or department required' });
    let sql = 'SELECT * FROM tickets WHERE 1=1';
    const params = [];
    if (created_by) { sql += ' AND created_by = ?'; params.push(created_by); }
    if (department) { sql += ' AND department = ?'; params.push(department); }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await db.promise().execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('listTickets error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, is_read_by_hr, hr_notes } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'id required' });

    const updates = [];
    const params = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (typeof is_read_by_hr !== 'undefined') { updates.push('is_read_by_hr = ?'); params.push(is_read_by_hr ? 1 : 0); }
    if (typeof hr_notes !== 'undefined') { updates.push('hr_notes = ?'); params.push(hr_notes); }
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'nothing to update' });

    const sql = `UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);
    await db.promise().execute(sql, params);
    res.json({ success: true });
  } catch (err) {
    console.error('updateTicket error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.notifications = async (req, res) => {
  try {
    const [rows] = await db.promise().execute('SELECT COUNT(*) AS unread FROM tickets WHERE is_read_by_hr = 0 AND status = ?', ['new']);
    const unread = rows[0] ? rows[0].unread : 0;
    res.json({ success: true, unread });
  } catch (err) {
    console.error('notifications error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'id required' });
    // Optionally, you could enforce who can delete (e.g., only creator). For now, allow deletion by id.
    await db.promise().execute('DELETE FROM tickets WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('deleteTicket error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Sync the ticket's role id into the candidates table for all candidates belonging to this ticket
exports.syncRoleToCandidates = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'id required' });

    // fetch the ticket's role_id (preferred) or role_key
    const [rows] = await db.promise().execute('SELECT role_id, role_key FROM tickets WHERE id = ?', [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: 'ticket not found' });
    const ticket = rows[0];

    let roleId = ticket.role_id;
    // if role_id not set but role_key exists, try to resolve it via roles table
    if ((roleId === null || typeof roleId === 'undefined') && ticket.role_key) {
      try {
        const [rrows] = await db.promise().execute('SELECT id FROM roles WHERE key_name = ? OR title = ? LIMIT 1', [ticket.role_key, ticket.role_key]);
        if (rrows && rrows.length > 0) roleId = rrows[0].id;
      } catch (e) {
        console.warn('failed to resolve role_key to id', e);
      }
    }

    if (typeof roleId === 'undefined' || roleId === null) {
      return res.status(400).json({ success: false, message: 'ticket does not have a role_id and resolution failed' });
    }

    // Update candidates.role_key (which is INT per migration) to the numeric role id for all candidates with this ticket_id
    await db.promise().execute('UPDATE candidates SET role_key = ? WHERE ticket_id = ?', [roleId, id]);

    res.json({ success: true, role_id: roleId });
  } catch (err) {
    console.error('syncRoleToCandidates error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
