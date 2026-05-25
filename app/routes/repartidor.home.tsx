import { Link, useFetcher, useLoaderData } from "react-router";
import { and, count, eq, gte, inArray, sum } from "drizzle-orm";
import { DollarSign, PackageCheck } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { db } from "~/database/client.server";
import {
  pedidosTable,
  repartidoresTable,
  restaurantesTable,
  seguimientoPedidosTable,
  usuariosTable,
} from "~/database/schema";
import { requireRepartidor } from "~/lib/roles.server";
import { RoleShell, StatsCard } from "~/components/delivery/common";
import type { Route } from "./+types/repartidor.home";

export async function loader({ request }: Route.LoaderArgs) {
  const { profiles } = await requireRepartidor(request);
  const repartidorId = profiles.repartidor!.id;
  const estado = profiles.repartidor!.estado;

  const [usuario] = await db
    .select({ nombre: usuariosTable.nombre })
    .from(usuariosTable)
    .where(eq(usuariosTable.id, profiles.usuario.id))
    .limit(1);

  const todayStr = new Date().toISOString().slice(0, 10) + " 00:00:00";
  const [stats] = await db
    .select({ entregasHoy: count(), gananciaHoy: sum(pedidosTable.costoEnvio) })
    .from(seguimientoPedidosTable)
    .innerJoin(pedidosTable, eq(pedidosTable.id, seguimientoPedidosTable.pedidoId))
    .where(
      and(
        eq(pedidosTable.repartidorId, repartidorId),
        eq(seguimientoPedidosTable.estado, "entregado"),
        gte(seguimientoPedidosTable.createdAt, todayStr),
      ),
    );

  // Active order assigned to this repartidor
  const [pedidoActivo] = await db
    .select({
      id: pedidosTable.id,
      estado: pedidosTable.estado,
      restauranteNombre: restaurantesTable.nombre,
    })
    .from(pedidosTable)
    .innerJoin(restaurantesTable, eq(restaurantesTable.id, pedidosTable.restauranteId))
    .where(
      and(
        eq(pedidosTable.repartidorId, repartidorId),
        inArray(pedidosTable.estado, ["repartidor_asignado", "recogido", "en_camino"]),
      ),
    )
    .limit(1);

  return {
    nombre: usuario?.nombre ?? "Repartidor",
    estado,
    entregasHoy: stats?.entregasHoy ?? 0,
    gananciaHoy: stats?.gananciaHoy ?? 0,
    pedidoActivo: pedidoActivo ?? null,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const { profiles } = await requireRepartidor(request);
  const repartidorId = profiles.repartidor!.id;
  const estadoActual = profiles.repartidor!.estado;

  if (estadoActual === "ocupado") return null;

  await db
    .update(repartidoresTable)
    .set({ estado: estadoActual === "disponible" ? "no_disponible" : "disponible" })
    .where(eq(repartidoresTable.id, repartidorId));

  return null;
}

export default function RepartidorHome() {
  const { nombre, estado, entregasHoy, gananciaHoy, pedidoActivo } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const disponible = estado === "disponible";
  const enEntrega = !!pedidoActivo;
  const isToggling = fetcher.state !== "idle";

  return (
    <RoleShell
      title={`Hola, ${nombre.split(" ")[0]}`}
      description="Activa tu disponibilidad y toma pedidos asignados."
    >
      <div className="space-y-5">
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium">Estado actual</p>
              <p className="text-sm text-muted-foreground">
                {enEntrega ? "En entrega" : disponible ? "Disponible para recibir pedidos" : "No disponible"}
              </p>
            </div>
            <fetcher.Form method="post">
              <Button
                type="submit"
                variant={disponible && !enEntrega ? "default" : "outline"}
                disabled={isToggling || enEntrega}
              >
                {enEntrega ? "En entrega" : disponible ? "Disponible" : "No disponible"}
              </Button>
            </fetcher.Form>
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <StatsCard label="Entregas hoy" value={String(entregasHoy)} icon={PackageCheck} />
          <StatsCard label="Ganancia hoy" value={`S/ ${((gananciaHoy ?? 0) / 100).toFixed(2)}`} icon={DollarSign} />
        </div>
        {pedidoActivo && (
          <Card>
            <CardHeader><CardTitle>Pedido actual</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium">Pedido #{pedidoActivo.id}</p>
                <p className="text-sm text-muted-foreground">{pedidoActivo.restauranteNombre}</p>
              </div>
              <Button nativeButton={false} render={<Link to={`/repartidor/pedidos/${pedidoActivo.id}/mapa`} />}>
                Ver mapa
              </Button>
            </CardContent>
          </Card>
        )}
        {!pedidoActivo && disponible && (
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium">Sin pedido asignado</p>
                <p className="text-sm text-muted-foreground">Esperando pedidos disponibles</p>
              </div>
              <Button nativeButton={false} render={<Link to="/repartidor/pedidos/asignado" />}>
                Ver disponibles
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </RoleShell>
  );
}
