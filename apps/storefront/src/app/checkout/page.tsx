"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { useCart } from "@/lib/cart/hooks";
import { useMe } from "@/lib/auth/hooks";
import { buildWompiRedirectUrl } from "@/lib/wompi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatCop } from "@/lib/format";
import Image from "next/image";
import type {
  OrderDTO,
  PaymentIntentDTO,
  ShippingOptionDTO,
} from "@bymariap/types";

const schema = z.object({
  fullName: z.string().min(2, "Requerido"),
  phone: z.string().min(7, "Requerido"),
  address: z.string().min(5, "Requerido"),
  city: z.string().min(2, "Requerido"),
  shippingZoneId: z.string().min(1, "Selecciona un método de envío"),
  notes: z.string().optional(),
  guestEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  guestPhone: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();
  const me = useMe();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      phone: "",
      address: "",
      city: "Medellín",
      shippingZoneId: "",
      notes: "",
      guestEmail: "",
      guestPhone: "",
    },
  });

  const { city, shippingZoneId } = form.watch();
  const shippingOptions = useQuery({
    queryKey: ["shipping", city],
    queryFn: () => api.get<ShippingOptionDTO[]>(endpoints.storeShipping(city)),
    enabled: city.length >= 2,
  });

  useEffect(() => {
    if (me.data) {
      form.setValue("fullName", me.data.fullName);
      form.setValue("phone", me.data.phone ?? "");
    }
  }, [me.data, form]);

  useEffect(() => {
    if (!cart.isLoading && (!cart.data || cart.data.items.length === 0)) {
      router.replace("/carrito");
    }
  }, [cart.isLoading, cart.data, router]);

  const selectedZone = shippingOptions.data?.find(
    (o) => o.id === shippingZoneId,
  );
  const shippingCost = selectedZone?.priceCop ?? 0;
  const total = (cart.data?.subtotal ?? 0) + shippingCost;

  async function onSubmit(values: FormValues) {
    try {
      if (!me.data && !values.guestEmail) {
        form.setError("guestEmail", {
          message: "Requerido para continuar sin cuenta",
        });
        return;
      }
      const order = await api.post<OrderDTO>(endpoints.storeOrders, {
        shippingZoneId: values.shippingZoneId,
        shippingAddress: {
          fullName: values.fullName,
          phone: values.phone,
          address: values.address,
          city: values.city,
          notes: values.notes || undefined,
        },
        guestEmail: me.data ? undefined : values.guestEmail,
        guestPhone: me.data ? undefined : values.guestPhone,
      });
      const intent = await api.get<PaymentIntentDTO>(
        endpoints.storePayIntent(order.reference),
      );
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const redirectUrl = `${siteUrl}/checkout/confirmacion?id=${order.reference}`;
      window.location.href = buildWompiRedirectUrl(intent, redirectUrl);
    } catch (e: unknown) {
      if (e instanceof ApiError && (e.body as { code?: string })?.code === "OUT_OF_STOCK") {
        toast.error("Uno de los productos quedó sin stock. Revisa tu carrito.");
      } else {
        toast.error(e instanceof Error ? e.message : "No se pudo crear la orden");
      }
    }
  }

  if (!cart.data)
    return (
      <div className="container py-20 text-center">
        <p className="text-sm font-body text-muted-foreground">Cargando…</p>
      </div>
    );

  return (
    <div className="container py-10">
      <h1 className="font-heading text-3xl font-semibold text-foreground mb-8">
        Finalizar Compra
      </h1>

      <div className="flex flex-col lg:flex-row gap-10 items-start">
        {/* ── Form ── */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex-1 space-y-8"
        >
          {/* Section 1 — Identificación y entrega */}
          <section className="space-y-5">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-body">
                1
              </span>
              Identificación y Entrega
            </h2>

            {!me.data && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <Label htmlFor="guestEmail">Correo electrónico</Label>
                  <Input
                    id="guestEmail"
                    type="email"
                    placeholder="tu@correo.com"
                    {...form.register("guestEmail")}
                  />
                  {form.formState.errors.guestEmail && (
                    <p className="text-xs text-destructive mt-1">
                      {form.formState.errors.guestEmail.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="guestPhone">Teléfono de contacto</Label>
                  <Input
                    id="guestPhone"
                    placeholder="+57 300 000 0000"
                    {...form.register("guestPhone")}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="fullName">Nombre completo</Label>
                <Input id="fullName" {...form.register("fullName")} />
                {form.formState.errors.fullName && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.fullName.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">Celular</Label>
                <Input id="phone" {...form.register("phone")} />
                {form.formState.errors.phone && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" {...form.register("address")} />
              {form.formState.errors.address && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.address.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="city">Ciudad</Label>
                <Input id="city" {...form.register("city")} />
                {form.formState.errors.city && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.city.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Input
                  id="notes"
                  {...form.register("notes")}
                  placeholder="Instrucciones de entrega…"
                />
              </div>
            </div>
          </section>

          {/* Section 2 — Método de envío */}
          <section className="space-y-4">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-body">
                2
              </span>
              Método de Envío
            </h2>
            {shippingOptions.isLoading && (
              <p className="text-sm font-body text-muted-foreground">
                Cargando opciones…
              </p>
            )}
            {shippingOptions.isError && (
              <p className="text-sm text-destructive">
                No se pudieron cargar las opciones de envío. Intenta de nuevo.
              </p>
            )}
            {shippingOptions.data?.map((opt) => (
              <label
                key={opt.id}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="radio"
                  value={opt.id}
                  {...form.register("shippingZoneId")}
                  className="accent-primary"
                />
                <span className="text-sm font-body text-foreground">
                  {opt.name}
                </span>
                <span className="ml-auto text-sm font-body text-muted-foreground">
                  {formatCop(opt.priceCop)}
                </span>
              </label>
            ))}
            {form.formState.errors.shippingZoneId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.shippingZoneId.message}
              </p>
            )}
          </section>

          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            aria-busy={form.formState.isSubmitting}
            className="w-full h-12 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {form.formState.isSubmitting ? "Procesando…" : "Pagar con Wompi"}
          </button>
        </form>

        {/* ── Order summary ── */}
        <aside className="w-full lg:w-80 shrink-0 lg:sticky lg:top-24">
          <div
            className="bg-white rounded-md p-6 space-y-4"
            style={{ boxShadow: "0 20px 40px rgba(48,51,46,0.05)" }}
          >
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Resumen de Orden
            </h2>
            {cart.data.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-sm overflow-hidden bg-muted shrink-0">
                  {item.productImageUrl && (
                    <Image
                      src={item.productImageUrl}
                      alt={item.productName}
                      width={60}
                      height={60}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-body font-medium text-foreground truncate">
                    {item.productName}
                  </p>
                  <p className="text-xs font-body text-muted-foreground">
                    ×{item.quantity}
                  </p>
                </div>
                <p className="text-xs font-body font-medium text-foreground shrink-0">
                  {formatCop(item.lineTotal)}
                </p>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between text-sm font-body">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">
                {formatCop(cart.data.subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-body">
              <span className="text-muted-foreground">Envío</span>
              <span className="text-foreground">
                {shippingCost > 0 ? formatCop(shippingCost) : "—"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between font-body">
              <span className="text-sm font-semibold text-foreground">
                Total
              </span>
              <span className="text-base font-semibold text-foreground">
                {formatCop(total)}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
