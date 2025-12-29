import React, { useEffect, useMemo, useState } from 'react';
import { Card, Form, InputNumber, Button, Table, Select, message, Popconfirm, DatePicker, Modal } from 'antd';
import dayjs from 'dayjs';
import { listEmployees } from '../../services/employees';
import { listRoles } from '../../services/roles';
import { listPerformanceScores, upsertPerformanceScore, deletePerformanceScore } from '../../services/performance';

export default function HeadPerformance() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [performanceEntries, setPerformanceEntries] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [performanceForm] = Form.useForm();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [historyEmployeeId, setHistoryEmployeeId] = useState<number | null>(null);

  const performanceCategories = [
    { key: 'category_1', label: 'Category 1' },
    { key: 'category_2', label: 'Category 2' },
    { key: 'category_3', label: 'Category 3' },
    { key: 'category_4', label: 'Category 4' },
    { key: 'category_5', label: 'Category 5' }
  ];

  const loadEmployees = async () => {
    try {
      const res = await listEmployees();
      setEmployees(res.data || res || []);
    } catch (err) {
      console.error('loadEmployees', err);
      message.error('Failed to load employees');
    }
  };

  const loadScores = async () => {
    setLoading(true);
    try {
      const res = await listPerformanceScores();
      setPerformanceEntries(res.data || res || []);
    } catch (err) {
      console.error('loadScores', err);
      message.error('Failed to load performance scores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEmployees(); loadScores(); }, []);
  useEffect(() => {
    listRoles()
      .then((res) => setRoles(res.data || res || []))
      .catch((err) => {
        console.error('loadRoles', err);
        message.error('Failed to load roles');
      });
  }, []);

  const employeeNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const e of employees) {
      if (typeof e.candidate_id === 'number') map.set(e.candidate_id, e.candidate_name || '');
    }
    return map;
  }, [employees]);

  const employeeRoleById = useMemo(() => {
    const map = new Map<number, any>();
    for (const e of employees) {
      if (typeof e.candidate_id === 'number') map.set(e.candidate_id, e.role_key);
    }
    return map;
  }, [employees]);

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

  const onPerformanceSubmit = (vals: any) => {
    const employeeId = Number(vals.employee_id);
    const periodRange = vals.period_range || [];
    const periodStart = periodRange[0] ? periodRange[0].format('YYYY-MM-DD') : null;
    const periodEnd = periodRange[1] ? periodRange[1].format('YYYY-MM-DD') : null;
    const payload = {
      id: editingId || undefined,
      employee_id: employeeId,
      category_1: vals.category_1,
      category_2: vals.category_2,
      category_3: vals.category_3,
      category_4: vals.category_4,
      category_5: vals.category_5,
      period_start: periodStart,
      period_end: periodEnd
    };
    const existing = editingId ? performanceEntries.find(e => Number(e.id) === editingId) : null;
    upsertPerformanceScore(payload)
      .then(() => {
        message.success(existing ? 'Performance scores updated' : 'Performance scores saved');
        performanceForm.resetFields();
        setEditingId(null);
        loadScores();
      })
      .catch((err) => {
        console.error('upsertPerformanceScore', err);
        message.error('Failed to save performance scores');
      });
  };

  const handleEmployeeChange = (value: string) => {
    if (editingId) setEditingId(null);
    const cleared = performanceCategories.reduce((acc, cat) => {
      acc[cat.key] = undefined;
      return acc;
    }, {} as Record<string, number>);
    performanceForm.setFieldsValue({ employee_id: value, period_range: undefined, ...cleared });
  };

  const handleEdit = (record: any) => {
    const scoreFields = performanceCategories.reduce((acc, cat) => {
      acc[cat.key] = record[cat.key];
      return acc;
    }, {} as Record<string, number>);
    const rangeValue = record.period_start && record.period_end
      ? [dayjs(record.period_start), dayjs(record.period_end)]
      : undefined;
    performanceForm.setFieldsValue({
      employee_id: String(record.employee_id),
      period_range: rangeValue,
      ...scoreFields
    });
    setEditingId(Number(record.id));
  };

  const performanceColumns = [
    {
      title: 'Employee ID',
      dataIndex: 'employee_id',
      key: 'employee_id'
    },
    {
      title: 'Employee',
      dataIndex: 'employee_id',
      key: 'employee_name',
      render: (_: any, record: any) => record.candidate_name || employeeNameById.get(Number(record.employee_id)) || 'Unknown'
    },
    {
      title: 'Role',
      dataIndex: 'employee_id',
      key: 'role',
      render: (_: any, record: any) => {
        const roleKey = employeeRoleById.get(Number(record.employee_id));
        if (typeof roleKey === 'number' || /^\d+$/.test(String(roleKey))) {
          const roleId = Number(roleKey);
          return roleTitleById.get(roleId) || String(roleKey || '');
        }
        return roleTitleByKey.get(String(roleKey || '')) || String(roleKey || '');
      }
    },
    {
      title: 'Period',
      key: 'period',
      render: (_: any, record: any) => {
        const start = record.period_start ? String(record.period_start) : '';
        const end = record.period_end ? String(record.period_end) : '';
        return start && end ? `${start} to ${end}` : '-';
      }
    },
    ...performanceCategories.map(cat => ({
      title: cat.label,
      dataIndex: cat.key,
      key: cat.key
    })),
    {
      title: 'Total (%)',
      key: 'total',
      render: (_: any, record: any) => {
        const total = performanceCategories.reduce((sum, cat) => sum + Number(record[cat.key] || 0), 0);
        const percent = total / performanceCategories.length;
        return Number.isFinite(percent) ? percent.toFixed(1) : '0.0';
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => handleEdit(record)}>Edit</Button>
          <Button onClick={() => setHistoryEmployeeId(Number(record.employee_id))}>Overall</Button>
          <Popconfirm
            title="Delete this score entry?"
            okText="Delete"
            cancelText="Cancel"
            onConfirm={() => {
              deletePerformanceScore(Number(record.id))
                .then(() => {
                  message.success('Performance scores deleted');
                  loadScores();
                })
                .catch((err) => {
                  console.error('deletePerformanceScore', err);
                  message.error('Failed to delete performance scores');
                });
            }}
          >
            <Button danger>Delete</Button>
          </Popconfirm>
        </div>
      )
    }
  ];

  const historyRows = historyEmployeeId
    ? performanceEntries.filter(e => Number(e.employee_id) === historyEmployeeId)
    : [];

  return (
    <div>
      <Card title="Performance Scores">
        <Form form={performanceForm} layout="vertical" onFinish={onPerformanceSubmit}>
          <Form.Item name="employee_id" label="Employee" rules={[{ required: true, message: 'Select an employee' }]}>
            <Select
              showSearch
              placeholder="Select employee"
              optionFilterProp="label"
              onChange={handleEmployeeChange}
              options={employees.map(e => ({
                value: String(e.candidate_id),
                label: `${e.candidate_name || 'Employee'} (${e.candidate_id})`
              }))}
            />
          </Form.Item>
          <Form.Item name="period_range" label="Period (Start - End)" rules={[{ required: true, message: 'Select period' }]}>
            <DatePicker.RangePicker />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {performanceCategories.map(cat => (
              <Form.Item key={cat.key} name={cat.key} label={cat.label} rules={[{ required: true, message: 'Enter score' }]}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            ))}
          </div>
          <Form.Item>
            <Button type="primary" htmlType="submit">Save Scores</Button>
          </Form.Item>
        </Form>
        <Table dataSource={performanceEntries} columns={performanceColumns} rowKey="id" pagination={{ pageSize: 5 }} loading={loading} />
      </Card>
      <Modal
        title="Overall Performance History"
        open={historyEmployeeId !== null}
        onCancel={() => setHistoryEmployeeId(null)}
        footer={null}
        width={900}
      >
        <Table
          dataSource={historyRows}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          columns={[
            { title: 'Period', key: 'period', render: (_: any, record: any) => {
              const start = record.period_start ? String(record.period_start) : '';
              const end = record.period_end ? String(record.period_end) : '';
              return start && end ? `${start} to ${end}` : '-';
            }},
            ...performanceCategories.map(cat => ({
              title: cat.label,
              dataIndex: cat.key,
              key: cat.key
            })),
            {
              title: 'Total (%)',
              key: 'total',
              render: (_: any, record: any) => {
                const total = performanceCategories.reduce((sum, cat) => sum + Number(record[cat.key] || 0), 0);
                const percent = total / performanceCategories.length;
                return Number.isFinite(percent) ? percent.toFixed(1) : '0.0';
              }
            }
          ]}
        />
      </Modal>
    </div>
  );
}
