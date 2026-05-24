import { Form, redirect, useLoaderData, useNavigation, useRouteLoaderData } from "react-router";
import { and, eq } from "drizzle-orm";
import { Home, ReceiptText, ShoppingCart, User } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { db } from "~/database/client.server";
import {
  carritosTable,
  carritoDetallesTable,
  direccionesTable,
  pagosTable,
  pedidoDetallesTable,
  pedidosTable,
  productosTable,
  restaurantesTable,
  seguimientoPedidosTable,
} from "~/database/schema";
import { requireCliente } from "~/lib/roles.server";
import { MobileBottomNav, RoleShell } from "~/components/delivery/common";
import type { Route } from "./+types/cliente.checkout";

export async function loader({ request }: Route.LoaderArgs) {
  const { profiles } = await requireCliente(request);
  const clienteId = profiles.cliente!.id;

  const carritos = await db
    .select()
    .from(carritosTable)
    .where(and(eq(carritosTable.clienteId, clienteId), eq(carritosTable.estado, "activo")));

  if (carritos.length === 0) throw redirect("/cliente/carrito");

  const grupos = await Promise.all(
    carritos.map(async (carrito) => {
      const items = await db
        .select({
          productoId: carritoDetallesTable.productoId,
          nombre: productosTable.nombre,
          cantidad: carritoDetallesTable.cantidad,
          precioUnitario: carritoDetallesTable.precioUnitario,
          subtotal: carritoDetallesTable.subtotal,
        })
        .from(carritoDetallesTable)
        .innerJoin(productosTable, eq(productosTable.id, carritoDetallesTable.productoId))
        .where(eq(carritoDetallesTable.carritoId, carrito.id));

      const [restaurante] = await db
        .select({ nombre: restaurantesTable.nombre, tarifaEnvio: restaurantesTable.tarifaEnvio })
        .from(restaurantesTable)
        .where(eq(restaurantesTable.id, carrito.restauranteId))
        .limit(1);

      const subtotalGrupo = items.reduce((acc, i) => acc + i.subtotal, 0);
      const tarifaEnvio = restaurante?.tarifaEnvio ?? 400;
      return { carritoId: carrito.id, restauranteId: carrito.restauranteId, restauranteNombre: restaurante?.nombre ?? "Restaurante", items, subtotalGrupo, tarifaEnvio };
    }),
  );

  const direcciones = await db
    .select()
    .from(direccionesTable)
    .where(eq(direccionesTable.clienteId, clienteId));

  const gruposFiltrados = grupos.filter((g) => g.items.length > 0);
  const subtotal = gruposFiltrados.reduce((acc, g) => acc + g.subtotalGrupo, 0);
  const costoEnvio = gruposFiltrados.reduce((acc, g) => acc + g.tarifaEnvio, 0);
  const total = subtotal + costoEnvio;

  return { grupos: gruposFiltrados, direcciones, subtotal, costoEnvio, total };
}

export async function action({ request }: Route.ActionArgs) {
  const { profiles } = await requireCliente(request);
  const clienteId = profiles.cliente!.id;
  const formData = await request.formData();

  const direccionId = Number(formData.get("direccion_id"));
  const metodo = (formData.get("metodo") as string) ?? "efectivo";
  const notas = (formData.get("notas") as string) || null;

  const carritos = await db
    .select()
    .from(carritosTable)
    .where(and(eq(carritosTable.clienteId, clienteId), eq(carritosTable.estado, "activo")));

  if (carritos.length === 0) throw redirect("/cliente/carrito");

  const pedidoIds: number[] = [];

  for (const carrito of carritos) {
    const items = await db
      .select({
        productoId: carritoDetallesTable.productoId,
        nombre: productosTable.nombre,
        cantidad: carritoDetallesTable.cantidad,
        precioUnitario: carritoDetallesTable.precioUnitario,
        subtotal: carritoDetallesTable.subtotal,
      })
      .from(carritoDetallesTable)
      .innerJoin(productosTable, eq(productosTable.id, carritoDetallesTable.productoId))
      .where(eq(carritoDetallesTable.carritoId, carrito.id));

    if (items.length === 0) continue;

    const [restauranteInfo] = await db
      .select({ tarifaEnvio: restaurantesTable.tarifaEnvio })
      .from(restaurantesTable)
      .where(eq(restaurantesTable.id, carrito.restauranteId))
      .limit(1);
    const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0);
    const costoEnvio = restauranteInfo?.tarifaEnvio ?? 400;
    const total = subtotal + costoEnvio;

    const [pedido] = await db
      .insert(pedidosTable)
      .values({
        clienteId,
        restauranteId: carrito.restauranteId,
        direccionId,
        estado: "pendiente",
        subtotal,
        costoEnvio,
        total,
        notas,
      })
      .returning({ id: pedidosTable.id });

    await db.insert(pedidoDetallesTable).values(
      items.map((i) => ({
        pedidoId: pedido.id,
        productoId: i.productoId,
        productoNombre: i.nombre,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        subtotal: i.subtotal,
      })),
    );

    await db.insert(pagosTable).values({ pedidoId: pedido.id, monto: total, metodo, estado: "pendiente" });

    await db.insert(seguimientoPedidosTable).values({
      pedidoId: pedido.id,
      estado: "pedido_creado",
      descripcion: "Pedido creado por el cliente",
    });

    await db.update(carritosTable).set({ estado: "completado" }).where(eq(carritosTable.id, carrito.id));

    pedidoIds.push(pedido.id);
  }

  return redirect(`/cliente/pedidos/${pedidoIds[0]}`);
}

