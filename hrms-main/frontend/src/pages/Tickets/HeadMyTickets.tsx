import React, { useEffect, useState } from 'react';
import { Card, Table, Input, Button, message, Popconfirm } from 'antd';
import { listTickets, deleteTicket } from '../../services/tickets';

export default function HeadMyTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [username, setUsername] = useState<string>(localStorage.getItem('username') || 'head_user');
  const [loading, setLoading] = useState(false);

  const load = async (user?: string) => {
    setLoading(true);
    try {
      const created_by = user ?? username;
      const res = await listTickets({ created_by });
      setTickets(res.data || res);
      localStorage.setItem('username', created_by);
    } catch (err) {
      console.error(err);
      message.error('Failed to load tickets');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    setLoading(true);
    try {
      await deleteTicket(id);
      message.success('Ticket deleted');
      await load();
    } catch (err) {
      console.error(err);
      message.error('Failed to delete ticket');
    } finally { setLoading(false); }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Role', dataIndex: 'role_key', key: 'role_key' },
    { title: 'Dept', dataIndex: 'department', key: 'department' },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    {
      title: 'Actions', key: 'actions', render: (_: any, record: any) => (
        <Popconfirm title="Delete ticket?" okText="Delete" cancelText="Cancel" onConfirm={() => handleDelete(record.id)}>
          <Button danger>Delete</Button>
        </Popconfirm>
      )
    }
  ];

  return (
    <div>
      <Card title="My Tickets">
        <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
          <Input value={username} onChange={e => setUsername(e.target.value)} style={{ width: 220 }} placeholder="Your username" />
          <Button type="primary" onClick={() => load(username)} loading={loading}>Load</Button>
        </div>
        <Table dataSource={tickets} columns={columns} rowKey="id" />
      </Card>
    </div>
  );
}
