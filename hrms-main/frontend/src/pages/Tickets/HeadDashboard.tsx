import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, InputNumber, Switch, message, DatePicker, AutoComplete } from 'antd';
import { listRoles } from '../../services/roles';
import { createTicket } from '../../services/tickets';

export default function HeadDashboard() {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('head_user');
  const [roleOptions, setRoleOptions] = useState<Array<{ value: string; label: React.ReactNode }>>([]);
  const [roleMap, setRoleMap] = useState<Record<string, number>>({});
  const [roleDeptMap, setRoleDeptMap] = useState<Record<string, string>>({});
  const [form] = Form.useForm();

  useEffect(() => { loadRoles(); }, []);

  const loadRoles = async () => {
    try {
      const res = await listRoles();
      const data = res.data || res || [];
      const opts = (data || []).map((r: any) => ({ value: r.title || r.key_name, label: `${r.title || r.key_name}${r.department_name ? ` (${r.department_name})` : ''}` }));
      setRoleOptions(opts);
      const map: Record<string, number> = {};
      const deptMap: Record<string, string> = {};
      (data || []).forEach((r: any) => {
        const name = r.title || r.key_name;
        if (name) {
          map[name] = r.id;
          if (r.department_name) deptMap[name] = r.department_name;
        }
      });
      setRoleMap(map);
      setRoleDeptMap(deptMap);
    } catch (err) { console.error('loadRoles', err); }
  };

  const onFinish = async (vals: any) => {
    setLoading(true);
    try {
      let role_id: number | undefined = vals.role_id;
      let role_key: string | undefined;
      let resolvedDepartment: string | undefined;
      if (typeof role_id === 'undefined' || role_id === null) {
        if (vals.role) {
          const typed = vals.role as string;
          if (roleMap[typed]) {
            role_id = roleMap[typed];
            resolvedDepartment = roleDeptMap[typed];
          }
          else {
            try {
              const rres = await listRoles({ key_name: typed });
              const rlist = (rres && rres.data) ? rres.data : rres;
              if (rlist && rlist.length > 0) {
                role_id = rlist[0].id;
                resolvedDepartment = rlist[0].department_name;
              }
              else role_key = typed;
            } catch (e) {
              console.warn('failed to resolve typed role to id', e);
              role_key = typed;
            }
          }
        }
      }

      const payload: any = {
        role_key: vals.role || role_key || null,
        department: vals.department || resolvedDepartment,
        quantity: vals.quantity,
        created_by: vals.created_by || username,
        jd_required: vals.jd_required,
        payload: { notes: vals.notes },
        expected_date: vals.expected_date ? vals.expected_date.toISOString() : null
      };
      if (typeof role_id !== 'undefined' && role_id !== null) payload.role_id = role_id;
      await createTicket(payload);
      message.success('Ticket created');
    } catch (err) {
      console.error(err);
      message.error('Failed to create ticket');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <Card title="Raise Requirement">
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ quantity: 1, jd_required: true }}>
        <Form.Item name="role" label="Role" rules={[{ required: true }]}>
          <AutoComplete
            options={roleOptions}
            placeholder="Type or select role"
            filterOption={(inputValue, option) => {
              const lab = (option?.label as string) || option?.value || '';
              return lab.toLowerCase().includes((inputValue || '').toLowerCase());
            }}
            allowClear
            onSelect={(value) => {
              const id = roleMap[value as string];
              if (id) form.setFieldsValue({ role_id: id });
              else form.setFieldsValue({ role_id: undefined });
              const dept = roleDeptMap[value as string];
              if (dept) form.setFieldsValue({ department: dept });
            }}
            onChange={(value) => {
              form.setFieldsValue({ role_id: undefined });
              if (!value) form.setFieldsValue({ department: undefined });
            }}
          />
        </Form.Item>
        <Form.Item name="role_id" label="Role ID (autofilled on select)">
          <InputNumber style={{ width: 200 }} disabled />
        </Form.Item>
        <Form.Item name="department" label="Department" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="quantity" label="Quantity">
          <InputNumber min={1} />
        </Form.Item>
          <Form.Item name="expected_date" label="Expected Date">
            <DatePicker />
          </Form.Item>
        <Form.Item name="created_by" label="Your username" help="Used to filter your tickets">
          <Input placeholder="head_user" onChange={e => setUsername(e.target.value)} defaultValue={username} />
        </Form.Item>
        <Form.Item name="jd_required" label="JD required">
          <Switch defaultChecked />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>Submit</Button>
        </Form.Item>
      </Form>
      </Card>

      {/* Tickets list moved to Heads -> My Tickets */}
    </div>
  );
}
