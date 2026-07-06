import client from './client.js';

export const menuApi = {
  getMenu: async (restaurantId) => {
    const res = await client.get(`/restaurants/${restaurantId}/menu`);
    return res.data.data;
  },

  // Categories
  createCategory: async (restaurantId, data) => {
    const res = await client.post(`/restaurants/${restaurantId}/categories`, data);
    return res.data.data;
  },

  updateCategory: async (restaurantId, categoryId, data) => {
    const res = await client.put(`/restaurants/${restaurantId}/categories/${categoryId}`, data);
    return res.data.data;
  },

  deleteCategory: async (restaurantId, categoryId) => {
    await client.delete(`/restaurants/${restaurantId}/categories/${categoryId}`);
  },

  // Items
  createItem: async (restaurantId, data) => {
    const res = await client.post(`/restaurants/${restaurantId}/items`, data);
    return res.data.data;
  },

  updateItem: async (restaurantId, itemId, data) => {
    const res = await client.put(`/restaurants/${restaurantId}/items/${itemId}`, data);
    return res.data.data;
  },

  toggleItemAvailability: async (restaurantId, itemId, isAvailable) => {
    const res = await client.patch(`/restaurants/${restaurantId}/items/${itemId}/availability`, {
      isAvailable,
    });
    return res.data.data;
  },

  deleteItem: async (restaurantId, itemId) => {
    await client.delete(`/restaurants/${restaurantId}/items/${itemId}`);
  },

  copyMenuFrom: async (targetRestaurantId, sourceRestaurantId) => {
    const res = await client.post(
      `/restaurants/${targetRestaurantId}/menu/copy-from/${sourceRestaurantId}`
    );
    return res.data.data;
  },
};
