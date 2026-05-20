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
