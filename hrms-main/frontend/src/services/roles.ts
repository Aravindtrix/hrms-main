import api from './api';

export async function listRoles(params?: any) {
  const res = await api.get('/roles', { params });
  return res.data;
}

export async function getRoleScopes(roleId: number) {
  const res = await api.get(`/roles/${roleId}/scopes`);
  return res.data;
}

export async function getRole(roleId: number) {
  const res = await api.get(`/roles/${roleId}`);
  return res.data;
}

export async function createRole(payload: any) {
  const res = await api.post('/roles', payload);
  return res.data;
}

export async function updateRole(id: number, payload: any) {
  const res = await api.patch(`/roles/${id}`, payload);
  return res.data;
}

export async function deleteRole(id: number) {
  const res = await api.delete(`/roles/${id}`);
  return res.data;
}
