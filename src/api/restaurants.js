import client from './client.js';

export const restaurantsApi = {
  list: async () => {
    const res = await client.get('/restaurants');
    return res.data.data;
  },

  get: async (id) => {
    const res = await client.get(`/restaurants/${id}`);
    return res.data.data;
  },

  create: async (data) => {
    const res = await client.post('/restaurants', data);
    return res.data.data;
  },

  update: async (id, data) => {
    const res = await client.put(`/restaurants/${id}`, data);
    return res.data.data;
  },

  delete: async (id) => {
    await client.delete(`/restaurants/${id}`);
  },
};
