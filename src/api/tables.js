import client from './client.js';

export const tablesApi = {
  list: async (restaurantId) => {
    const res = await client.get(`/restaurants/${restaurantId}/tables`);
    return res.data.data;
  },

  create: async (restaurantId, data) => {
    const res = await client.post(`/restaurants/${restaurantId}/tables`, data);
    return res.data.data;
  },

  update: async (restaurantId, tableId, data) => {
    const res = await client.put(`/restaurants/${restaurantId}/tables/${tableId}`, data);
    return res.data.data;
  },

  delete: async (restaurantId, tableId) => {
    await client.delete(`/restaurants/${restaurantId}/tables/${tableId}`);
  },
};
