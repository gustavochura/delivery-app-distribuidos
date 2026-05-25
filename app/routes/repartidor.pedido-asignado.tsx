import { Form, redirect, useLoaderData, useNavigation } from "react-router";
import { eq, inArray } from "drizzle-orm";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { db } from "~/database/client.server";
import {
  clientesTable,
  direccionesTable,
  pedidosTable,
  restaurantesTable,
  seguimientoPedidosTable,
  repartidoresTable,
  usuariosTable,
} from "~/database/schema";
import { requireRepartidor } from "~/lib/roles.server";
import { EmptyState, RoleShell } from "~/components/delivery/common";
import type { Route } from "./+types/repartidor.pedido-asignado";

export async function loader({ request }: Route.LoaderArgs) {
  const { profiles } = await requireRepartidor(request);

  // Pedidos listos sin repartidor asignado (cola de disponibles)
  const pedidos = await db
    .select({
      id: pedidosTable.id,
      estado: pedidosTable.estado,
      total: pedidosTable.total,
      restauranteNombre: restaurantesTable.nombre,
      restauranteDireccion: restaurantesTable.direccion,
      clienteNombre: usuariosTable.nombre,
      direccion: direccionesTable.direccion,
    })
    .from(pedidosTable)
    .innerJoin(restaurantesTable, eq(restaurantesTable.id, pedidosTable.restauranteId))
    .innerJoin(clientesTable, eq(clientesTable.id, pedidosTable.clienteId))
    .innerJoin(usuariosTable, eq(usuariosTable.id, clientesTable.usuarioId))
    .innerJoin(direccionesTable, eq(direccionesTable.id, pedidosTable.direccionId))
    .where(inArray(pedidosTable.estado, ["listo", "buscando_repartidor"]))
    .limit(5);

  return { pedidos, repartidorId: profiles.repartidor!.id };
}

export async function action({ request }: Route.ActionArgs) {
  const { profiles } = await requireRepartidor(request);
  const repartidorId = profiles.repartidor!.id;
  const formData = await request.formData();
  const intent = formData.get("intent");
  const pedidoId = Number(formData.get("pedido_id"));

  if (intent === "accept") {
    const [pedido] = await db
      .select({ estado: pedidosTable.estado })
      .from(pedidosTable)
      .where(eq(pedidosTable.id, pedidoId))
      .limit(1);

    if (!pedido || !["listo", "buscando_repartidor"].includes(pedido.estado)) {
      return null;
    }

    await db
      .update(pedidosTable)
      .set({ repartidorId, estado: "repartidor_asignado" })
      .where(eq(pedidosTable.id, pedidoId));

    await db.insert(seguimientoPedidosTable).values({
      pedidoId,
      estado: "repartidor_asignado",
      descripcion: "Repartidor asignado al pedido",
    });

    // Set repartidor as busy
    await db
      .update(repartidoresTable)
      .set({ estado: "ocupado" })
      .where(eq(repartidoresTable.id, repartidorId));

    return redirect(`/repartidor/pedidos/${pedidoId}/mapa`);
  }

  return null;
}

export default function RepartidorPedidoAsignado() {
  const { pedidos } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  if (pedidos.length === 0) {
    return (
      <RoleShell title="Pedidos disponibles" description="No hay pedidos listos para recoger.">
        <EmptyState title="Sin pedidos" description="Espera a que un restaurante tenga un pedido listo." />
      </RoleShell>
    );
  }

  return (
    <RoleShell title="Pedidos disponibles" description="Acepta una entrega disponible.">
      <div className="space-y-4">
        {pedidos.map((pedido) => (
          <Card key={pedido.id}>
            <CardHeader><CardTitle>Pedido #{pedido.id}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Recoger en</p>
                <p className="font-medium">{pedido.restauranteNombre}</p>
                <p className="text-sm">{pedido.restauranteDireccion}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Entregar a</p>
                <p className="font-medium">{pedido.clienteNombre}</p>
                <p className="text-sm">{pedido.direccion}</p>
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-3">
                <Form method="post">
                  <input type="hidden" name="intent" value="accept" />
                  <input type="hidden" name="pedido_id" value={pedido.id} />
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Aceptando…" : "Aceptar pedido"}
                  </Button>
                </Form>
                <Button variant="outline" disabled>Rechazar</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </RoleShell>
  );
}
