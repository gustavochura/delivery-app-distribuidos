import { Link, redirect, useFetcher, useLoaderData, useRouteLoaderData } from "react-router";
import { and, eq } from "drizzle-orm";
import { Home, Minus, Plus, ReceiptText, ShoppingCart, Trash2, User } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { db } from "~/database/client.server";
import {
  carritosTable,
  carritoDetallesTable,
  productosTable,
  restaurantesTable,
} from "~/database/schema";
import { requireCliente } from "~/lib/roles.server";
import { OrderSummary } from "~/components/delivery/orders";
import { EmptyState, MobileBottomNav, RoleShell } from "~/components/delivery/common";
import type { Route } from "./+types/cliente.carrito";

type CarritoItem = {
  id: number;
  productoId: number;
  nombre: string;
  imagen: string | null;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
};

type GrupoRestaurante = {
  carritoId: number;
  restauranteId: number;
  restauranteNombre: string;
  tarifaEnvio: number;
  items: CarritoItem[];
  subtotalGrupo: number;
};

export async function loader({ request }: Route.LoaderArgs) {
  const { profiles } = await requireCliente(request);
  const clienteId = profiles.cliente!.id;

  const carritos = await db
    .select()
    .from(carritosTable)
    .where(and(eq(carritosTable.clienteId, clienteId), eq(carritosTable.estado, "activo")));

  if (carritos.length === 0) {
    return { grupos: [], subtotal: 0, costoEnvio: 0, total: 0 };
  }

  const grupos: GrupoRestaurante[] = await Promise.all(
    carritos.map(async (carrito) => {
      const items = await db
        .select({
          id: carritoDetallesTable.id,
          productoId: carritoDetallesTable.productoId,
          cantidad: carritoDetallesTable.cantidad,
          precioUnitario: carritoDetallesTable.precioUnitario,
          subtotal: carritoDetallesTable.subtotal,
          nombre: productosTable.nombre,
          imagen: productosTable.imagen,
        })
        .from(carritoDetallesTable)
        .innerJoin(productosTable, eq(productosTable.id, carritoDetallesTable.productoId))
        .where(eq(carritoDetallesTable.carritoId, carrito.id));

      const [restaurante] = await db
        .select({ id: restaurantesTable.id, nombre: restaurantesTable.nombre, tarifaEnvio: restaurantesTable.tarifaEnvio })
        .from(restaurantesTable)
        .where(eq(restaurantesTable.id, carrito.restauranteId))
        .limit(1);

      return {
        carritoId: carrito.id,
        restauranteId: carrito.restauranteId,
        restauranteNombre: restaurante?.nombre ?? "Restaurante",
        tarifaEnvio: restaurante?.tarifaEnvio ?? 400,
        items,
        subtotalGrupo: items.reduce((acc, i) => acc + i.subtotal, 0),
      };
    }),
  );

  // Remove groups with no items (shouldn't happen, but guard)
  const gruposFiltrados = grupos.filter((g) => g.items.length > 0);
  const subtotal = gruposFiltrados.reduce((acc, g) => acc + g.subtotalGrupo, 0);
  const costoEnvio = gruposFiltrados.reduce((acc, g) => acc + g.tarifaEnvio, 0);

  return { grupos: gruposFiltrados, subtotal, costoEnvio, total: subtotal + costoEnvio };
}

export async function action({ request }: Route.ActionArgs) {
  const { profiles } = await requireCliente(request);
  const clienteId = profiles.cliente!.id;
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "update-qty") {
    const detalleId = Number(formData.get("detalle_id"));
    const cantidad = Number(formData.get("cantidad"));
    const precioUnitario = Number(formData.get("precio_unitario"));
    const [check] = await db
      .select({ id: carritoDetallesTable.id })
      .from(carritoDetallesTable)
      .innerJoin(carritosTable, eq(carritosTable.id, carritoDetallesTable.carritoId))
      .where(and(eq(carritoDetallesTable.id, detalleId), eq(carritosTable.clienteId, clienteId)))
      .limit(1);
    if (check) {
      await db
        .update(carritoDetallesTable)
        .set({ cantidad, subtotal: cantidad * precioUnitario })
        .where(eq(carritoDetallesTable.id, detalleId));
    }
  }

  if (intent === "remove-item") {
    const detalleId = Number(formData.get("detalle_id"));
    const [detalle] = await db
      .select({ carritoId: carritoDetallesTable.carritoId })
      .from(carritoDetallesTable)
      .innerJoin(carritosTable, eq(carritosTable.id, carritoDetallesTable.carritoId))
      .where(and(eq(carritoDetallesTable.id, detalleId), eq(carritosTable.clienteId, clienteId)))
      .limit(1);
    if (detalle) {
      await db.delete(carritoDetallesTable).where(eq(carritoDetallesTable.id, detalleId));
      const restantes = await db
        .select({ id: carritoDetallesTable.id })
        .from(carritoDetallesTable)
        .where(eq(carritoDetallesTable.carritoId, detalle.carritoId))
        .limit(1);
      if (restantes.length === 0) {
        await db.update(carritosTable).set({ estado: "cancelado" }).where(eq(carritosTable.id, detalle.carritoId));
      }
    }
  }

  if (intent === "clear-restaurante") {
    const carritoId = Number(formData.get("carrito_id"));
    const [carrito] = await db
      .select({ id: carritosTable.id })
      .from(carritosTable)
      .where(and(eq(carritosTable.id, carritoId), eq(carritosTable.clienteId, clienteId)))
      .limit(1);
    if (carrito) {
      await db.delete(carritoDetallesTable).where(eq(carritoDetallesTable.carritoId, carrito.id));
      await db.update(carritosTable).set({ estado: "cancelado" }).where(eq(carritosTable.id, carrito.id));
    }
  }

  if (intent === "clear-all") {
    const carritos = await db
      .select({ id: carritosTable.id })
      .from(carritosTable)
      .where(and(eq(carritosTable.clienteId, clienteId), eq(carritosTable.estado, "activo")));
    for (const c of carritos) {
      await db.delete(carritoDetallesTable).where(eq(carritoDetallesTable.carritoId, c.id));
      await db.update(carritosTable).set({ estado: "cancelado" }).where(eq(carritosTable.id, c.id));
    }
    return redirect("/");
  }

  return null;
}

