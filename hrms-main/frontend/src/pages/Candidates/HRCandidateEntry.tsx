import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Select, InputNumber, message, Upload, Table, DatePicker, Popconfirm, Modal } from 'antd';
import dayjs from 'dayjs';
import { listTickets, syncTicketRole } from '../../services/tickets';
import { createCandidate, listCandidates, updateCandidate, deleteCandidate } from '../../services/candidates';
import { getEmployeeByCandidate, upsertEmployee } from '../../services/employees';
import { listRoles, getRole } from '../../services/roles';

const { Option } = Select;

export default function HRCandidateEntry() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [saving, setSaving] = useState<{[k:number]:boolean}>({});
  const [changes, setChanges] = useState<{[k:number]:string}>({});
  const [scoreChanges, setScoreChanges] = useState<{[k:number]:number | null}>({});
  const [resolvedRoleId, setResolvedRoleId] = useState<number | null>(null);
  const [roleLocked, setRoleLocked] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offerCandidate, setOfferCandidate] = useState<any>(null);
  const [offerSaving, setOfferSaving] = useState(false);
  const [offerLoading, setOfferLoading] = useState(false);
  const [form] = Form.useForm();
  const [offerForm] = Form.useForm();

  const annualize = (val?: number | null) => {
    if (val === null || typeof val === 'undefined') return null;
    const num = Number(val);
    if (Number.isNaN(num)) return null;
    return num * 12;
  };

  const loadTickets = async () => {
    try {
      const res = await listTickets({ forRole: 'hr' });
      const data = res.data || res;
      setTickets((data || []).filter((t: any) => t.status !== 'closed'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadTickets(); }, []);

  useEffect(() => {
    if (selectedTicket) {
      // ensure candidates.role_key is synced from ticket.role_id before loading candidates
      (async () => {
        try {
          await syncTicketRole(selectedTicket);
        } catch (e) {
          // non-fatal: just log
          console.warn('syncTicketRole failed', e);
        }
        await loadCandidates(selectedTicket);
      })();
    } else setCandidates([]);
  }, [selectedTicket]);

  // When a ticket is selected try to resolve the role id (from ticket.role_key -> roles.id)
  useEffect(() => {
    const resolveForTicket = async () => {
      setResolvedRoleId(null);
      setRoleLocked(false);
      if (!selectedTicket) {
        form.setFieldsValue({ role_key: undefined });
        return;
      }
      const t = tickets.find(tt => tt.id === selectedTicket);
      if (t && t.role_key) {
        try {
          const rres = await listRoles({ key_name: t.role_key });
          const rlist = (rres && rres.data) ? rres.data : rres;
          if (rlist && rlist.length > 0) {
            const id = rlist[0].id;
            setResolvedRoleId(id);
            setRoleLocked(true);
            form.setFieldsValue({ role_key: id });
            return;
          }
        } catch (e) {
          console.warn('failed to resolve role for ticket', e);
        }
      }
      // couldn't resolve
      setResolvedRoleId(null);
      setRoleLocked(false);
      form.setFieldsValue({ role_key: undefined });
    };
    resolveForTicket();
  }, [selectedTicket, tickets, form]);

  const loadCandidates = async (ticketId: number) => {
    try {
      const res = await listCandidates({ ticket_id: ticketId });
      const data = res.data || res;
      setCandidates(data);
    } catch (err) {
      console.error(err);
      message.error('Failed to load candidates for ticket');
    }
  };

  const readFileAsBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip data:*/*;base64,
      const base = result.split(',')[1];
      resolve(base);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const onFinish = async (vals: any) => {
    setLoading(true);
    try {
      const payload: any = {
        ticket_id: vals.ticket_id || null,
        role_key: vals.role_key || null,
        candidate_name: vals.candidate_name,
        email: vals.email,
        phone: vals.phone,
        experience_years: vals.experience_years,
        status: vals.status,
        interviewer: vals.interviewer,
        notes: { comments: vals.notes }
      };

      // Prefer the resolved role id (from selected ticket) if available, otherwise attempt to resolve/fallback
      try {
        if (resolvedRoleId) {
          payload.role_key = resolvedRoleId;
        } else {
          let resolved: number | null = null;
          if (vals.ticket_id) {
            const t = tickets.find(tt => tt.id === vals.ticket_id);
            if (t && t.role_key) {
              const rres = await listRoles({ key_name: t.role_key });
              const rlist = (rres && rres.data) ? rres.data : rres;
              if (rlist && rlist.length > 0) resolved = rlist[0].id;
            }
          }
          if (!resolved && vals.role_key) {
            if (/^\d+$/.test(String(vals.role_key))) resolved = Number(vals.role_key);
            else {
              const rres = await listRoles({ key_name: vals.role_key });
              const rlist = (rres && rres.data) ? rres.data : rres;
              if (rlist && rlist.length > 0) resolved = rlist[0].id;
            }
          }
          payload.role_key = resolved; // may be null if unresolved
        }
      } catch (e) {
        console.warn('role id resolution failed', e);
      }

      // include expected_date if provided (convert dayjs to ISO string)
      if (vals.expected_date) {
        try { payload.expected_date = vals.expected_date.toISOString(); } catch (e) { payload.expected_date = vals.expected_date; }
      }

      const uploadVal = vals.resume;
      let fileObj: File | null = null;
      if (uploadVal) {
        if (uploadVal.file && uploadVal.file.originFileObj) fileObj = uploadVal.file.originFileObj as File;
        else if (uploadVal.originFileObj) fileObj = uploadVal.originFileObj as File;
        else if (Array.isArray(uploadVal) && uploadVal[0] && uploadVal[0].originFileObj) fileObj = uploadVal[0].originFileObj as File;
        else if (uploadVal.fileList && uploadVal.fileList[0] && uploadVal.fileList[0].originFileObj) fileObj = uploadVal.fileList[0].originFileObj as File;
      }
      if (fileObj) {
        if (!(fileObj instanceof Blob)) throw new Error('selected resume is not a file/blob');
        const base64 = await readFileAsBase64(fileObj);
        payload.resumeBase64 = base64;
        payload.resumeFilename = fileObj.name;
      }

      // notify heads when HR marks candidate as shortlisted
      payload.head_notified = vals.status === 'shortlisted' ? 1 : 0;
      payload.hr_notified = 0;

      await createCandidate(payload);
      message.success('Candidate saved');

      // If candidate belonged to a ticket, ensure the ticket->candidates role sync happens
      // then refresh the candidates list so the role id shows immediately without a full page refresh.
      if (payload.ticket_id) {
        try {
          try {
            await syncTicketRole(payload.ticket_id);
          } catch (e) {
            console.warn('syncTicketRole after create failed', e);
          }

          if (selectedTicket === payload.ticket_id) {
            await loadCandidates(selectedTicket as number);
          } else {
            // switch selection to the ticket used for the saved candidate and load its candidates
            setSelectedTicket(payload.ticket_id as number);
            await loadCandidates(payload.ticket_id as number);
          }
        } catch (e) {
          console.warn('failed to refresh candidates after create', e);
        }
      }

      // reset form and resolved role state
      try { form.resetFields(); } catch (e) { /* ignore */ }
      setResolvedRoleId(null);
      setRoleLocked(false);
    } catch (err) {
      console.error(err);
      message.error('Failed to save candidate');
    } finally { setLoading(false); }
  };

  const openOfferModal = async (record: any) => {
    setOfferCandidate(record);
    setOfferModalOpen(true);
    setOfferLoading(true);
    try {
      const res = await getEmployeeByCandidate(record.id);
      const payload = res && res.data ? res.data : res;
      const employee = payload && payload.data ? payload.data : payload;
      let designation = employee && employee.offer_designation ? employee.offer_designation : '';
      const roleId = (typeof record.role_key === 'number' || /^\d+$/.test(String(record.role_key))) ? Number(record.role_key) : null;
      if (!designation && roleId) {
        try {
          const rres = await getRole(roleId);
          const rpayload = rres && rres.data ? rres.data : rres;
          const role = rpayload && rpayload.data ? rpayload.data : rpayload;
          designation = role && role.title ? role.title : '';
        } catch (e) {
          console.warn('failed to load role for designation', e);
        }
      }
      offerForm.setFieldsValue({
        candidate_name: record.candidate_name,
        role_key: record.role_key,
        offer_date: employee && employee.offer_date ? dayjs(employee.offer_date) : null,
        offer_address_line1: (employee && employee.offer_address_line1) || '',
        offer_address_line2: (employee && employee.offer_address_line2) || '',
        offer_address_line3: (employee && employee.offer_address_line3) || '',
        offer_designation: designation,
        offer_joining_date: employee && employee.offer_joining_date ? dayjs(employee.offer_joining_date) : null,
        offer_basic: employee ? (employee.offer_basic ?? null) : null,
        offer_conveyance: employee ? (employee.offer_conveyance ?? null) : null,
        offer_medical: employee ? (employee.offer_medical ?? null) : null,
        offer_hra: employee ? (employee.offer_hra ?? null) : null,
        offer_special: employee ? (employee.offer_special ?? null) : null,
        offer_gross: employee ? (employee.offer_gross ?? null) : null,
        offer_pf: employee ? (employee.offer_pf ?? null) : null,
        offer_tds: employee ? (employee.offer_tds ?? null) : null,
        offer_net: employee ? (employee.offer_net ?? null) : null,
        offer_employer_pf: employee ? (employee.offer_employer_pf ?? null) : null,
        offer_insurance: employee ? (employee.offer_insurance ?? null) : null,
        offer_ctc: employee ? (employee.offer_ctc ?? null) : null
      });
    } catch (err) {
      console.error(err);
      message.error('Failed to load offer details');
    } finally {
      setOfferLoading(false);
    }
  };

  const saveOfferDetails = async () => {
    if (!offerCandidate) return;
    try {
      const vals = await offerForm.validateFields();
      setOfferSaving(true);
      const payload: any = {
        offer_address_line1: vals.offer_address_line1 || null,
        offer_address_line2: vals.offer_address_line2 || null,
        offer_address_line3: vals.offer_address_line3 || null,
        offer_designation: vals.offer_designation || null,
        offer_basic: vals.offer_basic ?? null,
        offer_conveyance: vals.offer_conveyance ?? null,
        offer_medical: vals.offer_medical ?? null,
        offer_hra: vals.offer_hra ?? null,
        offer_special: vals.offer_special ?? null,
        offer_gross: vals.offer_gross ?? null,
        offer_pf: vals.offer_pf ?? null,
        offer_tds: vals.offer_tds ?? null,
        offer_net: vals.offer_net ?? null,
        offer_employer_pf: vals.offer_employer_pf ?? null,
        offer_insurance: vals.offer_insurance ?? null,
        offer_ctc: vals.offer_ctc ?? null
      };
      payload.offer_date = vals.offer_date ? vals.offer_date.toISOString() : null;
      payload.offer_joining_date = vals.offer_joining_date ? vals.offer_joining_date.toISOString() : null;
      await upsertEmployee({ candidate_id: offerCandidate.id, ...payload });
      message.success('Offer details saved');
      setOfferModalOpen(false);
      setOfferCandidate(null);
      offerForm.resetFields();
      if (selectedTicket) await loadCandidates(selectedTicket);
    } catch (err) {
      console.error(err);
      if (err && (err as any).errorFields) return;
      message.error('Failed to save offer details');
    } finally {
      setOfferSaving(false);
    }
  };

  return (
    <Card title="Candidate Entry (HR)">
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ status: 'applied' }}>
        <Form.Item name="ticket_id" label="Ticket" help="Optional - select the related ticket">
          <Select showSearch placeholder="Select ticket" onChange={(val: any) => setSelectedTicket(val)}>
            {tickets.map((t: any) => (
              <Option key={t.id} value={t.id}>{`${t.id} — ${t.role_key} (${t.department})`}</Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="role_key" label="Role ID (autofetched from ticket when available)" help={roleLocked || selectedTicket ? 'Resolved from selected ticket — locked' : 'Enter role id or key when not selecting a ticket'}>
          <Input disabled={roleLocked || !!selectedTicket} />
        </Form.Item>
        <Form.Item name="candidate_name" label="Candidate Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="email" label="Email">
          <Input />
        </Form.Item>
        <Form.Item name="phone" label="Phone">
          <Input />
        </Form.Item>
        <Form.Item name="experience_years" label="Experience (years)">
          <InputNumber min={0} step={0.1} />
        </Form.Item>
        <Form.Item name="resume" label="Resume (PDF/DOCX)">
          <Upload beforeUpload={() => false} maxCount={1} accept=".pdf,.doc,.docx">
            <Button>Choose file</Button>
          </Upload>
        </Form.Item>
        <Form.Item name="status" label="Status">
          <Select>
            <Option value="applied">Applied</Option>
            <Option value="shortlisted">Shortlisted</Option>
            <Option value="interviewed">Interviewed</Option>
            <Option value="selected">Selected</Option>
            <Option value="rejected">Rejected</Option>
            <Option value="hired">Hired</Option>
          </Select>
        </Form.Item>
        
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>Save Candidate</Button>
        </Form.Item>
      </Form>
      {/* Candidates for selected ticket: allow HR to modify status */}
      <div style={{ marginTop: 20 }}>
        <Card title={selectedTicket ? `Candidates for Ticket ${selectedTicket}` : 'Select a ticket to view candidates'}>
          <Table dataSource={candidates} rowKey="id" pagination={{ pageSize: 8 }}>
            <Table.Column title="ID" dataIndex="id" key="id" />
            <Table.Column title="Name" dataIndex="candidate_name" key="candidate_name" />
            <Table.Column title="Role" dataIndex="role_key" key="role_key" />
            <Table.Column title="Expected" dataIndex="expected_date" key="expected_date" render={(d: any) => (d ? new Date(d).toLocaleDateString() : '-')} />
            <Table.Column title="Email" dataIndex="email" key="email" />
            <Table.Column title="Score" key="hr_marks" render={(text, record: any) => (
              <InputNumber
                min={0}
                max={100}
                placeholder="Score"
                value={scoreChanges[record.id] ?? (record.hr_marks ?? null)}
                onChange={val => setScoreChanges(s => ({ ...s, [record.id]: val as number | null }))}
              />
            )} />
            <Table.Column title="Status" key="status" render={(text, record: any) => {
              const effectiveScore = (record.id in scoreChanges) ? scoreChanges[record.id] : record.hr_marks;
              const canShortlist = !(record.status === 'applied' && (effectiveScore === null || typeof effectiveScore === 'undefined'));
              return (
                <Select style={{ width: 160 }} value={changes[record.id] ?? record.status} onChange={val => setChanges(c => ({ ...c, [record.id]: val }))}>
                  <Option value="applied">Applied</Option>
                  <Option value="shortlisted" disabled={!canShortlist}>Shortlisted</Option>
                  <Option value="interviewed">Interviewed</Option>
                  <Option value="selected">Selected</Option>
                  <Option value="rejected">Rejected</Option>
                  <Option value="hired">Hired</Option>
                </Select>
              );
            }} />
            <Table.Column title="Actions" key="actions" render={(text, record: any) => (
              <>
                {(() => {
                  const effectiveStatus = changes[record.id] ?? record.status;
                  const disabled = effectiveStatus !== 'hired';
                  return (
                    <Button style={{ marginRight: 8 }} disabled={disabled} onClick={() => openOfferModal(record)}>
                      Offer Details
                    </Button>
                  );
                })()}
                <Button type="primary" style={{ marginRight: 8 }} loading={!!saving[record.id]} onClick={async () => {
                  const id = record.id;
                  const newStatus = changes[id];
                  const hasScoreChange = Object.prototype.hasOwnProperty.call(scoreChanges, id);
                  const newScore = hasScoreChange ? scoreChanges[id] : record.hr_marks;
                  const statusChanged = typeof newStatus !== 'undefined' && newStatus !== record.status;
                  if (!statusChanged && !hasScoreChange) { message.info('No changes to save'); return; }
                  if (statusChanged && newStatus === 'shortlisted' && record.status === 'applied') {
                    if (newScore === null || typeof newScore === 'undefined') {
                      message.error('Enter score before shortlisting');
                      return;
                    }
                  }
                  setSaving(s => ({ ...s, [id]: true }));
                  try {
                    if (statusChanged && newStatus === 'hired') {
                      try {
                        const eres = await getEmployeeByCandidate(id);
                        const epayload = eres && eres.data ? eres.data : eres;
                        const employee = epayload && epayload.data ? epayload.data : epayload;
                        if (!employee || employee.offer_ctc === null || typeof employee.offer_ctc === 'undefined') {
                          message.error('Fill offer details before marking as hired');
                          return;
                        }
                      } catch (e) {
                        console.error(e);
                        message.error('Failed to validate offer details');
                        return;
                      }
                    }
                    const payload: any = {};
                    if (hasScoreChange) payload.hr_marks = newScore;
                    if (statusChanged) {
                      payload.status = newStatus;
                      if (newStatus === 'shortlisted') { payload.head_notified = 1; payload.hr_notified = 0; }
                    }
                    await updateCandidate(id, payload);
                    message.success('Candidate updated');
                    setChanges(c => { const copy = { ...c }; delete copy[id]; return copy; });
                    setScoreChanges(s => { const copy = { ...s }; delete copy[id]; return copy; });
                    loadCandidates(selectedTicket as number);
                  } catch (err) {
                    console.error(err);
                    message.error('Failed to update candidate');
                  } finally { setSaving(s => ({ ...s, [id]: false })); }
                }}>Save</Button>

                {/* When HR marks candidate as selected, allow generating documents */}
                { ((changes[record.id] ?? record.status) === 'hired') && (
                  <>
                    <Button type="link" onClick={async () => {
                      try {
                        const res = await (await import('../../services/candidates')).generateOffer(record.id);
                        const blob = new Blob([res.data], { type: 'application/pdf' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = `offer_${record.id}.pdf`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
                      } catch (err) { console.error(err); message.error('Failed to generate offer'); }
                    }}>Offer</Button>
                    <Button type="link" onClick={async () => {
                      try {
                        const res = await (await import('../../services/candidates')).generateAppointment(record.id);
                        const blob = new Blob([res.data], { type: 'application/pdf' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = `appointment_${record.id}.pdf`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
                      } catch (err) { console.error(err); message.error('Failed to generate appointment'); }
                    }}>Appointment</Button>
                  </>
                )}
                <Popconfirm title="Delete candidate?" okText="Delete" cancelText="Cancel" onConfirm={async () => {
                  try {
                    await deleteCandidate(record.id);
                    message.success('Candidate deleted');
                    loadCandidates(selectedTicket as number);
                  } catch (err) {
                    console.error(err);
                    message.error('Failed to delete candidate');
                  }
                }}>
                  <Button type="default" danger style={{ marginLeft: 8 }}>Delete</Button>
                </Popconfirm>
              </>
            )} />
          </Table>
        </Card>
      </div>

      <Modal
        open={offerModalOpen}
        title="Offer Details"
        onCancel={() => { setOfferModalOpen(false); setOfferCandidate(null); offerForm.resetFields(); }}
        onOk={saveOfferDetails}
        confirmLoading={offerSaving}
        okButtonProps={{ disabled: offerLoading }}
        width={720}
      >
        <Form form={offerForm} layout="vertical">
          <Form.Item name="candidate_name" label="Candidate Name">
            <Input disabled />
          </Form.Item>
          <Form.Item name="role_key" label="Role">
            <Input disabled />
          </Form.Item>
          <Form.Item name="offer_date" label="Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="offer_address_line1" label="Address Line 1">
            <Input />
          </Form.Item>
          <Form.Item name="offer_address_line2" label="Address Line 2">
            <Input />
          </Form.Item>
          <Form.Item name="offer_address_line3" label="Address Line 3">
            <Input />
          </Form.Item>
          <Form.Item name="offer_designation" label="Designation">
            <Input placeholder="e.g. EDP Engineer" />
          </Form.Item>
          <Form.Item name="offer_joining_date" label="Joining Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="offer_basic" label="Basic">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="offer_conveyance" label="Conveyance Allowance">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="offer_medical" label="Medical Allowance">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="offer_hra" label="HRA / House Rent Allowance">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="offer_special" label="Special Allowance">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="offer_gross" label="Gross Pay">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="offer_pf" label="Employee PF">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="offer_tds" label="TDS / Income Tax">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="offer_net" label="Net Pay / Take Home">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="offer_employer_pf" label="Employer PF">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="offer_insurance" label="Family Insurance">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="offer_ctc" label="CTC">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item shouldUpdate>
            {() => {
              const vals = offerForm.getFieldsValue([
                'offer_basic',
                'offer_conveyance',
                'offer_medical',
                'offer_hra',
                'offer_special',
                'offer_gross',
                'offer_pf',
                'offer_tds',
                'offer_net',
                'offer_employer_pf',
                'offer_insurance',
                'offer_ctc'
              ]);
              const rows = [
                { label: 'Basic', v: vals.offer_basic },
                { label: 'Conveyance Allowance', v: vals.offer_conveyance },
                { label: 'Medical Allowance', v: vals.offer_medical },
                { label: 'HRA / House Rent Allowance', v: vals.offer_hra },
                { label: 'Special Allowance', v: vals.offer_special },
                { label: 'Gross Pay', v: vals.offer_gross },
                { label: 'Employee PF', v: vals.offer_pf },
                { label: 'TDS / Income Tax', v: vals.offer_tds },
                { label: 'Net Pay / Take Home', v: vals.offer_net },
                { label: 'Employer PF', v: vals.offer_employer_pf },
                { label: 'Family Insurance', v: vals.offer_insurance },
                { label: 'CTC', v: vals.offer_ctc }
              ];
              return (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Per Annum Preview</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', paddingBottom: 6 }}>Component</th>
                        <th style={{ textAlign: 'right', borderBottom: '1px solid #ddd', paddingBottom: 6 }}>Per Month</th>
                        <th style={{ textAlign: 'right', borderBottom: '1px solid #ddd', paddingBottom: 6 }}>Per Annum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(row => {
                        const monthly = row.v ?? null;
                        const yearly = annualize(monthly);
                        return (
                          <tr key={row.label}>
                            <td style={{ padding: '4px 0' }}>{row.label}</td>
                            <td style={{ textAlign: 'right' }}>{monthly ?? '-'}</td>
                            <td style={{ textAlign: 'right' }}>{yearly ?? '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
