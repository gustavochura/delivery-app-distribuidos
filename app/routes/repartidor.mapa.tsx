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
import { RoleShell } from "~/components/delivery/common";
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

  return { pedido, restaurante, clienteNombre: cliente?.nombre ?? "Cliente", direccion, nextStep };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { profiles } = await requireRepartidor(request);
  const repartidorId = profiles.repartidor!.id;
  const pedidoId = Number(params.pedido_id);
  const formData = await request.formData();
  const nuevoEstado = formData.get("estado") as string;

  const [pedido] = await db
    .select({ repartidorId: pedidosTable.repartidorId })
    .from(pedidosTable)
    .where(eq(pedidosTable.id, pedidoId))
    .limit(1);

  if (!pedido || pedido.repartidorId !== repartidorId) return null;

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
    await db
      .update(repartidoresTable)
      .set({ estado: "disponible" })
      .where(eq(repartidoresTable.id, repartidorId));
    return redirect("/repartidor/home");
  }

  return null;
}

export default function RepartidorMapa() {
  const { pedido, restaurante, clienteNombre, direccion, nextStep } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";

  return (
    <RoleShell title="Mapa de entrega" description="Ruta hacia restaurante y cliente.">
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <MapboxDeliveryMap mode="repartidor" />
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
            {nextStep && (
              <fetcher.Form method="post">
                <input type="hidden" name="estado" value={nextStep.siguiente} />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Actualizando…" : nextStep.label}
                </Button>
              </fetcher.Form>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleShell>
  );
}
