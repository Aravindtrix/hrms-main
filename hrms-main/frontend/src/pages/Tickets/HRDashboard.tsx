import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Badge, message, Modal, Descriptions } from 'antd';
import { listTickets, updateTicket, getNotificationsCount } from '../../services/tickets';
import { generateJD } from '../../services/jd';

export default function HRDashboard() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [viewing, setViewing] = useState<any>(null);

  const load = async () => {
    try {
      const res = await listTickets({ forRole: 'hr' });
      setTickets(res.data || res);
      const n = await getNotificationsCount();
      setUnread(n.unread ?? n);
    } catch (err) {
      console.error(err);
      message.error('Failed to load tickets');
    }
  };

  useEffect(() => { load(); }, []);

  const ack = async (id: number) => {
    try {
      await updateTicket(id, { status: 'acknowledged', is_read_by_hr: 1 });
      message.success('Acknowledged');
      load();
    } catch (err) {
      console.error(err);
      message.error('Failed to acknowledge');
    }
  };

  const downloadJD = async (role: string, qnty?: number) => {
    try {
      const res = await generateJD(role, qnty);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${role}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      message.error('Failed to download JD');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Role', dataIndex: 'role_key', key: 'role_key' },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity' },
    { title: 'Created By', dataIndex: 'created_by', key: 'created_by' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag>{s}</Tag> },
    { title: 'Actions', key: 'actions', render: (_: any, record: any) => (
      <>
        <Button type="link" onClick={() => ack(record.id)}>Acknowledge</Button>
        <Button type="link" onClick={() => setViewing(record)}>View</Button>
        {record.jd_required ? <Button type="link" onClick={() => downloadJD(record.role_key, record.quantity)}>JD</Button> : null}
      </>
    ) }
  ];

  return (
    <div>
      <Card title={<>HR Dashboard <Badge count={unread} style={{ backgroundColor: '#52c41a' }} /></>}>
        <Table dataSource={tickets} columns={columns} rowKey="id" />
      </Card>
      <Modal open={!!viewing} title={viewing ? `Ticket ${viewing.id} — ${viewing.role_key}` : 'Ticket'} onCancel={() => setViewing(null)} footer={null} width={720}>
        {viewing && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="ID">{viewing.id}</Descriptions.Item>
            <Descriptions.Item label="Role">{viewing.role_key}</Descriptions.Item>
            <Descriptions.Item label="Department">{viewing.department}</Descriptions.Item>
            <Descriptions.Item label="Quantity">{viewing.quantity}</Descriptions.Item>
            <Descriptions.Item label="Created By">{viewing.created_by}</Descriptions.Item>
            <Descriptions.Item label="Expected Date">{viewing.expected_date ? new Date(viewing.expected_date).toLocaleDateString() : '-'}</Descriptions.Item>
            <Descriptions.Item label="Status"><Tag>{viewing.status}</Tag></Descriptions.Item>
            <Descriptions.Item label="JD Required">{viewing.jd_required ? 'Yes' : 'No'}</Descriptions.Item>
            <Descriptions.Item label="Notes">{
              (function() {
                const p = viewing.payload;
                if (!p) return '-';
                if (typeof p === 'object') return p.notes || JSON.stringify(p, null, 2);
                try {
                  const parsed = JSON.parse(p);
                  return parsed.notes || JSON.stringify(parsed, null, 2);
                } catch (e) {
                  return String(p);
                }
              })()
            }</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
