"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { CartDTO } from "@bymariap/types";

export function useCart() {
  return useQuery({
    queryKey: ["cart"],
    queryFn: () => api.get<CartDTO>(endpoints.storeCart),
  });
}

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { productId: string; quantity: number }) =>
      api.post<CartDTO>(endpoints.storeCartItems, input),
    onSuccess: (cart) => qc.setQueryData(["cart"], cart),
  });
}

export function useUpdateCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; quantity: number }) =>
      api.patch<CartDTO>(endpoints.storeCartItem(input.id), {
        quantity: input.quantity,
      }),
    onSuccess: (cart) => qc.setQueryData(["cart"], cart),
  });
}

export function useRemoveCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<CartDTO>(endpoints.storeCartItem(id)),
    onSuccess: (cart) => qc.setQueryData(["cart"], cart),
  });
}
