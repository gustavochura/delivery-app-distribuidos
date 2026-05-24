import { Link, redirect, useLoaderData, useRouteLoaderData } from "react-router";
import { eq } from "drizzle-orm";
import { ArrowLeft, Home, ReceiptText, ShoppingCart, User } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { db } from "~/database/client.server";
import {
  pedidosTable,
  repartidoresTable,
  restaurantesTable,
  ubicacionesRepartidoresTable,
  usuariosTable,
  direccionesTable,
} from "~/database/schema";
import { requireCliente } from "~/lib/roles.server";
import { MobileBottomNav, RoleShell, StatusBadge } from "~/components/delivery/common";
import { MapboxDeliveryMap } from "~/components/delivery/mapbox-delivery-map";
import type { Route } from "./+types/cliente.seguimiento";

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
    .select({ nombre: restaurantesTable.nombre, direccion: restaurantesTable.direccion })
    .from(restaurantesTable)
    .where(eq(restaurantesTable.id, pedido.restauranteId))
    .limit(1);

  let repartidor = null;
  let ubicacion = null;

  if (pedido.repartidorId) {
    const [rep] = await db
      .select({ nombre: usuariosTable.nombre })
      .from(repartidoresTable)
      .innerJoin(usuariosTable, eq(usuariosTable.id, repartidoresTable.usuarioId))
      .where(eq(repartidoresTable.id, pedido.repartidorId))
      .limit(1);
    repartidor = rep ?? null;

    const [ub] = await db
      .select()
      .from(ubicacionesRepartidoresTable)
      .where(eq(ubicacionesRepartidoresTable.repartidorId, pedido.repartidorId))
      .limit(1);
    ubicacion = ub ?? null;
  }

  const [direccion] = await db
    .select()
    .from(direccionesTable)
    .where(eq(direccionesTable.id, pedido.direccionId))
    .limit(1);

  return { pedido, restaurante, repartidor, ubicacion, direccion };
}

export default function ClienteSeguimiento() {
  const { pedido, repartidor } = useLoaderData<typeof loader>();
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
      title="Seguimiento en mapa"
      description={`Pedido #${pedido.id}`}
      actions={
        <Button nativeButton={false} variant="outline" size="sm" render={<Link to={`/cliente/pedidos/${pedido.id}`} />}>
          <ArrowLeft className="size-4" /> Volver al pedido
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <MapboxDeliveryMap />
        <Card>
          <CardHeader>
            <CardTitle><StatusBadge status={pedido.estado} /></CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Tu repartidor esta camino a la direccion de entrega.
            </p>
            {repartidor && (
              <div className="rounded-lg border p-3">
                <p className="font-medium">{repartidor.nombre}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <MobileBottomNav items={nav} />
    </RoleShell>
  );
}
