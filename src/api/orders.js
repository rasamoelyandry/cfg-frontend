import client from './client.js';

export const ordersApi = {
  list: async (restaurantId, params = {}) => {
    const res = await client.get(`/restaurants/${restaurantId}/orders`, { params });
    return res.data.data;
  },

  get: async (restaurantId, orderId) => {
    const res = await client.get(`/restaurants/${restaurantId}/orders/${orderId}`);
    return res.data.data;
  },

  updateStatus: async (restaurantId, orderId, status) => {
    const res = await client.patch(
      `/restaurants/${restaurantId}/orders/${orderId}/status`,
      { status }
    );
    return res.data.data;
  },

  hide: async (restaurantId, orderId) => {
    await client.delete(`/restaurants/${restaurantId}/orders/${orderId}`);
  },

  getKitchenBoard: async (restaurantId) => {
    const res = await client.get(`/restaurants/${restaurantId}/kitchen/board`);
    return res.data.data;
  },

  updateKitchenOrderStatus: async (restaurantId, orderId, status) => {
    const res = await client.patch(
      `/restaurants/${restaurantId}/kitchen/orders/${orderId}/status`,
      { status }
    );
    return res.data.data;
  },
};