function useClienteNav() {
  const layout = useRouteLoaderData("routes/layouts/cliente") as
    | { carritoCount: number; availableRoles: { key: string }[] }
    | undefined;
  const carritoCount = layout?.carritoCount ?? 0;
  const availableRoles = layout?.availableRoles ?? [];
  return [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/cliente/carrito", label: "Carrito", icon: ShoppingCart, badge: carritoCount },
    { href: "/cliente/pedidos", label: "Pedidos", icon: ReceiptText },
    ...(availableRoles.length > 1 ? [{ href: "/dashboard", label: "Roles", icon: User }] : []),
  ];
}

export default function ClienteCarrito() {
  const { grupos, subtotal, costoEnvio, total } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const isBusy = fetcher.state !== "idle";
  const nav = useClienteNav();

  if (grupos.length === 0) {
    return (
      <RoleShell title="Carrito" description="Tu carrito esta vacio.">
        <EmptyState title="Carrito vacio" description="Agrega productos de cualquier restaurante para comenzar." />
        <MobileBottomNav items={nav} />
      </RoleShell>
    );
  }

  return (
    <RoleShell title="Carrito" description={`${grupos.length} restaurante${grupos.length > 1 ? "s" : ""} seleccionado${grupos.length > 1 ? "s" : ""}`}>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {grupos.map((grupo) => (
            <Card key={grupo.carritoId}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="text-base">
                  <Link to={`/cliente/restaurantes/${grupo.restauranteId}`} className="hover:underline">
                    {grupo.restauranteNombre}
                  </Link>
                </CardTitle>
                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="clear-restaurante" />
                  <input type="hidden" name="carrito_id" value={grupo.carritoId} />
                  <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" disabled={isBusy}>
                    Vaciar
                  </Button>
                </fetcher.Form>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {grupo.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <img
                      className="size-14 rounded-lg object-cover shrink-0"
                      src={item.imagen ?? "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200"}
                      alt={item.nombre}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{item.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        S/ {(item.precioUnitario / 100).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <fetcher.Form method="post">
                        <input type="hidden" name="intent" value="update-qty" />
                        <input type="hidden" name="detalle_id" value={item.id} />
                        <input type="hidden" name="cantidad" value={Math.max(1, item.cantidad - 1)} />
                        <input type="hidden" name="precio_unitario" value={item.precioUnitario} />
                        <Button type="submit" variant="outline" size="icon-sm" disabled={isBusy || item.cantidad <= 1}>
                          <Minus />
                        </Button>
                      </fetcher.Form>
                      <span className="w-5 text-center text-sm">{item.cantidad}</span>
                      <fetcher.Form method="post">
                        <input type="hidden" name="intent" value="update-qty" />
                        <input type="hidden" name="detalle_id" value={item.id} />
                        <input type="hidden" name="cantidad" value={item.cantidad + 1} />
                        <input type="hidden" name="precio_unitario" value={item.precioUnitario} />
                        <Button type="submit" variant="outline" size="icon-sm" disabled={isBusy}>
                          <Plus />
                        </Button>
                      </fetcher.Form>
                    </div>
                    <fetcher.Form method="post">
                      <input type="hidden" name="intent" value="remove-item" />
                      <input type="hidden" name="detalle_id" value={item.id} />
                      <Button type="submit" variant="ghost" size="icon-sm" disabled={isBusy}>
                        <Trash2 />
                      </Button>
                    </fetcher.Form>
                  </div>
                ))}
                <div className="border-t pt-2 text-right text-sm text-muted-foreground">
                  Subtotal: <span className="font-medium text-foreground">S/ {(grupo.subtotalGrupo / 100).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-3">
          <OrderSummary subtotal={subtotal} costoEnvio={costoEnvio} total={total} />
          <Button nativeButton={false} className="w-full" render={<Link to="/cliente/checkout" />}>
            Confirmar pedidos ({grupos.length})
          </Button>
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="clear-all" />
            <Button type="submit" variant="outline" className="w-full" disabled={isBusy}>
              Vaciar todo
            </Button>
          </fetcher.Form>
        </div>
      </div>
      <MobileBottomNav items={nav} />
    </RoleShell>
  );
}
