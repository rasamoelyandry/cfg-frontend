import client from './client.js';

export const authApi = {
  login: async (email, password) => {
    const res = await client.post('/auth/login', { email, password });
    return res.data.data;
  },

  refresh: async (refreshToken) => {
    const res = await client.post('/auth/refresh', { refreshToken });
    return res.data.data;
  },

  logout: async () => {
    await client.post('/auth/logout');
  },

  me: async () => {
    const res = await client.get('/auth/me');
    return res.data.data;
  },
};
