export type UserRole = "admin" | "finance" | "specialist" | "customer";

export type ProductStatus = "draft" | "published" | "archived";

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
}

export interface ProductDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceCop: number;
  stockQuantity: number;
  imageUrls: string[];
  status: ProductStatus;
  categories: CategoryDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface SpecialistDTO {
  id: string;
  userId: string;
  bio: string | null;
  specialties: string[];
  avatarUrl: string | null;
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface CartItemDTO {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImageUrl: string | null;
  quantity: number;
  unitPriceSnapshot: number;
  lineTotal: number;
}

export interface CartDTO {
  id: string;
  items: CartItemDTO[];
  subtotal: number;
}

export interface OrderItemDTO {
  id: string;
  productId: string;
  nameSnapshot: string;
  quantity: number;
  unitPriceSnapshot: number;
}

export interface ShippingAddressDTO {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  notes?: string;
}

export interface OrderDTO {
  id: string;
  reference: string;
  status: OrderStatus;
  customerId: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  subtotal: number;
  shippingCost: number;
  total: number;
  shippingAddress: ShippingAddressDTO;
  shippingMethod: string;
  items: OrderItemDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface ShippingOptionDTO {
  id: string;
  name: string;
  priceCop: number;
  isPickup: boolean;
}

export interface PaymentIntentDTO {
  reference: string;
  amountInCents: number;
  currency: "COP";
  publicKey: string;
  integritySignature: string;
}
