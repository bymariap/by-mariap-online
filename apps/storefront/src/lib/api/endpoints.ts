export const endpoints = {
  storeCategories: "/store/categories",
  storeProducts: "/store/products",
  storeProduct: (slug: string) => `/store/products/${slug}`,
  storeCart: "/store/cart",
  storeCartItems: "/store/cart/items",
  storeCartItem: (id: string) => `/store/cart/items/${id}`,
  storeShipping: (city: string) =>
    `/store/shipping/options?city=${encodeURIComponent(city)}`,
  storeOrders: "/store/orders",
  storeOrder: (ref: string) => `/store/orders/${ref}`,
  storePayIntent: (ref: string) => `/store/payments/intent/${ref}`,
  authLogin: "/auth/login",
  authLogout: "/auth/logout",
  authRefresh: "/auth/refresh",
  me: "/me",
  meOrders: "/me/orders",
} as const;
