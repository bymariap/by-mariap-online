import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { productsApi } from "./api";
import { categoriesApi } from "@/features/categories/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

const schema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().regex(/^[a-z0-9-]+$/, "kebab-case"),
  description: z.string().max(5000).optional(),
  priceCop: z.coerce.number().int().min(0),
  stockQuantity: z.coerce.number().int().min(0),
  imageUrls: z.array(z.object({ value: z.string().url() })).max(10),
  categoryIds: z.array(z.string()).default([]),
  status: z.enum(["draft", "published", "archived"]),
});
type FormValues = z.infer<typeof schema>;

export function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const nav = useNavigate();
  const qc = useQueryClient();

  const cats = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });
  const prod = useQuery({
    queryKey: ["products", id],
    queryFn: () => productsApi.get(id!),
    enabled: isEdit,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      priceCop: 0,
      stockQuantity: 0,
      imageUrls: [],
      categoryIds: [],
      status: "draft",
    },
  });
  const imgs = useFieldArray({ control: form.control, name: "imageUrls" });

  useEffect(() => {
    if (prod.data) {
      form.reset({
        name: prod.data.name,
        slug: prod.data.slug,
        description: prod.data.description ?? "",
        priceCop: prod.data.priceCop,
        stockQuantity: prod.data.stockQuantity,
        imageUrls: prod.data.imageUrls.map((value) => ({ value })),
        categoryIds: prod.data.categories.map((c) => c.id),
        status: prod.data.status,
      });
    }
  }, [prod.data, form]);

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        ...values,
        imageUrls: values.imageUrls.map((v) => v.value),
      };
      return isEdit
        ? productsApi.update(id!, payload)
        : productsApi.create(payload);
    },
    onSuccess: () => {
      toast.success("Guardado");
      qc.invalidateQueries({ queryKey: ["products"] });
      nav("/products");
    },
    onError: (e: any) => toast.error(e?.message ?? "Error al guardar"),
  });

  return (
    <form
      onSubmit={form.handleSubmit((v) => save.mutate(v))}
      className="space-y-4 max-w-2xl"
    >
      <h1 className="text-2xl font-semibold">
        {isEdit ? "Editar producto" : "Nuevo producto"}
      </h1>

      <Field label="Nombre" error={form.formState.errors.name?.message}>
        <Input {...form.register("name")} />
      </Field>
      <Field label="Slug" error={form.formState.errors.slug?.message}>
        <Input {...form.register("slug")} />
      </Field>
      <Field label="Descripción">
        <Textarea {...form.register("description")} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Precio (COP)"
          error={form.formState.errors.priceCop?.message}
        >
          <Input type="number" min={0} {...form.register("priceCop")} />
        </Field>
        <Field
          label="Stock"
          error={form.formState.errors.stockQuantity?.message}
        >
          <Input type="number" min={0} {...form.register("stockQuantity")} />
        </Field>
      </div>

      <Field label="Estado">
        <Select {...form.register("status")}>
          <option value="draft">Borrador</option>
          <option value="published">Publicado</option>
          <option value="archived">Archivado</option>
        </Select>
      </Field>

      <Field label="Categorías">
        <div className="flex flex-wrap gap-2">
          {cats.data?.map((c) => {
            const checked = form.watch("categoryIds").includes(c.id);
            return (
              <label key={c.id} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const cur = form.getValues("categoryIds");
                    form.setValue(
                      "categoryIds",
                      e.target.checked
                        ? [...cur, c.id]
                        : cur.filter((x) => x !== c.id),
                    );
                  }}
                />
                {c.name}
              </label>
            );
          })}
        </div>
      </Field>

      <Field label="Imágenes (URLs)">
        <div className="space-y-2">
          {imgs.fields.map((f, i) => (
            <div key={f.id} className="flex gap-2">
              <Input
                {...form.register(`imageUrls.${i}.value`)}
                placeholder="https://…"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => imgs.remove(i)}
              >
                ×
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => imgs.append({ value: "" })}
          >
            + URL
          </Button>
        </div>
      </Field>

      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending}>
          Guardar
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => nav("/products")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
