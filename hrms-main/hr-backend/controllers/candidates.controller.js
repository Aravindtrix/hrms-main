const db = require('../db/mysql');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

exports.createCandidate = async (req, res) => {
  try {
    const { ticket_id, role_key, candidate_name, email, phone, experience_years, resumeBase64, resumeFilename, status, interviewer, notes, hr_marks } = req.body;
    const resumeBlob = resumeBase64 ? Buffer.from(resumeBase64, 'base64') : null;

    const roleKeyVal = (typeof role_key !== 'undefined' && role_key !== null && /^\d+$/.test(String(role_key))) ? Number(role_key) : (role_key || null);

    if (status === 'shortlisted' && (hr_marks === null || typeof hr_marks === 'undefined' || hr_marks === '')) {
      return res.status(400).json({ success: false, message: 'hr_marks required for shortlisting' });
    }

    const [result] = await db.promise().execute(
      'INSERT INTO candidates (ticket_id, role_key, candidate_name, email, phone, experience_years, resume_filename, resume_blob, status, interviewer, notes, hr_marks) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [ticket_id || null, roleKeyVal, candidate_name, email || null, phone || null, experience_years || null, resumeFilename || null, resumeBlob, status || 'applied', interviewer || null, JSON.stringify(notes || {}), hr_marks ?? null]
    );

    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('createCandidate error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.listCandidates = async (req, res) => {
  try {
    const { ticket_id, role_key, status, hr_notified, head_notified, has_head_feedback } = req.query;
    let sql = 'SELECT id, ticket_id, role_key, candidate_name, email, phone, experience_years, resume_filename, status, interviewer, notes, hr_marks, head_result, head_feedback, head_notified, hr_notified, training_notes, created_at FROM candidates WHERE 1=1';
    const params = [];
    if (ticket_id) { sql += ' AND ticket_id = ?'; params.push(ticket_id); }
    if (role_key) { sql += ' AND role_key = ?'; params.push(role_key); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (typeof hr_notified !== 'undefined') { sql += ' AND hr_notified = ?'; params.push(hr_notified ? 1 : 0); }
    if (typeof head_notified !== 'undefined') { sql += ' AND head_notified = ?'; params.push(head_notified ? 1 : 0); }
    if (has_head_feedback === 'true') { sql += " AND head_feedback IS NOT NULL AND head_feedback <> ''"; }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await db.promise().execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('listCandidates error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.promise().execute('SELECT * FROM candidates WHERE id = ? LIMIT 1', [id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Not found' });
    const r = rows[0];
    res.json({ success: true, data: r });
  } catch (err) {
    console.error('getCandidate error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.downloadResume = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.promise().execute('SELECT resume_blob, resume_filename FROM candidates WHERE id = ? LIMIT 1', [id]);
    if (!rows[0] || !rows[0].resume_blob) return res.status(404).json({ success: false, message: 'Resume not found' });
    const buf = rows[0].resume_blob;
    const filename = rows[0].resume_filename || `resume_${id}`;
    // crude mime detection from filename
    const lower = (filename || '').toLowerCase();
    let mime = 'application/octet-stream';
    if (lower.endsWith('.pdf')) mime = 'application/pdf';
    else if (lower.endsWith('.docx')) mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (lower.endsWith('.doc')) mime = 'application/msword';
    else if (lower.endsWith('.txt')) mime = 'text/plain';

    res.set({ 'Content-Type': mime, 'Content-Disposition': `inline; filename="${filename}"`, 'Content-Length': buf.length });
    res.send(buf);
  } catch (err) {
    console.error('downloadResume error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.body || {};
    const updates = [];
    const params = [];
    // computedStatus will be set when head_result is provided and client did not explicitly send status
    let headResultProvided = false;
    let statusProvided = undefined;
    let statusProvidedValue = undefined;
    let computedStatus = null;
    const allowed = ['candidate_name','email','phone','experience_years','resumeFilename','resumeBase64','status','interviewer','interviewers','notes','role_key','ticket_id','hr_marks','head_result','head_feedback','head_scores','head_notified','hr_notified','training_notes'];
    for (const k of allowed) {
      if (typeof fields[k] !== 'undefined') {
        if (k === 'resumeBase64') {
          updates.push('resume_blob = ?'); params.push(Buffer.from(fields[k], 'base64'));
        } else if (k === 'resumeFilename') {
          updates.push('resume_filename = ?'); params.push(fields[k]);
        } else if (k === 'notes') {
          updates.push('notes = ?'); params.push(JSON.stringify(fields[k]));
        } else if (k === 'interviewers') {
          updates.push('interviewers = ?'); params.push(JSON.stringify(fields[k]));
        } else if (k === 'status') {
          statusProvided = fields[k];
          statusProvidedValue = fields[k];
        } else if (k === 'head_scores') {
          updates.push('head_scores = ?'); params.push(JSON.stringify(fields[k]));
            } else if (k === 'role_key') {
              // store role id (int) when provided
              if (fields[k] === null) { updates.push('role_key = ?'); params.push(null); }
              else if (/^\d+$/.test(String(fields[k]))) { updates.push('role_key = ?'); params.push(Number(fields[k])); }
              else { updates.push('role_key = ?'); params.push(fields[k]); }
        } else if (k === 'hr_marks') {
          updates.push('hr_marks = ?'); params.push(fields[k]);
        } else if (k === 'head_feedback') {
          updates.push('head_feedback = ?'); params.push(fields[k]);
        } else if (k === 'head_result') {
          headResultProvided = true;
          updates.push('head_result = ?'); params.push(fields[k]);
          // if head_result is provided compute the derived status from the score
          // head_result is stored as percent (0-100)
          try {
            const hrVal = Number(fields[k]) || 0;
            computedStatus = hrVal >= 60 ? 'interviewed' : 'rejected';
          } catch (e) { /* ignore parse errors */ }
        } else if (k === 'head_notified') {
          updates.push('head_notified = ?'); params.push(fields[k] ? 1 : 0);
        } else if (k === 'hr_notified') {
          updates.push('hr_notified = ?'); params.push(fields[k] ? 1 : 0);
        } else {
          updates.push(`${k} = ?`); params.push(fields[k]);
        }
      }
    }
    if (statusProvidedValue === 'shortlisted') {
      let scoreToCheck = undefined;
      if (Object.prototype.hasOwnProperty.call(fields, 'hr_marks')) {
        scoreToCheck = fields.hr_marks;
      } else {
        const [rows] = await db.promise().execute('SELECT hr_marks FROM candidates WHERE id = ? LIMIT 1', [id]);
        scoreToCheck = rows && rows[0] ? rows[0].hr_marks : null;
      }
      if (scoreToCheck === null || typeof scoreToCheck === 'undefined' || scoreToCheck === '') {
        return res.status(400).json({ success: false, message: 'hr_marks required for shortlisting' });
      }
    }
    if (statusProvidedValue === 'hired') {
      const [erows] = await db.promise().execute('SELECT offer_ctc FROM employees WHERE candidate_id = ? LIMIT 1', [id]);
      if (!erows[0] || erows[0].offer_ctc === null || typeof erows[0].offer_ctc === 'undefined') {
        return res.status(400).json({ success: false, message: 'offer details required before hiring' });
      }
    }
    // If head_result was provided, always enforce the derived status to avoid accidental "selected" values
    if (headResultProvided && computedStatus) {
      updates.push('status = ?'); params.push(computedStatus);
    } else if (typeof statusProvided !== 'undefined') {
      updates.push('status = ?'); params.push(statusProvided);
    } else if (computedStatus) {
      // fallback when status not explicitly provided but head_result was parsed
      updates.push('status = ?'); params.push(computedStatus);
    }
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'nothing to update' });
    const sql = `UPDATE candidates SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);
    await db.promise().execute(sql, params);
    res.json({ success: true });
  } catch (err) {
    console.error('updateCandidate error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

async function htmlToPdfBuffer(html) {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4' });
  await browser.close();
  return pdfBuffer;
}

exports.generateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.promise().execute('SELECT * FROM candidates WHERE id = ? LIMIT 1', [id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Candidate not found' });
    const c = rows[0];
    const [empRows] = await db.promise().execute('SELECT * FROM employees WHERE candidate_id = ? LIMIT 1', [id]);
    if (!empRows[0]) return res.status(404).json({ success: false, message: 'Employee offer details not found' });
    const e = empRows[0];
    const company = process.env.COMPANY_NAME || 'Our Company';
    const addressLines = [e.offer_address_line1, e.offer_address_line2, e.offer_address_line3].filter(Boolean);
    const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '');
    const money = (v) => (v === null || typeof v === 'undefined' || v === '' ? '' : Number(v).toLocaleString());
    const annual = (v) => (v === null || typeof v === 'undefined' || v === '' ? '' : Number(v) * 12);
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      @page { margin: 24mm 20mm; }
      body{font-family:Arial,Helvetica,sans-serif;padding:0;font-size:14px;line-height:1.5}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      td,th{border:1px solid #000;padding:6px;text-align:left;font-size:13px}
      .right{text-align:right}
      ol{margin-top:8px;padding-left:18px}
      li{margin-bottom:6px}
    </style></head><body>
      <div style="text-align:right">${fmtDate(e.offer_date)}</div>
      <p><b>${c.candidate_name || ''}</b></p>
      ${addressLines.map(line => `<div>${line}</div>`).join('')}
      <p>Dear <b>${c.candidate_name || ''}</b>,</p>
      <p>Sub: Appointment as <b>${e.offer_designation || c.role_key || ''}</b> - Reg.</p>
      <p>We are pleased to inform you that your employment in our company as <b>${e.offer_designation || c.role_key || ''}</b> and the terms and conditions of this employment shall be as under.</p>
      <ol>
        <li>You will be designated as <b>${e.offer_designation || c.role_key || ''}</b>.</li>
        <li>You will be paid a consolidated salary as per the attached salary breakup statement, you will be reporting for duty on or before <b>${fmtDate(e.offer_joining_date)}</b> at our registered office the address of which is cited in this letterhead. You shall report for duty subsequently to our manufacturing facility, the address of which is cited in this letter head bottom.</li>
        <li>You shall be discharging the duties and responsibilities as conveyed to you by the management, attached here with and by superiors from time to time.</li>
        <li>You shall be transferred to any other departments / jobs / locations wherein the company has interest and in case the management decides so.</li>
        <li>During the period of services, you shall be liable for termination without notice in case you performed any and every act / act, which is against the interest of the company. The company shall be the deciding authority in this regard.</li>
        <li>During the period of services, the company as well as yourself can mutually terminate this contract of appointment by issuing notice 90 days in advance or three (3) month’s salary in lieu of notice from either party.</li>
        <li>Your performance shall be appraised by superiors periodically / through job tests / questionnaires, who are authorized to do the same by the management and the same shall be also considered in connection with your continued employment in the company and your increment.</li>
        <li>During your service in the company, you shall be governed by the standing orders and / or rules and regulations of the company in force or amended from time to time.</li>
        <li>You will be paid the salary as per the annexure A every month after the required deductions, based on the excess target achievement, (more than the monthly sales target) you/ your team will be rewarded with 0.5% of the Excess target value as special incentive and you can share with your team as rewards.</li>
        <li>You shall devote your full time on the job and you shall be answerable, responsible and accountable for measures such as turnover of the company, safety of Employees working under you, productivity, quality and Non conformance of Products and rejection of products, hygiene and sanitary conditions, to be maintained and sustained in the area of your working, which shall be communicated to you on monthly basis. The company shall undertake the required training both internal and external on the job if required. However, you shall execute a bond in such cases to serve the company for a period of 2 years.</li>
        <li>You shall also discharge all the duties as conveyed to you by the superiors in the organization from time to time. No time you shall refuse to discharge any duties delegated to you by the superiors. Such refusal on your part shall attract action from the company as in point number 9 above.</li>
        <li>You shall maintain good health and shall undergo for such medical check-up as to your fitness on the job as required by the company.</li>
        <li>Transfer of any data in any form without CEO permission is punishable and you are liable for legal action.</li>
        <li>Any form of transaction or benefits received from our subcontractor & supplier is punishable and you are liable for legal action.</li>
        <li>Any rejection & scrap, damages are produced because of your/your team ignorance and/or will is proved will be recovered or compensated from your salary or recovered from you.</li>
        <li>Any damage to the equipment and the accessories of the company caused due to your ignorance or will or misuse will be recovered from your salary, or you have to pay compensation.</li>
        <li>Increment and other benefits based on your performance and worthiness to the organization will be decided by the organization. Your Probation Period is 1 Year from the date of Joining and your notice period will be 3 months before informing to the concern person.</li>
        <li>While working in this organization you should not have any interest or any part of any business or organization. If so, it is punishable and your are liable for legal action.</li>
      </ol>
      <p>Kindly acknowledge this letter and return the duplicate copy in taken of you acceptance of the terms and condition.</p>
      <p style="text-align:center">~Wish you all the best~</p>
      <p>For KANNAN TOOLS AND DIES</p>
      <div style="display:flex;justify-content:space-between;margin-top:24px">
        <div>Managing Director</div>
        <div>Signature of the Acceptance</div>
      </div>
      <div style="page-break-before:always;"></div>
      <table>
        <tr><th colspan="3" style="text-align:center;font-size:16px">SALARY BREAK-UP</th></tr>
        <tr><td><b>CANDIDATE NAME</b></td><td colspan="2"><b>${c.candidate_name || ''}</b></td></tr>
        <tr><td><b>DESIGNATION</b></td><td colspan="2"><b>${e.offer_designation || c.role_key || ''}</b></td></tr>
        <tr><td></td><th class="right">PER MONTH</th><th class="right">PER ANNUM</th></tr>
        <tr><td>BASIC</td><td class="right">${money(e.offer_basic)}</td><td class="right">${money(annual(e.offer_basic))}</td></tr>
        <tr><td>HRA</td><td class="right">${money(e.offer_hra)}</td><td class="right">${money(annual(e.offer_hra))}</td></tr>
        <tr><td>CONVEYANCE ALLOWANCES</td><td class="right">${money(e.offer_conveyance)}</td><td class="right">${money(annual(e.offer_conveyance))}</td></tr>
        <tr><td>MEDICAL ALLOWANCES</td><td class="right">${money(e.offer_medical)}</td><td class="right">${money(annual(e.offer_medical))}</td></tr>
        <tr><td>SPECIAL ALLOWANCES</td><td class="right">${money(e.offer_special)}</td><td class="right">${money(annual(e.offer_special))}</td></tr>
        <tr><td><b>GROSS PAY</b></td><td class="right"><b>${money(e.offer_gross)}</b></td><td class="right"><b>${money(annual(e.offer_gross))}</b></td></tr>
        <tr><th colspan="3" style="text-align:center">EMPLOYEE CONTRIBUTION:-</th></tr>
        <tr><td>EMPLOYEE PF 12%</td><td class="right">${money(e.offer_pf)}</td><td class="right">${money(annual(e.offer_pf))}</td></tr>
        <tr><td>TDS / INCOME TAX</td><td class="right">${money(e.offer_tds)}</td><td class="right">${money(annual(e.offer_tds))}</td></tr>
        <tr><td><b>TOTAL B</b></td><td class="right"><b>${money(e.offer_pf ?? 0)}</b></td><td class="right"><b>${money(annual(e.offer_pf ?? 0))}</b></td></tr>
        <tr><td><b>NET PAY/ TAKE HOME (TOTAL - B)</b></td><td class="right"><b>${money(e.offer_net)}</b></td><td class="right"><b>${money(annual(e.offer_net))}</b></td></tr>
        <tr><th colspan="3" style="text-align:center">EMPLOYER CONTRIBUTION:-</th></tr>
        <tr><td>EMPLOYER PF 12%</td><td class="right">${money(e.offer_employer_pf)}</td><td class="right">${money(annual(e.offer_employer_pf))}</td></tr>
        <tr><td>FAMILY INSURANCE (5 LAKHS COVERAGE)</td><td class="right">${money(e.offer_insurance)}</td><td class="right">${money(annual(e.offer_insurance))}</td></tr>
        <tr><td><b>TOTAL C</b></td><td class="right"><b>${money(e.offer_employer_pf ?? 0)}</b></td><td class="right"><b>${money(annual(e.offer_employer_pf ?? 0))}</b></td></tr>
        <tr><td><b>TOTAL - CTC (TOTAL = A + C)</b></td><td class="right"><b>${money(e.offer_ctc)}</b></td><td class="right"><b>${money(annual(e.offer_ctc))}</b></td></tr>
        <tr><td colspan="3" style="text-align:center">~THE BONUS WILL BE DECIDED BASED ON YOUR PERFORMANCE~</td></tr>
        <tr><td colspan="3" style="text-align:center">For Kannan Tools and Dies</td></tr>
        <tr><td colspan="3" style="text-align:center;padding-top:24px">Managing Director</td></tr>
      </table>
    </body></html>`;
    const pdf = await htmlToPdfBuffer(html);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="offer_${id}.pdf"`, 'Content-Length': pdf.length });
    res.send(pdf);
  } catch (err) {
    console.error('generateOffer error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.generateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.promise().execute('SELECT * FROM candidates WHERE id = ? LIMIT 1', [id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Not found' });
    const c = rows[0];
    const company = process.env.COMPANY_NAME || 'Our Company';
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,Helvetica,sans-serif;padding:24px}</style></head><body><h1>Appointment Letter</h1><p>To: <b>${c.candidate_name}</b></p><p>Role: <b>${c.role_key || ''}</b></p><p>Dear ${c.candidate_name},</p><p>We are pleased to confirm your appointment as <b>${c.role_key || ''}</b> at ${company}. Please find attached details about joining.</p><p>Sincerely,<br/>HR Team</p></body></html>`;
    const pdf = await htmlToPdfBuffer(html);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="appointment_${id}.pdf"`, 'Content-Length': pdf.length });
    res.send(pdf);
  } catch (err) {
    console.error('generateAppointment error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    await db.promise().execute('DELETE FROM candidates WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('deleteCandidate error', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
