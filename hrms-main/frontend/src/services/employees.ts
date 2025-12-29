import api from './api';

export async function getEmployeeByCandidate(candidateId: number) {
  const res = await api.get(`/employees/by-candidate/${candidateId}`);
  return res.data;
}

export async function listEmployees() {
  const res = await api.get('/employees');
  return res.data;
}

export async function upsertEmployee(payload: any) {
  const res = await api.post('/employees', payload);
  return res.data;
}
