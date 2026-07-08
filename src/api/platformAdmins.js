import client from './client.js';

export const platformAdminsApi = {
  list: async () => {
    const res = await client.get('/platform-admins');
    return res.data.data;
  },

  create: async (data) => {
    const res = await client.post('/platform-admins', { ...data, role: 'SUPER_ADMIN' });
    return res.data.data;
  },

  update: async (userId, data) => {
    const res = await client.put(`/platform-admins/${userId}`, data);
    return res.data.data;
  },

  deactivate: async (userId) => {
    await client.delete(`/platform-admins/${userId}`);
  },
};
