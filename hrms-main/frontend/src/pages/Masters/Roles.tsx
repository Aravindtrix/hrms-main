import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { listRoles, createRole, updateRole, deleteRole } from '../../services/roles';
import { listDepartments } from '../../services/departments';

const { Option } = Select;

export default function Roles() {
  const [roles, setRoles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const load = async () => {
    try {
      const r = await listRoles();
      setRoles(r.data || r);
    } catch (err) { console.error(err); message.error('Failed to load roles'); }
  };

  const loadDepts = async () => {
    try { const d = await listDepartments(); setDepartments(d.data || d); } catch (err) { console.error(err); }
  };

  useEffect(() => { load(); loadDepts(); }, []);

  const open = (rec?: any) => { setEditing(rec || null); form.resetFields(); if (rec) form.setFieldsValue(rec); setModalOpen(true); };

  const save = async (vals: any) => {
    try {
      if (editing) await updateRole(editing.id, vals);
      else await createRole(vals);
      message.success('Saved');
      setModalOpen(false);
      load();
    } catch (err) { console.error(err); message.error('Save failed'); }
  };

  return (
    <Card title="Roles">
      <Button type="primary" onClick={() => open()} style={{ marginBottom: 12 }}>New Role</Button>
      <Table dataSource={roles} rowKey="id">
        <Table.Column title="ID" dataIndex="id" key="id" />
        <Table.Column title="Title" dataIndex="title" key="title" />
        <Table.Column title="Department" dataIndex="department_name" key="department_name" />
        <Table.Column title="Actions" key="actions" render={(text, rec: any) => (
          <>
            <Button type="link" onClick={() => open(rec)}>Edit</Button>
            <Popconfirm title="Delete role?" onConfirm={async () => { await deleteRole(rec.id); message.success('Deleted'); load(); }}>
              <Button type="link" danger>Delete</Button>
            </Popconfirm>
          </>
        )} />
      </Table>

      <Modal open={modalOpen} title={editing ? 'Edit Role' : 'New Role'} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={save} initialValues={{ department_id: undefined, title: '', key_name: '', description: '' }}>
          <Form.Item name="department_id" label="Department">
            <Select allowClear placeholder="Select department">
              {departments.map(d => <Option key={d.id} value={d.id}>{d.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="key_name" label="Key"><Input /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
