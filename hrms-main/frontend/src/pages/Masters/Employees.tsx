import React, { useEffect, useMemo, useState } from 'react';
import { Card, Table, message } from 'antd';
import { listEmployees } from '../../services/employees';
import { listRoles } from '../../services/roles';

export default function Employees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  const load = async () => {
    try {
      const [eRes, rRes] = await Promise.all([listEmployees(), listRoles()]);
      setEmployees(eRes.data || eRes);
      setRoles(rRes.data || rRes);
    } catch (err) {
      console.error(err);
      message.error('Failed to load employees');
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

  const rows = useMemo(() => {
    return employees.map(e => {
      const roleId = (typeof e.role_key === 'number' || /^\d+$/.test(String(e.role_key))) ? Number(e.role_key) : null;
      const roleTitle = roleId
        ? (roleTitleById.get(roleId) || '')
        : (roleTitleByKey.get(String(e.role_key || '')) || String(e.role_key || ''));
      return { ...e, role_title: roleTitle };
    });
  }, [employees, roleTitleById, roleTitleByKey]);

  return (
    <Card title="Employees">
      <Table dataSource={rows} rowKey="candidate_id">
        <Table.Column title="Name" dataIndex="candidate_name" key="candidate_name" />
        <Table.Column title="Role" dataIndex="role_title" key="role_title" />
        <Table.Column title="Phone" dataIndex="phone" key="phone" />
        <Table.Column title="Email" dataIndex="email" key="email" />
        <Table.Column title="CTC" dataIndex="offer_ctc" key="offer_ctc" />
      </Table>
    </Card>
  );
}