export default function ClienteCheckout() {
  const { grupos, direcciones, subtotal, costoEnvio, total } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const principal = direcciones.find((d) => d.principal) ?? direcciones[0];
  const layout = useRouteLoaderData("routes/layouts/cliente") as
    | { carritoCount: number; availableRoles: { key: string }[] }
    | undefined;
  const carritoCount = layout?.carritoCount ?? 0;
  const availableRoles = layout?.availableRoles ?? [];
  const nav = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/cliente/carrito", label: "Carrito", icon: ShoppingCart, badge: carritoCount },
    { href: "/cliente/pedidos", label: "Pedidos", icon: ReceiptText },
    ...(availableRoles.length > 1 ? [{ href: "/dashboard", label: "Roles", icon: User }] : []),
  ];

  return (
    <RoleShell title="Confirmar pedidos" description={`${grupos.length} pedido${grupos.length > 1 ? "s" : ""} a confirmar`}>
      <Form method="post">
        <input type="hidden" name="direccion_id" value={principal?.id ?? ""} />
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Resumen por restaurante</CardTitle></CardHeader>
              <CardContent className="divide-y p-0">
                {grupos.map((g) => (
                  <div key={g.carritoId} className="px-6 py-4">
                    <p className="mb-3 font-semibold">{g.restauranteNombre}</p>
                    <div className="space-y-1.5">
                      {g.items.map((item) => (
                        <div key={item.productoId} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.nombre}
                            <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground">
                              x{item.cantidad}
                            </span>
                          </span>
                          <span className="tabular-nums">S/ {(item.subtotal / 100).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 space-y-1 border-t pt-3 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal productos</span>
                        <span className="tabular-nums">S/ {(g.subtotalGrupo / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Envío</span>
                        <span className="tabular-nums">S/ {(g.tarifaEnvio / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1 font-semibold">
                        <span>Total</span>
                        <span className="tabular-nums">S/ {((g.subtotalGrupo + g.tarifaEnvio) / 100).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Direccion de entrega</CardTitle></CardHeader>
              <CardContent>
                {principal ? (
                  <>
                    <p>{principal.direccion}</p>
                    {principal.referencia && (
                      <p className="mt-1 text-sm text-muted-foreground">Ref: {principal.referencia}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No tienes direcciones guardadas.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Metodo de pago</CardTitle></CardHeader>
              <CardContent>
                <select
                  name="metodo"
                  className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="yape">Yape/Plin</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Instrucciones para el repartidor</CardTitle></CardHeader>
              <CardContent>
                <textarea
                  name="notas"
                  className="min-h-24 w-full rounded-lg border bg-transparent p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Ej. llamar al llegar"
                />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-3">
            <Card>
              <CardContent className="space-y-2 py-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal productos</span>
                  <span>S/ {(subtotal / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Envío ({grupos.length} restaurante{grupos.length > 1 ? "s" : ""})</span>
                  <span>S/ {(costoEnvio / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total</span>
                  <span>S/ {(total / 100).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
            <Button type="submit" className="w-full" disabled={!principal || isSubmitting}>
              {isSubmitting ? "Procesando…" : `Confirmar ${grupos.length > 1 ? `${grupos.length} pedidos` : "pedido"}`}
            </Button>
          </div>
        </div>
      </Form>
      <MobileBottomNav items={nav} />
    </RoleShell>
  );
}
