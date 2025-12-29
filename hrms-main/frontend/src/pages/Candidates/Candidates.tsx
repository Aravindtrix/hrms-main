import React, { useEffect, useState } from 'react';
import { Card, Table, Select, Button, message } from 'antd';
import { listCandidates, updateCandidate } from '../../services/candidates';

const { Option } = Select;

export default function Candidates() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [saving, setSaving] = useState<{[k:number]:boolean}>({});
  const [changes, setChanges] = useState<{[k:number]:string}>({});

  const load = async () => {
    try {
      const res = await listCandidates();
      const data = res.data || res;
      setCandidates(data);
    } catch (err) {
      console.error(err);
      message.error('Failed to load candidates');
    }
  };

  useEffect(() => { load(); }, []);

  const onStatusChange = (id: number, val: string) => {
    setChanges(prev => ({ ...prev, [id]: val }));
  };

  const saveStatus = async (rec: any) => {
    const id = rec.id;
    const newStatus = changes[id];
    if (!newStatus || newStatus === rec.status) {
      message.info('No changes to save');
      return;
    }
    setSaving(s => ({ ...s, [id]: true }));
    try {
      const payload: any = { status: newStatus };
      // when HR marks shortlisted, notify heads
      if (newStatus === 'shortlisted') { payload.head_notified = 1; payload.hr_notified = 0; }
      await updateCandidate(id, payload);
      message.success('Status updated');
      setChanges(c => { const copy = { ...c }; delete copy[id]; return copy; });
      load();
    } catch (err) {
      console.error(err);
      message.error('Failed to update status');
    } finally {
      setSaving(s => ({ ...s, [id]: false }));
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Name', dataIndex: 'candidate_name', key: 'candidate_name' },
    { title: 'Role', dataIndex: 'role_key', key: 'role_key' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (_: any, rec: any) => (
      <Select style={{ width: 180 }} value={changes[rec.id] ?? rec.status} onChange={val => onStatusChange(rec.id, val)}>
        <Option value="applied">Applied</Option>
        <Option value="shortlisted">Shortlisted</Option>
        <Option value="interviewed">Interviewed</Option>
        <Option value="selected">Selected</Option>
        <Option value="rejected">Rejected</Option>
        <Option value="hired">Hired</Option>
      </Select>
    ) },
    { title: 'Actions', key: 'actions', render: (_: any, rec: any) => (
      <Button type="primary" onClick={() => saveStatus(rec)} loading={!!saving[rec.id]}>Save</Button>
    ) }
  ];

  return (
    <Card title="Candidates (HR)">
      <Table dataSource={candidates} columns={columns} rowKey="id" />
    </Card>
  );
}
