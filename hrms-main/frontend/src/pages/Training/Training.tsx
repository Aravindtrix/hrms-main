import React, { useEffect, useMemo, useState } from 'react';
import { Card, Table, Input, Button, message } from 'antd';
import { useLocation } from 'react-router-dom';
import { listCandidates, updateCandidate } from '../../services/candidates';
import { listEmployees } from '../../services/employees';
import { listTickets, updateTicket } from '../../services/tickets';
import { listRoles } from '../../services/roles';
import { listPerformanceActions, upsertPerformanceAction } from '../../services/performance';

export default function Training() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [notesByCandidate, setNotesByCandidate] = useState<{[k:number]:string}>({});
  const [saving, setSaving] = useState<{[k:number]:boolean}>({});
  const [performanceActions, setPerformanceActions] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [trainingFeedbackByEmployee, setTrainingFeedbackByEmployee] = useState<{[k:number]:string}>({});
  const [trainingSaving, setTrainingSaving] = useState<{[k:number]:boolean}>({});
  const location = useLocation();

  const load = async () => {
    try {
      const [cRes, tRes, rRes] = await Promise.all([
        listCandidates({ has_head_feedback: true }),
        listTickets({ forRole: 'hr' }),
        listRoles()
      ]);
      setCandidates(cRes.data || cRes);
      setTickets(tRes.data || tRes);
      setRoles(rRes.data || rRes);
    } catch (err) {
      console.error(err);
      message.error('Failed to load training data');
    }
  };

  const loadPerformanceTraining = async () => {
    try {
      const [aRes, eRes] = await Promise.all([
        listPerformanceActions(),
        listEmployees()
      ]);
      setPerformanceActions(aRes.data || aRes || []);
      setEmployees(eRes.data || eRes || []);
    } catch (err) {
      console.error('loadPerformanceTraining', err);
      message.error('Failed to load performance training data');
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { loadPerformanceTraining(); }, []);

  const roleTitleById = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of roles) {
      if (typeof r.id === 'number') map.set(r.id, r.title || r.key_name || '');
    }
    return map;
  }, [roles]);

  const roleTitleByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of roles) {
      if (r.key_name) map.set(String(r.key_name), r.title || r.key_name);
      if (r.title) map.set(String(r.title), r.title);
    }
    return map;
  }, [roles]);

  const ticketById = useMemo(() => {
    const map = new Map<number, any>();
    for (const t of tickets) {
      if (typeof t.id === 'number') map.set(t.id, t);
    }
    return map;
  }, [tickets]);

  const rows = useMemo(() => {
    return candidates
      .filter(c => c.ticket_id && c.status === 'hired')
      .map(c => {
        const ticket = ticketById.get(c.ticket_id);
        const roleId = (typeof c.role_key === 'number' || /^\d+$/.test(String(c.role_key))) ? Number(c.role_key) : null;
        const roleTitle = roleId
          ? (roleTitleById.get(roleId) || '')
          : (roleTitleByKey.get(String(c.role_key || '')) || String(c.role_key || ''));
        return {
          ...c,
          ticket_status: ticket?.status,
          role_title: roleTitle,
          training_notes: c.training_notes || ''
        };
      });
  }, [candidates, ticketById, roleTitleById, roleTitleByKey]);

  const employeeNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const e of employees) {
      if (typeof e.candidate_id === 'number') map.set(e.candidate_id, e.candidate_name || '');
    }
    return map;
  }, [employees]);

  const trainingRows = useMemo(() => {
    return (performanceActions || [])
      .filter((a: any) => a.action === 'training')
      .map((a: any) => ({
        ...a,
        employee_name: employeeNameById.get(Number(a.employee_id)) || 'Unknown'
      }));
  }, [performanceActions, employeeNameById]);

  const saveAndClose = async (record: any) => {
    if (!record.ticket_id) {
      message.error('Ticket not found for this candidate');
      return;
    }
    const ticketId = record.ticket_id;
    const candidateId = record.id;
    const notes = notesByCandidate[candidateId] ?? record.training_notes ?? '';
    setSaving(s => ({ ...s, [candidateId]: true }));
    try {
      await updateCandidate(candidateId, { training_notes: notes });
      const cRes = await listCandidates({ ticket_id: ticketId });
      const list = cRes.data || cRes;
      const pending = (list || []).filter((c: any) => c.status !== 'rejected' && (!c.training_notes || String(c.training_notes).trim() === ''));
      if (pending.length === 0) {
        await updateTicket(ticketId, { status: 'closed' });
        message.success('Ticket closed');
      } else {
        message.success('Saved');
      }
      setNotesByCandidate(n => {
        const next = { ...n };
        delete next[candidateId];
        return next;
      });
      load();
    } catch (err) {
      console.error(err);
      message.error('Failed to close ticket');
    } finally {
      setSaving(s => ({ ...s, [candidateId]: false }));
    }
  };

  const saveTrainingFeedback = async (record: any) => {
    const employeeId = Number(record.employee_id);
    const feedback = trainingFeedbackByEmployee[employeeId] ?? record.training_feedback ?? '';
    setTrainingSaving(s => ({ ...s, [employeeId]: true }));
    try {
      await upsertPerformanceAction({
        employee_id: employeeId,
        action: 'training',
        increment_ctc: record.increment_ctc ?? null,
        training_feedback: feedback
      });
      message.success('Training feedback saved');
      setTrainingFeedbackByEmployee(n => {
        const next = { ...n };
        delete next[employeeId];
        return next;
      });
      loadPerformanceTraining();
    } catch (err) {
      console.error('saveTrainingFeedback', err);
      message.error('Failed to save training feedback');
    } finally {
      setTrainingSaving(s => ({ ...s, [employeeId]: false }));
    }
  };

  const focusEmployeeId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get('employee_id');
    const parsed = raw ? Number(raw) : null;
    return Number.isFinite(parsed) ? parsed : null;
  }, [location.search]);

  return (
    <div>
    <Card title="Training">
      <Table dataSource={rows} rowKey="id">
        <Table.Column title="Candidate" dataIndex="candidate_name" key="candidate_name" />
        <Table.Column title="Ticket" dataIndex="ticket_id" key="ticket_id" />
        <Table.Column title="Role" dataIndex="role_title" key="role_title" />
        <Table.Column title="Head Feedback" dataIndex="head_feedback" key="head_feedback" />
        <Table.Column title="HR Notes" key="hr_notes" render={(text, record: any) => {
          const candidateId = record.id;
          const value = notesByCandidate[candidateId] ?? record.training_notes ?? '';
          return (
            <Input.TextArea
              rows={2}
              value={value}
              onChange={e => setNotesByCandidate(n => ({ ...n, [candidateId]: e.target.value }))}
              placeholder="Add training notes"
            />
          );
        }} />
        <Table.Column title="Actions" key="actions" render={(text, record: any) => (
          <Button type="primary" loading={!!saving[record.id]} onClick={() => saveAndClose(record)}>
            Save & Close
          </Button>
        )} />
      </Table>
    </Card>
    <Card title="Performance Training" style={{ marginTop: 24 }}>
      <Table
        dataSource={trainingRows}
        rowKey="employee_id"
        rowClassName={(record: any) => (focusEmployeeId && Number(record.employee_id) === focusEmployeeId ? 'table-row-highlight' : '')}
      >
        <Table.Column title="Employee ID" dataIndex="employee_id" key="employee_id" />
        <Table.Column title="Employee" dataIndex="employee_name" key="employee_name" />
        <Table.Column title="Performance Feedback" key="training_feedback" render={(text, record: any) => {
          const employeeId = Number(record.employee_id);
          const value = trainingFeedbackByEmployee[employeeId] ?? record.training_feedback ?? '';
          return (
            <Input.TextArea
              rows={2}
              value={value}
              onChange={e => setTrainingFeedbackByEmployee(n => ({ ...n, [employeeId]: e.target.value }))}
              placeholder="Add training feedback"
            />
          );
        }} />
        <Table.Column title="Actions" key="actions" render={(text, record: any) => (
          <Button type="primary" loading={!!trainingSaving[record.employee_id]} onClick={() => saveTrainingFeedback(record)}>
            Save Feedback
          </Button>
        )} />
      </Table>
    </Card>
    </div>
  );
}
