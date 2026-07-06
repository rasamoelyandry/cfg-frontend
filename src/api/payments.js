import client from './client.js';

export const paymentsApi = {
  list: async (restaurantId, params = {}) => {
    const res = await client.get(`/restaurants/${restaurantId}/payments`, { params });
    return res.data.data;
  },
};
