import api from './api';

export async function listDepartments() {
  const res = await api.get('/departments');
  return res.data;
}

export async function createDepartment(payload: any) {
  const res = await api.post('/departments', payload);
  return res.data;
}

export async function updateDepartment(id: number, payload: any) {
  const res = await api.patch(`/departments/${id}`, payload);
  return res.data;
}

export async function deleteDepartment(id: number) {
  const res = await api.delete(`/departments/${id}`);
  return res.data;
}
