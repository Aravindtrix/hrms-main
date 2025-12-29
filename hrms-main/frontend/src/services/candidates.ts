import api from './api';

export async function createCandidate(payload: any) {
  const res = await api.post('/candidates', payload);
  return res.data;
}

export async function listCandidates(params?: any) {
  const res = await api.get('/candidates', { params });
  return res.data;
}

export async function listShortlisted(params?: any) {
  const res = await api.get('/candidates', { params: { status: 'shortlisted', ...(params||{}) } });
  return res.data;
}

export async function getCandidate(id: number) {
  const res = await api.get(`/candidates/${id}`);
  return res.data;
}

export async function updateCandidate(id: number, payload: any) {
  const res = await api.patch(`/candidates/${id}`, payload);
  return res.data;
}

export async function deleteCandidate(id: number) {
  const res = await api.delete(`/candidates/${id}`);
  return res.data;
}

export async function generateOffer(id: number) {
  const res = await api.get(`/candidates/${id}/offer`, { responseType: 'arraybuffer' });
  return res;
}

export async function generateAppointment(id: number) {
  const res = await api.get(`/candidates/${id}/appointment`, { responseType: 'arraybuffer' });
  return res;
}

export async function downloadResume(id: number) {
  const res = await api.get(`/candidates/${id}/resume`, { responseType: 'arraybuffer' });
  return res;
}
