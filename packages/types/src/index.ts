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

export type ServiceStatus = 'draft' | 'published' | 'archived';

export interface ServiceDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  durationMinutes: number;
  priceCop: number;
  status: ServiceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityWindowDTO {
  id: string;
  specialistId: string;
  date: string;        // YYYY-MM-DD in America/Bogota
  startMinute: number; // local minute-of-day
  endMinute: number;
}

export interface AvailableSlotDTO {
  startAt: string;     // ISO UTC instant
  localTime: string;   // "HH:mm" in America/Bogota for display
}

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface AppointmentDTO {
  id: string;
  customerId: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  guestFullName: string | null;
  specialistId: string;
  specialistName: string;
  serviceId: string;
  serviceName: string;
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: string;
}
