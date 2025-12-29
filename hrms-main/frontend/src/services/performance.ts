import api from './api';

export async function listPerformanceScores() {
  const res = await api.get('/performance');
  return res.data;
}

export async function upsertPerformanceScore(payload: any) {
  const res = await api.post('/performance', payload);
  return res.data;
}

export async function deletePerformanceScore(id: number) {
  const res = await api.delete(`/performance/${id}`);
  return res.data;
}

export async function listPerformanceActions() {
  const res = await api.get('/performance/hr-actions');
  return res.data;
}

export async function upsertPerformanceAction(payload: any) {
  const res = await api.post('/performance/hr-actions', payload);
  return res.data;
}
