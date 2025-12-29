import api from './api';

export async function createTicket(payload: { role_key?: string; role_id?: number | string; department: string; quantity?: number; created_by: string; jd_required?: boolean; payload?: any; expected_date?: string | null }) {
  const res = await api.post('/tickets', payload);
  return res.data;
}

export async function listTickets(params?: any) {
  const res = await api.get('/tickets', { params });
  return res.data;
}

export async function updateTicket(id: number, payload: any) {
  const res = await api.patch(`/tickets/${id}`, payload);
  return res.data;
}

export async function deleteTicket(id: number) {
  const res = await api.delete(`/tickets/${id}`);
  return res.data;
}

export async function syncTicketRole(id: number) {
  const res = await api.post(`/tickets/${id}/sync-role`);
  return res.data;
}

export async function getNotificationsCount() {
  const res = await api.get('/tickets/notifications/count');
  return res.data;
}
