import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "@/features/auth/login-page";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { ProductsPage } from "@/features/products/products-page";
import { ProductFormPage } from "@/features/products/product-form-page";
import { CategoriesPage } from "@/features/categories/categories-page";
import { UsersPage } from "@/features/users/users-page";
import { SpecialistsPage } from "@/features/specialists/specialists-page";

export const router: ReturnType<typeof createBrowserRouter> =
  createBrowserRouter([
    { path: "/login", element: <LoginPage /> },
    {
      element: <ProtectedRoute />,
      children: [
        {
          element: <AppShell />,
          children: [
            { path: "/", element: <Navigate to="/products" replace /> },
            { path: "/products", element: <ProductsPage /> },
            { path: "/products/new", element: <ProductFormPage /> },
            { path: "/products/:id", element: <ProductFormPage /> },
            { path: "/categories", element: <CategoriesPage /> },
            { path: "/users", element: <UsersPage /> },
            { path: "/specialists", element: <SpecialistsPage /> },
          ],
        },
      ],
    },
  ]);
