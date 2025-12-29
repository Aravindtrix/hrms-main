import React, { useEffect, useMemo, useState } from 'react';
import { Card, Table, Select, InputNumber, Button, message, Modal } from 'antd';
import { listEmployees } from '../../services/employees';
import { listRoles } from '../../services/roles';
import { listPerformanceScores, listPerformanceActions, upsertPerformanceAction } from '../../services/performance';

type ActionDraft = {
  action?: string;
  increment_ctc?: number;
};

export default function HRPerformance() {
  const [scores, setScores] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [drafts, setDrafts] = useState<Record<number, ActionDraft>>({});
  const [historyEmployeeId, setHistoryEmployeeId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [scoreRes, actionRes, empRes, roleRes] = await Promise.all([
        listPerformanceScores(),
        listPerformanceActions(),
        listEmployees(),
        listRoles()
      ]);
      const scoreRows = scoreRes.data || scoreRes || [];
      const actionRows = actionRes.data || actionRes || [];
      setScores(scoreRows);
      setActions(actionRows);
      setEmployees(empRes.data || empRes || []);
      setRoles(roleRes.data || roleRes || []);
      const nextDrafts: Record<number, ActionDraft> = {};
      actionRows.forEach((a: any) => {
        nextDrafts[Number(a.employee_id)] = {
          action: a.action,
          increment_ctc: a.increment_ctc
        };
      });
      setDrafts(nextDrafts);
    } catch (err) {
      console.error('loadData', err);
      message.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

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

  const setDraft = (employeeId: number, update: ActionDraft) => {
    setDrafts(prev => ({ ...prev, [employeeId]: { ...prev[employeeId], ...update } }));
  };

  const handleSave = async (employeeId: number) => {
    const draft = drafts[employeeId] || {};
    if (!draft.action) {
      message.error('Select an action before saving');
      return;
    }
    setSaving(prev => ({ ...prev, [employeeId]: true }));
    try {
      const usesIncrement = draft.action === 'increment' || draft.action === 'promotion_increment';
      await upsertPerformanceAction({
        employee_id: employeeId,
        action: draft.action,
        increment_ctc: usesIncrement ? draft.increment_ctc : null
      });
      message.success('HR action saved');
      await loadData();
    } catch (err) {
      console.error('upsertPerformanceAction', err);
      message.error('Failed to save HR action');
    } finally {
      setSaving(prev => ({ ...prev, [employeeId]: false }));
    }
  };

  const actionOptions = [
    { value: 'promotion_increment', label: 'Promotion + Increment' },
    { value: 'increment', label: 'Increment' },
    { value: 'training', label: 'Training' },
    { value: 'satisfied', label: 'Satisfied' },
    { value: 'not_satisfied', label: 'Not Satisfied' }
  ];

  const performanceCategories = [
    { key: 'category_1', label: 'Category 1' },
    { key: 'category_2', label: 'Category 2' },
    { key: 'category_3', label: 'Category 3' },
    { key: 'category_4', label: 'Category 4' },
    { key: 'category_5', label: 'Category 5' }
  ];

  const latestScores = useMemo(() => {
    const map = new Map<number, any>();
    for (const row of scores) {
      const employeeId = Number(row.employee_id);
      if (!map.has(employeeId)) {
        map.set(employeeId, row);
        continue;
      }
      const existing = map.get(employeeId);
      const rowDate = row.period_end || row.updated_at || row.created_at || '';
      const existingDate = existing.period_end || existing.updated_at || existing.created_at || '';
      if (String(rowDate) >= String(existingDate)) {
        map.set(employeeId, row);
      }
    }
    return Array.from(map.values());
  }, [scores]);

  const columns = [
    { title: 'Employee ID', dataIndex: 'employee_id', key: 'employee_id' },
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
      title: 'Total (%)',
      key: 'total',
      render: (_: any, record: any) => {
        const total = performanceCategories.reduce((sum, cat) => sum + Number(record[cat.key] || 0), 0);
        const percent = total / performanceCategories.length;
        return Number.isFinite(percent) ? percent.toFixed(1) : '0.0';
      }
    },
    {
      title: 'HR Action',
      key: 'hr_action',
      render: (_: any, record: any) => {
        const employeeId = Number(record.employee_id);
        const draft = drafts[employeeId] || {};
        return (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Select
              value={draft.action}
              placeholder="Select action"
              style={{ width: 160 }}
              options={actionOptions}
              onChange={(value) => setDraft(employeeId, { action: value })}
            />
            <InputNumber
              min={0}
              placeholder="New CTC"
              style={{ width: 140 }}
              disabled={draft.action !== 'increment' && draft.action !== 'promotion_increment'}
              value={draft.increment_ctc}
              onChange={(value) => setDraft(employeeId, { increment_ctc: Number(value) })}
            />
            <Button type="primary" onClick={() => handleSave(employeeId)} loading={saving[employeeId]}>
              Save
            </Button>
            <Button onClick={() => setHistoryEmployeeId(employeeId)}>
              Overall
            </Button>
          </div>
        );
      }
    }
  ];

  const historyRows = historyEmployeeId
    ? scores.filter((row) => Number(row.employee_id) === historyEmployeeId)
    : [];

  return (
    <Card title="Performance Scores (HR)">
      <Table dataSource={latestScores} columns={columns} rowKey="employee_id" loading={loading} />
      <Modal
        title="Overall Performance History"
        open={historyEmployeeId !== null}
        onCancel={() => setHistoryEmployeeId(null)}
        footer={null}
        width={800}
      >
        <Table
          dataSource={historyRows}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          columns={[
            {
              title: 'Period',
              key: 'period',
              render: (_: any, record: any) => {
                const start = record.period_start ? String(record.period_start) : '';
                const end = record.period_end ? String(record.period_end) : '';
                return start && end ? `${start} to ${end}` : '-';
              }
            },
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
    </Card>
  );
}
