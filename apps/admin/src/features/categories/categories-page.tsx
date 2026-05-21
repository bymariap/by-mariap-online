import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { categoriesApi } from "./api";
import { CategoryFormDialog } from "./category-form-dialog";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import type { CategoryDTO } from "@bymariap/types";

export function CategoriesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CategoryDTO | null>(null);
  const [open, setOpen] = useState(false);

  const list = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });
  const remove = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => {
      toast.success("Eliminada");
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  return (
    <div className="space-y-4">
      <header className="flex justify-between">
        <h1 className="text-2xl font-semibold">Categorías</h1>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Nueva
        </Button>
      </header>
      {list.data && (
        <Table>
          <THead>
            <TR>
              <TH>Nombre</TH>
              <TH>Slug</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {list.data.map((c) => (
              <TR key={c.id}>
                <TD>{c.name}</TD>
                <TD className="text-muted-foreground">{c.slug}</TD>
                <TD className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(c);
                      setOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => confirm("¿Eliminar?") && remove.mutate(c.id)}
                  >
                    Eliminar
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <CategoryFormDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
      />
    </div>
  );
}
