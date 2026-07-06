import client from './client.js';

export const usersApi = {
  list: async (restaurantId) => {
    const res = await client.get(`/restaurants/${restaurantId}/users`);
    return res.data.data;
  },

  create: async (restaurantId, data) => {
    const res = await client.post(`/restaurants/${restaurantId}/users`, data);
    return res.data.data;
  },

  update: async (restaurantId, userId, data) => {
    const res = await client.put(`/restaurants/${restaurantId}/users/${userId}`, data);
    return res.data.data;
  },

  changeRole: async (restaurantId, userId, role) => {
    const res = await client.patch(`/restaurants/${restaurantId}/users/${userId}/role`, { role });
    return res.data.data;
  },

  deactivate: async (restaurantId, userId) => {
    await client.delete(`/restaurants/${restaurantId}/users/${userId}`);
  },
};
