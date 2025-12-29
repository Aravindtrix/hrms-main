import api from './api';

export async function listExits() {
  const res = await api.get('/exits');
  return res.data;
}

export async function upsertExit(payload: any) {
  const res = await api.post('/exits', payload);
  return res.data;
}
