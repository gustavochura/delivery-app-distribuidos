import { Form, Link, redirect, useFetcher, useLoaderData, useNavigation } from "react-router";
import { and, count, eq, gte, inArray, sum } from "drizzle-orm";
import { DollarSign, PackageCheck } from "lucide-react";
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

  let pedidosDisponibles: {
    id: number;
    restauranteNombre: string;
    restauranteDireccion: string;
    clienteNombre: string;
    direccion: string;
    total: number;
  }[] = [];

  if (estado === "disponible" && !pedidoActivo) {
    pedidosDisponibles = await db
      .select({
        id: pedidosTable.id,
        restauranteNombre: restaurantesTable.nombre,
        restauranteDireccion: restaurantesTable.direccion,
        clienteNombre: usuariosTable.nombre,
        direccion: direccionesTable.direccion,
        total: pedidosTable.total,
      })
      .from(pedidosTable)
      .innerJoin(restaurantesTable, eq(restaurantesTable.id, pedidosTable.restauranteId))
      .innerJoin(clientesTable, eq(clientesTable.id, pedidosTable.clienteId))
      .innerJoin(usuariosTable, eq(usuariosTable.id, clientesTable.usuarioId))
      .innerJoin(direccionesTable, eq(direccionesTable.id, pedidosTable.direccionId))
      .where(inArray(pedidosTable.estado, ["listo", "buscando_repartidor"]))
      .limit(5);
  }

  return {
    nombre: usuario?.nombre ?? "Repartidor",
    estado,
    entregasHoy: stats?.entregasHoy ?? 0,
    gananciaHoy: stats?.gananciaHoy ?? 0,
    pedidoActivo: pedidoActivo ?? null,
    pedidosDisponibles,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const { profiles } = await requireRepartidor(request);
  const repartidorId = profiles.repartidor!.id;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "accept") {
    const pedidoId = Number(formData.get("pedido_id"));
    const [pedido] = await db
      .select({ estado: pedidosTable.estado })
      .from(pedidosTable)
      .where(eq(pedidosTable.id, pedidoId))
      .limit(1);

    if (!pedido || !["listo", "buscando_repartidor"].includes(pedido.estado)) return null;

    await db
      .update(pedidosTable)
      .set({ repartidorId, estado: "repartidor_asignado" })
      .where(eq(pedidosTable.id, pedidoId));

    await db.insert(seguimientoPedidosTable).values({
      pedidoId,
      estado: "repartidor_asignado",
      descripcion: "Repartidor asignado al pedido",
    });

    await db
      .update(repartidoresTable)
      .set({ estado: "ocupado" })
      .where(eq(repartidoresTable.id, repartidorId));

    return redirect(`/repartidor/pedidos/${pedidoId}/mapa`);
  }

  const estadoActual = profiles.repartidor!.estado;
  if (estadoActual === "ocupado") return null;

  await db
    .update(repartidoresTable)
    .set({ estado: estadoActual === "disponible" ? "no_disponible" : "disponible" })
    .where(eq(repartidoresTable.id, repartidorId));

  return null;
}

export default function RepartidorHome() {
  const { nombre, estado, entregasHoy, gananciaHoy, pedidoActivo, pedidosDisponibles } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigation = useNavigation();
  const disponible = estado === "disponible";
  const enEntrega = !!pedidoActivo;
  const isToggling = fetcher.state !== "idle";
  const isAccepting = navigation.state === "submitting";

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
          <StatsCard label="Completadas hoy" value={String(entregasHoy)} icon={PackageCheck} />
          <StatsCard label="Ganancia hoy" value={`S/ ${((Number(gananciaHoy) || 0) / 100).toFixed(2)}`} icon={DollarSign} />
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
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              {pedidosDisponibles.length > 0 ? "Pedidos disponibles" : "Sin pedidos disponibles aún"}
            </p>
            {pedidosDisponibles.map((pedido) => (
              <Card key={pedido.id}>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border p-3 text-sm space-y-0.5">
                    <p className="text-xs text-muted-foreground">Recoger en</p>
                    <p className="font-medium">{pedido.restauranteNombre}</p>
                    <p className="text-muted-foreground">{pedido.restauranteDireccion}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-sm space-y-0.5">
                    <p className="text-xs text-muted-foreground">Entregar a</p>
                    <p className="font-medium">{pedido.clienteNombre}</p>
                    <p className="text-muted-foreground">{pedido.direccion}</p>
                  </div>
                  <div className="md:col-span-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">S/ {(pedido.total / 100).toFixed(2)}</p>
                    <Form method="post">
                      <input type="hidden" name="intent" value="accept" />
                      <input type="hidden" name="pedido_id" value={pedido.id} />
                      <Button type="submit" size="sm" disabled={isAccepting}>
                        {isAccepting ? "Aceptando…" : "Aceptar pedido"}
                      </Button>
                    </Form>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RoleShell>
  );
}
