import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { productsApi } from "./api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCop } from "@/lib/utils";
import type { ProductStatus } from "@bymariap/types";

export function ProductsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProductStatus | "">("");

  const list = useQuery({
    queryKey: ["products", { search, status }],
    queryFn: () =>
      productsApi.list({
        search: search || undefined,
        status: status || undefined,
      }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => {
      toast.success("Producto eliminado");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <Button onClick={() => nav("/products/new")}>Nuevo</Button>
      </header>

      <div className="flex gap-3">
        <Input
          placeholder="Buscar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="max-w-xs"
        >
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="published">Publicado</option>
          <option value="archived">Archivado</option>
        </Select>
      </div>

      {list.isLoading && <p>Cargando…</p>}
      {list.error && (
        <p className="text-destructive">{(list.error as any).message}</p>
      )}
      {list.data && (
        <Table>
          <THead>
            <TR>
              <TH>Nombre</TH>
              <TH>Slug</TH>
              <TH>Precio</TH>
              <TH>Stock</TH>
              <TH>Estado</TH>
              <TH>Categorías</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {list.data.map((p) => (
              <TR key={p.id}>
                <TD>{p.name}</TD>
                <TD className="text-muted-foreground">{p.slug}</TD>
                <TD>{formatCop(p.priceCop)}</TD>
                <TD>{p.stockQuantity}</TD>
                <TD>
                  <Badge>{p.status}</Badge>
                </TD>
                <TD className="space-x-1">
                  {p.categories.map((c) => (
                    <Badge key={c.id}>{c.name}</Badge>
                  ))}
                </TD>
                <TD className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => nav(`/products/${p.id}`)}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => confirm("¿Eliminar?") && remove.mutate(p.id)}
                  >
                    Eliminar
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
