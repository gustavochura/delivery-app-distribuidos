import { useEffect, useState } from "react";
import { Link, redirect, useFetcher, useLoaderData, useRouteLoaderData } from "react-router";
import { eq } from "drizzle-orm";
import { ArrowLeft, Home, ReceiptText, ShoppingCart, User } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { db } from "~/database/client.server";
import {
  pedidosTable,
  repartidoresTable,
  restaurantesTable,
  usuariosTable,
  direccionesTable,
} from "~/database/schema";
import { requireCliente } from "~/lib/roles.server";
import { getDriverLocation } from "~/lib/redis.server";
import { MobileBottomNav, RoleShell, StatusBadge } from "~/components/delivery/common";
import type { DeliveryMapPoint } from "~/components/delivery/mapbox-delivery-map";
import { MapboxDeliveryMap } from "~/components/delivery/mapbox-delivery-map";
import type { Route } from "./+types/cliente.seguimiento";

type LocationPollData = {
  redisConfigured: boolean;
  location: {
    lat: number;
    lng: number;
    repartidorId: number;
    pedidoId: number;
    updatedAt: string;
  } | null;
  estado: string;
  hasDriver: boolean;
};

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
    ubicacion = await getDriverLocation(pedidoId);
  }

  const [direccion] = await db
    .select()
    .from(direccionesTable)
    .where(eq(direccionesTable.id, pedido.direccionId))
    .limit(1);

  return { pedido, restaurante, repartidor, ubicacion, direccion };
}

function getPointFromDireccion(
  direccion: Awaited<ReturnType<typeof loader>>["direccion"],
): DeliveryMapPoint | null {
  if (direccion?.latitud == null || direccion.longitud == null) return null;
  return { latitude: direccion.latitud, longitude: direccion.longitud };
}

function getPointFromDbLocation(
  ubicacion: Awaited<ReturnType<typeof loader>>["ubicacion"],
): DeliveryMapPoint | null {
  if (!ubicacion) return null;
  return { latitude: ubicacion.lat, longitude: ubicacion.lng };
}

function formatUpdatedAt(value: string) {
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 1000));
  if (seconds < 5) return "actualizada ahora";
  if (seconds < 60) return `actualizada hace ${seconds} s`;
  return `actualizada hace ${Math.round(seconds / 60)} min`;
}

export default function ClienteSeguimiento() {
  const { pedido, repartidor, ubicacion, direccion } = useLoaderData<typeof loader>();
  const locationFetcher = useFetcher<LocationPollData>();
  const [driverPoint, setDriverPoint] = useState<DeliveryMapPoint | null>(
    getPointFromDbLocation(ubicacion),
  );
  const [locationStatus, setLocationStatus] = useState(
    repartidor
      ? "Esperando ubicacion del repartidor en Redis."
      : "Esperando que un repartidor tome el pedido.",
  );
  const customerPoint = getPointFromDireccion(direccion);
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

  useEffect(() => {
    if (!repartidor) return;

    let cancelled = false;
    const loadLocation = () => {
      if (cancelled) return;
      locationFetcher.load(`/cliente/pedidos/${pedido.id}/ubicacion`);
    };

    loadLocation();
    const interval = window.setInterval(loadLocation, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pedido.id, repartidor]);

  useEffect(() => {
    const data = locationFetcher.data;
    if (!data) return;

    if (!data.redisConfigured) {
      setLocationStatus("Redis no esta configurado.");
      return;
    }

    if (!data.hasDriver) {
      setLocationStatus("Esperando que un repartidor tome el pedido.");
      return;
    }

    if (!data.location) {
      setLocationStatus("Esperando ubicacion del repartidor en Redis.");
      return;
    }

    setDriverPoint({
      latitude: data.location.lat,
      longitude: data.location.lng,
    });
    setLocationStatus(formatUpdatedAt(data.location.updatedAt));
  }, [locationFetcher.data]);

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
        <MapboxDeliveryMap driver={driverPoint} customer={customerPoint} />
        <Card>
          <CardHeader>
            <CardTitle><StatusBadge status={pedido.estado} /></CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {repartidor
                ? "Tu repartidor esta camino a la dirección de entrega."
                : "Esperando que un repartidor tome el pedido."}
            </p>
            {repartidor && (
              <div className="rounded-lg border p-3">
                <p className="font-medium">{repartidor.nombre}</p>
                <p className="mt-1 text-sm text-muted-foreground">{locationStatus}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <MobileBottomNav items={nav} />
    </RoleShell>
  );
}
