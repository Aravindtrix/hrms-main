import React, { useEffect, useMemo, useState } from 'react';
import { Card, Table, Input, Button, message } from 'antd';
import { listEmployees } from '../../services/employees';
import { listRoles } from '../../services/roles';
import { listExits, upsertExit } from '../../services/exits';

export default function Exit() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [exits, setExits] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [reasonByEmployee, setReasonByEmployee] = useState<{[k:number]:string}>({});
  const [saving, setSaving] = useState<{[k:number]:boolean}>({});

  const load = async () => {
    try {
      const [eRes, rRes, xRes] = await Promise.all([
        listEmployees(),
        listRoles(),
        listExits()
      ]);
      setEmployees(eRes.data || eRes || []);
      setRoles(rRes.data || rRes || []);
      setExits(xRes.data || xRes || []);
    } catch (err) {
      console.error(err);
      message.error('Failed to load exit data');
    }
  };

  useEffect(() => { load(); }, []);

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

  const exitReasonById = useMemo(() => {
    const map = new Map<number, string>();
    for (const x of exits) {
      if (typeof x.employee_id === 'number') map.set(x.employee_id, x.exit_reason || '');
    }
    return map;
  }, [exits]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const mapped = employees
      .filter(e => !exitReasonById.get(Number(e.candidate_id)))
      .map(e => {
        const roleId = (typeof e.role_key === 'number' || /^\d+$/.test(String(e.role_key))) ? Number(e.role_key) : null;
        const roleTitle = roleId
          ? (roleTitleById.get(roleId) || '')
          : (roleTitleByKey.get(String(e.role_key || '')) || String(e.role_key || ''));
        return {
          ...e,
          role_title: roleTitle,
          exit_reason: exitReasonById.get(Number(e.candidate_id)) || ''
        };
      });
    return mapped.filter(e => {
      const hay = `${e.candidate_name || ''} ${e.candidate_id || ''} ${e.role_title || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [employees, roleTitleById, roleTitleByKey, search, exitReasonById]);

  const exitRows = useMemo(() => {
    return exits.map(x => {
      const employee = employees.find(e => Number(e.candidate_id) === Number(x.employee_id));
      const roleId = employee && (typeof employee.role_key === 'number' || /^\d+$/.test(String(employee.role_key)))
        ? Number(employee.role_key)
        : null;
      const roleTitle = roleId
        ? (roleTitleById.get(roleId) || '')
        : (roleTitleByKey.get(String(employee?.role_key || '')) || String(employee?.role_key || ''));
      return {
        ...x,
        candidate_name: employee?.candidate_name || 'Unknown',
        role_title: roleTitle
      };
    });
  }, [exits, employees, roleTitleById, roleTitleByKey]);

  const saveExit = async (record: any) => {
    const employeeId = Number(record.candidate_id);
    const reason = reasonByEmployee[employeeId] ?? record.exit_reason ?? '';
    if (!reason || String(reason).trim() === '') {
      message.error('Exit reason is required');
      return;
    }
    setSaving(s => ({ ...s, [employeeId]: true }));
    try {
      await upsertExit({ employee_id: employeeId, exit_reason: reason });
      message.success('Exit reason saved');
      setReasonByEmployee(r => {
        const next = { ...r };
        delete next[employeeId];
        return next;
      });
      load();
    } catch (err) {
      console.error(err);
      message.error('Failed to save exit reason');
    } finally {
      setSaving(s => ({ ...s, [employeeId]: false }));
    }
  };

  return (
    <Card title="Exit">
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <Input
          placeholder="Search employee by name, ID, or role"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 420 }}
        />
      </div>
      <Table dataSource={rows} rowKey="candidate_id" locale={{ emptyText: search.trim() ? 'No employees found' : 'Search to see employee' }}>
        <Table.Column title="Employee ID" dataIndex="candidate_id" key="candidate_id" />
        <Table.Column title="Employee" dataIndex="candidate_name" key="candidate_name" />
        <Table.Column title="Role" dataIndex="role_title" key="role_title" />
        <Table.Column title="Exit Reason" key="exit_reason" render={(text, record: any) => {
          const employeeId = Number(record.candidate_id);
          const value = reasonByEmployee[employeeId] ?? record.exit_reason ?? '';
          return (
            <Input.TextArea
              rows={2}
              value={value}
              onChange={e => setReasonByEmployee(r => ({ ...r, [employeeId]: e.target.value }))}
              placeholder="Reason for exit"
            />
          );
        }} />
        <Table.Column title="Actions" key="actions" render={(text, record: any) => (
          <Button type="primary" loading={!!saving[record.candidate_id]} onClick={() => saveExit(record)}>
            Save
          </Button>
        )} />
      </Table>
      <Card title="Exited Employees" style={{ marginTop: 24 }}>
        <Table dataSource={exitRows} rowKey="id">
          <Table.Column title="Employee ID" dataIndex="employee_id" key="employee_id" />
          <Table.Column title="Employee" dataIndex="candidate_name" key="candidate_name" />
          <Table.Column title="Role" dataIndex="role_title" key="role_title" />
          <Table.Column title="Exit Reason" dataIndex="exit_reason" key="exit_reason" />
          <Table.Column title="Exit Date" dataIndex="exit_date" key="exit_date" />
        </Table>
      </Card>
    </Card>
  );
}
