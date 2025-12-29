import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Input, message, Rate } from 'antd';
import { listCandidates, updateCandidate, downloadResume } from '../../services/candidates';
import { listRoles, getRoleScopes } from '../../services/roles';

export default function HeadShortlisted() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [scopes, setScopes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState<string | null>(null);
  const [previewContentType, setPreviewContentType] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await listCandidates({ status: 'shortlisted' });
      setCandidates(res.data || res);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (rec: any) => setEditing({ ...rec });

  // when opening edit modal, fetch scopes for the candidate role (by key -> role id -> scopes)
  useEffect(() => {
    const fetchScopes = async () => {
      if (!editing) { setScopes([]); return; }
      try {
        const roleKeyOrId = editing.role_key;
        if (!roleKeyOrId) { setScopes([]); return; }
        let roleId: number | null = null;
        if (typeof roleKeyOrId === 'number') roleId = roleKeyOrId;
        else if (/^\d+$/.test(String(roleKeyOrId))) roleId = parseInt(String(roleKeyOrId), 10);
        else {
          const rolesRes = await listRoles({ key_name: roleKeyOrId });
          const rolesList = (rolesRes && rolesRes.data) ? rolesRes.data : rolesRes;
          if (rolesList && rolesList.length > 0) roleId = rolesList[0].id;
        }
        if (!roleId) { setScopes([]); return; }
        const scopesRes = await getRoleScopes(roleId);
        const scopesList = (scopesRes && scopesRes.data) ? scopesRes.data : scopesRes;
        setScopes(scopesList || []);
        if (!editing.head_scores) {
          const init = (scopesList || []).map((s: any) => ({ scope_id: s.id, label: s.label, score: 0 }));
          setEditing(prev => ({ ...(prev||{}), head_scores: init }));
        }
      } catch (err) { console.error('fetchScopes', err); setScopes([]); }
    };
    fetchScopes();
  }, [editing]);

  const save = async () => {
    if (!editing) return;
    setLoading(true);
    try {
      // include per-scope scores and interviewer names
      const payload: any = { head_feedback: editing.head_feedback, head_notified: 1, hr_notified: 1 };
      if (editing.interviewers) payload.interviewers = editing.interviewers;
      // If head_scores provided, include them and compute average percent across up to 5 fields
      if (editing.head_scores) {
        payload.head_scores = editing.head_scores;
        const scores = (editing.head_scores || []).map((h: any) => Number(h.score || 0));
        const relevant = scores.slice(0, 5);
        const count = relevant.length;
        const sum = relevant.reduce((a: number, b: number) => a + b, 0);
        const avgScore = count ? (sum / count) : 0;
        const percent = Math.round((avgScore / 5) * 100);
        payload.head_result = percent; // store percent
        // set status based on 60% threshold
        if (percent >= 60) payload.status = 'interviewed';
        else payload.status = 'rejected';
      } else if (editing.head_result !== undefined) {
        payload.head_result = editing.head_result;
        const hr = Number(editing.head_result) || 0;
        if (hr >= 60) payload.status = 'interviewed';
        else payload.status = 'rejected';
      }
      await updateCandidate(editing.id, payload);
      message.success('Saved');
      setEditing(null);
      load();
    } catch (err) { console.error(err); message.error('Save failed'); } finally { setLoading(false); }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Name', dataIndex: 'candidate_name', key: 'candidate_name' },
    { title: 'Role', dataIndex: 'role_key', key: 'role_key' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Resume', key: 'resume', render: (_: any, r: any) => (
        r.resume_filename ? <Button onClick={() => viewResume(r)}>View Resume</Button> : <span style={{ color: '#999' }}>No resume</span>
    ) },
    { title: 'Actions', key: 'actions', render: (_: any, r: any) => <Button onClick={() => openEdit(r)}>Enter Result</Button> }
  ];

  const viewResume = async (rec: any) => {
    try {
      const res = await downloadResume(rec.id);
      const contentType = (res && res.headers && (res.headers['content-type'] || res.headers['Content-Type'])) || 'application/octet-stream';
      const blob = new Blob([res.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      // open inline modal with this url
      setPreviewUrl(url);
      setPreviewFilename(rec.resume_filename || `resume_${rec.id}`);
      setPreviewContentType(contentType);
      setPreviewVisible(true);
      // revoke later when modal closed (cleanup handled on close too)
    } catch (err) { console.error(err); message.error('Failed to open resume'); }
  };

  // download the currently-previewed file
  const downloadPreview = () => {
    if (!previewUrl || !previewFilename) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = previewFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const closePreview = () => {
    setPreviewVisible(false);
    if (previewUrl) {
      try { URL.revokeObjectURL(previewUrl); } catch (e) { /* ignore */ }
      setPreviewUrl(null);
    }
    setPreviewFilename(null);
    setPreviewContentType(null);
  };

  return (
    <div>
      <Card title="Shortlisted Candidates (Heads)">
        <Table dataSource={candidates} columns={columns} rowKey="id" />
      </Card>

      <Modal open={!!editing} title="Enter Interview Result" onCancel={() => setEditing(null)} onOk={save} confirmLoading={loading}>
        {editing && (
          <div>
            <p><b>{editing.candidate_name}</b> — {editing.role_key}</p>
            <div style={{ marginBottom: 8 }}>
              <label>Interviewer Names (comma-separated)</label>
              <Input value={(editing.interviewers && Array.isArray(editing.interviewers)) ? editing.interviewers.join(', ') : (editing.interviewers || '')}
                onChange={e => {
                  const v = e.target.value;
                  const arr = v.split(',').map((s: string) => s.trim()).filter(Boolean);
                  setEditing({...editing, interviewers: arr});
                }}
                placeholder="Enter interviewer names separated by commas" />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label>Ratings by Scope</label>
              <br />
              {scopes && scopes.length > 0 ? (
                scopes.map((s: any) => {
                  const current = (editing.head_scores || []).find((h: any) => h.scope_id === s.id) || { score: 0 };
                  return (
                    <div key={s.id} style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>{s.label}</div>
                      <Rate value={current.score || 0} onChange={(val) => {
                        const next = (editing.head_scores || []).slice();
                        const idx = next.findIndex((h: any) => h.scope_id === s.id);
                        if (idx >= 0) next[idx] = { ...next[idx], score: val };
                        else next.push({ scope_id: s.id, label: s.label, score: val });
                        setEditing({ ...editing, head_scores: next });
                      }} />
                    </div>
                  );
                })
              ) : (
                <div style={{ color: '#999' }}>No scopes defined for this role</div>
              )}
            </div>
            <div>
              <label>Feedback</label>
              <Input.TextArea value={editing.head_feedback || ''} onChange={e => setEditing({...editing, head_feedback: e.target.value})} rows={4} />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={previewVisible}
        title={previewFilename || 'Resume'}
        onCancel={closePreview}
        footer={[
          <Button key="download" type="primary" onClick={downloadPreview}>Download</Button>,
          <Button key="close" onClick={closePreview}>Close</Button>
        ]}
        width={900}
      >
        {previewUrl && previewContentType && previewContentType.toLowerCase().includes('pdf') ? (
          // embed PDF
          <iframe src={previewUrl} title="resume-preview" style={{ width: '100%', height: '70vh', border: 'none' }} />
        ) : previewUrl ? (
          <div>
            <p>Preview not available for this file type.</p>
            <Button type="primary" onClick={downloadPreview}>Download</Button>
          </div>
        ) : (
          <p style={{ color: '#999' }}>No preview available</p>
        )}
      </Modal>
    </div>
  );
}
