import api from './api';

export async function generateJD(role: string, qnty?: number) {
  const res = await api.post('/jd', { role, qnty }, { responseType: 'arraybuffer' });
  return res;
}
