import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Popconfirm } from 'antd';
import { listDepartments, createDepartment, updateDepartment, deleteDepartment } from '../../services/departments';

export default function Departments() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const load = async () => {
    try {
      const res = await listDepartments();
      setDepartments(res.data || res);
    } catch (err) {
      console.error(err);
      message.error('Failed to load departments');
    }
  };

  useEffect(() => { load(); }, []);

  const open = (rec?: any) => { setEditing(rec || null); form.resetFields(); if (rec) form.setFieldsValue(rec); setModalOpen(true); };

  const save = async (vals: any) => {
    try {
      if (editing) await updateDepartment(editing.id, vals);
      else await createDepartment(vals);
      message.success('Saved');
      setModalOpen(false);
      load();
    } catch (err) { console.error(err); message.error('Save failed'); }
  };

  return (
    <Card title="Departments">
      <Button type="primary" onClick={() => open()} style={{ marginBottom: 12 }}>New Department</Button>
      <Table dataSource={departments} rowKey="id">
        <Table.Column title="ID" dataIndex="id" key="id" />
        <Table.Column title="Name" dataIndex="name" key="name" />
        <Table.Column title="Key" dataIndex="key_name" key="key_name" />
        <Table.Column title="Actions" key="actions" render={(text, rec: any) => (
          <>
            <Button type="link" onClick={() => open(rec)}>Edit</Button>
            <Popconfirm title="Delete department?" onConfirm={async () => { await deleteDepartment(rec.id); message.success('Deleted'); load(); }}>
              <Button type="link" danger>Delete</Button>
            </Popconfirm>
          </>
        )} />
      </Table>

      <Modal open={modalOpen} title={editing ? 'Edit Department' : 'New Department'} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={save} initialValues={{ name: '', key_name: '', description: '' }}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="key_name" label="Key"><Input /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
