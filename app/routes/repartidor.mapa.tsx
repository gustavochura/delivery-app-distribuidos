import { useEffect, useState } from "react";
import { redirect, useFetcher, useLoaderData } from "react-router";
import { eq } from "drizzle-orm";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { db } from "~/database/client.server";
import {
  clientesTable,
  direccionesTable,
  pedidosTable,
  repartidoresTable,
  restaurantesTable,
  seguimientoPedidosTable,
  usuariosTable,
} from "~/database/schema";
import { requireRepartidor } from "~/lib/roles.server";
import { deleteDriverLocation, isRedisConfigured, saveDriverLocation } from "~/lib/redis.server";
import { RoleShell } from "~/components/delivery/common";
import type { DeliveryMapPoint } from "~/components/delivery/mapbox-delivery-map";
import { MapboxDeliveryMap } from "~/components/delivery/mapbox-delivery-map";
import type { Route } from "./+types/repartidor.mapa";

const NEXT_STATE: Record<string, { label: string; siguiente: string }> = {
  repartidor_asignado: { label: "Llegue al restaurante", siguiente: "recogido" },
  recogido: { label: "Pedido recogido — ir al cliente", siguiente: "en_camino" },
  en_camino: { label: "Pedido entregado", siguiente: "entregado" },
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const { profiles } = await requireRepartidor(request);
  const repartidorId = profiles.repartidor!.id;
  const pedidoId = Number(params.pedido_id);

  const [pedido] = await db
    .select()
    .from(pedidosTable)
    .where(eq(pedidosTable.id, pedidoId))
    .limit(1);

  if (!pedido || pedido.repartidorId !== repartidorId) throw redirect("/repartidor/home");

  const [restaurante] = await db
    .select({ nombre: restaurantesTable.nombre, direccion: restaurantesTable.direccion })
    .from(restaurantesTable)
    .where(eq(restaurantesTable.id, pedido.restauranteId))
    .limit(1);

  const [cliente] = await db
    .select({ nombre: usuariosTable.nombre })
    .from(clientesTable)
    .innerJoin(usuariosTable, eq(usuariosTable.id, clientesTable.usuarioId))
    .where(eq(clientesTable.id, pedido.clienteId))
    .limit(1);

  const [direccion] = await db
    .select()
    .from(direccionesTable)
    .where(eq(direccionesTable.id, pedido.direccionId))
    .limit(1);

  const nextStep = NEXT_STATE[pedido.estado] ?? null;

  return {
    pedido,
    restaurante,
    clienteNombre: cliente?.nombre ?? "Cliente",
    direccion,
    nextStep,
    redisConfigured: isRedisConfigured(),
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { profiles } = await requireRepartidor(request);
  const repartidorId = profiles.repartidor!.id;
  const pedidoId = Number(params.pedido_id);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const nuevoEstado = formData.get("estado") as string;

  const [pedido] = await db
    .select({ repartidorId: pedidosTable.repartidorId, estado: pedidosTable.estado })
    .from(pedidosTable)
    .where(eq(pedidosTable.id, pedidoId))
    .limit(1);

  if (!pedido || pedido.repartidorId !== repartidorId) return null;

  if (intent === "actualizar-ubicacion") {
    const latRaw = formData.get("lat");
    const lngRaw = formData.get("lng");
    const lat = typeof latRaw === "string" ? Number(latRaw) : NaN;
    const lng = typeof lngRaw === "string" ? Number(lngRaw) : NaN;
    const estadosConSeguimiento = [
      "repartidor_asignado",
      "recogido",
      "en_camino",
    ];

    if (
      !estadosConSeguimiento.includes(pedido.estado) ||
      latRaw === "" ||
      lngRaw === "" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return { saved: false };
    }

    return saveDriverLocation({ pedidoId, repartidorId, lat, lng });
  }

  const NEXT_STATE_VALID: Record<string, string> = {
    repartidor_asignado: "recogido",
    recogido: "en_camino",
    en_camino: "entregado",
  };
  if (NEXT_STATE_VALID[pedido.estado] !== nuevoEstado) return null;

  await db
    .update(pedidosTable)
    .set({ estado: nuevoEstado })
    .where(eq(pedidosTable.id, pedidoId));

  await db.insert(seguimientoPedidosTable).values({
    pedidoId,
    estado: nuevoEstado,
    descripcion: `Repartidor actualizó estado a ${nuevoEstado}`,
  });

  if (nuevoEstado === "entregado") {
    await deleteDriverLocation(pedidoId);
    await db
      .update(repartidoresTable)
      .set({ estado: "disponible" })
      .where(eq(repartidoresTable.id, repartidorId));
    return redirect("/repartidor/home");
  }

  return null;
}

function getCustomerPoint(
  direccion: Awaited<ReturnType<typeof loader>>["direccion"],
): DeliveryMapPoint | null {
  if (direccion?.latitud == null || direccion.longitud == null) return null;
  return { latitude: direccion.latitud, longitude: direccion.longitud };
}

export default function RepartidorMapa() {
  const {
    pedido,
    restaurante,
    clienteNombre,
    direccion,
    nextStep,
    redisConfigured,
  } = useLoaderData<typeof loader>();
  const stateFetcher = useFetcher();
  const locationFetcher = useFetcher();
  const submitLocation = locationFetcher.submit;
  const [driverPoint, setDriverPoint] = useState<DeliveryMapPoint | null>(null);
  const [locationStatus, setLocationStatus] = useState(
    redisConfigured
      ? "Esperando permiso de ubicación."
      : "Redis no esta configurado.",
  );
  const isSubmitting = stateFetcher.state === "submitting";
  const canShareLocation = [
    "repartidor_asignado",
    "recogido",
    "en_camino",
  ].includes(pedido.estado);
  const customerPoint = getCustomerPoint(direccion);

  useEffect(() => {
    if (!canShareLocation) {
      setLocationStatus("El seguimiento GPS no esta activo para este estado.");
      return;
    }

    if (!redisConfigured) {
      setLocationStatus("Redis no esta configurado.");
      return;
    }

    if (!("geolocation" in navigator)) {
      setLocationStatus("Este navegador no soporta geolocalizacion.");
      return;
    }

    let cancelled = false;

    function sendLocation() {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (cancelled) return;
          const point = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setDriverPoint(point);
          setLocationStatus("Enviando ubicacion al middleware Redis.");
          submitLocation(
            {
              intent: "actualizar-ubicacion",
              lat: String(point.latitude),
              lng: String(point.longitude),
            },
            { method: "post" },
          );
        },
        () => {
          if (!cancelled) {
            setLocationStatus("Permiso de ubicacion denegado o no disponible.");
          }
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
      );
    }

    sendLocation();
    const interval = window.setInterval(sendLocation, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [canShareLocation, redisConfigured, submitLocation]);

  useEffect(() => {
    if (locationFetcher.data && "saved" in locationFetcher.data) {
      setLocationStatus(
        locationFetcher.data.saved
          ? "Ubicacion enviada a Redis."
          : "No se pudo guardar la ubicacion en Redis.",
      );
    }
  }, [locationFetcher.data]);

  return (
    <RoleShell title="Mapa de entrega" description="Ruta hacia restaurante y cliente.">
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <MapboxDeliveryMap
          mode="repartidor"
          driver={driverPoint}
          customer={customerPoint}
        />
        <Card>
          <CardHeader><CardTitle>Accion actual</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Pedido #{pedido.id} — {pedido.estado.replaceAll("_", " ")}
            </p>
            <div className="rounded-lg border p-3 text-sm space-y-1">
              <p className="font-medium">{restaurante?.nombre}</p>
              <p className="text-muted-foreground">{restaurante?.direccion}</p>
            </div>
            <div className="rounded-lg border p-3 text-sm space-y-1">
              <p className="font-medium">{clienteNombre}</p>
              <p className="text-muted-foreground">{direccion?.direccion}</p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-medium">Middleware Redis</p>
              <p className="text-muted-foreground">{locationStatus}</p>
            </div>
            {nextStep && (
              <stateFetcher.Form method="post">
                <input type="hidden" name="estado" value={nextStep.siguiente} />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Actualizando…" : nextStep.label}
                </Button>
              </stateFetcher.Form>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleShell>
  );
}
