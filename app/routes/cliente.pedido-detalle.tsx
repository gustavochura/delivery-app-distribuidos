import { Link, redirect, useLoaderData, useRouteLoaderData } from "react-router";
import { eq } from "drizzle-orm";
import { ArrowLeft, Home, ReceiptText, ShoppingCart, User } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { db } from "~/database/client.server";
import {
  pedidosTable,
  pedidoDetallesTable,
  seguimientoPedidosTable,
  repartidoresTable,
  usuariosTable,
  restaurantesTable,
} from "~/database/schema";
import { requireCliente } from "~/lib/roles.server";
import { MobileBottomNav, RoleShell, StatusBadge } from "~/components/delivery/common";
import { OrderItems, OrderSummary, OrderTimeline, TrackingButton } from "~/components/delivery/orders";
import type { Route } from "./+types/cliente.pedido-detalle";

const TIMELINE_STEPS = [
  { label: "Pedido creado", estado: "pedido_creado" },
  { label: "Restaurante acepto", estado: "aceptado" },
  { label: "En preparacion", estado: "en_preparacion" },
  { label: "Listo para recoger", estado: "listo" },
  { label: "Repartidor asignado", estado: "repartidor_asignado" },
  { label: "Pedido recogido", estado: "recogido" },
  { label: "En camino", estado: "en_camino" },
  { label: "Entregado", estado: "entregado" },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  const { profiles } = await requireCliente(request);
  const pedidoId = Number(params.pedido_id);

  const [pedido] = await db
    .select()
    .from(pedidosTable)
    .where(eq(pedidosTable.id, pedidoId))
    .limit(1);

  if (!pedido || pedido.clienteId !== profiles.cliente!.id) {
    throw redirect("/");
  }

  const [restaurante] = await db
    .select({ nombre: restaurantesTable.nombre })
    .from(restaurantesTable)
    .where(eq(restaurantesTable.id, pedido.restauranteId))
    .limit(1);

  const detalles = await db
    .select()
    .from(pedidoDetallesTable)
    .where(eq(pedidoDetallesTable.pedidoId, pedidoId));

  const seguimiento = await db
    .select()
    .from(seguimientoPedidosTable)
    .where(eq(seguimientoPedidosTable.pedidoId, pedidoId));

  const completedEstados = new Set(seguimiento.map((s) => s.estado));
  const steps = TIMELINE_STEPS.map((s) => ({ label: s.label, completado: completedEstados.has(s.estado) }));

  let repartidor = null;
  if (pedido.repartidorId) {
    const [rep] = await db
      .select({ nombre: usuariosTable.nombre })
      .from(repartidoresTable)
      .innerJoin(usuariosTable, eq(usuariosTable.id, repartidoresTable.usuarioId))
      .where(eq(repartidoresTable.id, pedido.repartidorId))
      .limit(1);
    repartidor = rep ?? null;
  }

  const enCamino = ["repartidor_asignado", "recogido", "en_camino"].includes(pedido.estado);

  return {
    pedido,
    restauranteNombre: restaurante?.nombre ?? "Restaurante",
    detalles,
    steps,
    repartidor,
    enCamino,
  };
}

export default function ClientePedidoDetalle() {
  const { pedido, restauranteNombre, detalles, steps, repartidor, enCamino } =
    useLoaderData<typeof loader>();
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
    <RoleShell
      title={`Pedido #${pedido.id}`}
      description={`${restauranteNombre} · ${pedido.createdAt}`}
      actions={
        <Button nativeButton={false} variant="outline" size="sm" render={<Link to="/cliente/pedidos" />}>
          <ArrowLeft className="size-4" /> Mis pedidos
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Estado actual</CardTitle></CardHeader>
            <CardContent>
              <StatusBadge status={pedido.estado} />
            </CardContent>
          </Card>
          <OrderTimeline steps={steps} />
          <OrderItems
            items={detalles.map((d) => ({
              productoNombre: d.productoNombre,
              cantidad: d.cantidad,
              precioUnitario: d.precioUnitario,
              subtotal: d.subtotal,
            }))}
          />
          {repartidor && (
            <Card>
              <CardHeader><CardTitle>Repartidor</CardTitle></CardHeader>
              <CardContent>
                <p className="font-medium">{repartidor.nombre}</p>
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-3">
          <OrderSummary
            subtotal={pedido.subtotal}
            costoEnvio={pedido.costoEnvio}
            total={pedido.total}
          />
          {enCamino && <TrackingButton pedidoId={pedido.id} />}
        </div>
      </div>
      <MobileBottomNav items={nav} />
    </RoleShell>
  );
}
