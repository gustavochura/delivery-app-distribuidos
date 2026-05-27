import { redirect, useFetcher, useLoaderData } from "react-router";
import { and, eq, isNull } from "drizzle-orm";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { db } from "~/database/client.server";
import {
  clientesTable,
  direccionesTable,
  pedidoDetallesTable,
  pedidosTable,
  repartidoresTable,
  seguimientoPedidosTable,
  usuariosTable,
} from "~/database/schema";
import { requireRestauranteActive } from "~/lib/roles.server";
import { RoleShell, StatusBadge } from "~/components/delivery/common";
import { OrderItems, OrderSummary } from "~/components/delivery/orders";
import type { Route } from "./+types/restaurante.pedido-detalle";

const TRANSICIONES: Record<string, { label: string; siguiente: string; variant?: string }[]> = {
  pendiente: [
    { label: "Aceptar pedido", siguiente: "aceptado" },
    { label: "Rechazar pedido", siguiente: "rechazado", variant: "destructive" },
  ],
  aceptado: [{ label: "Marcar en preparacion", siguiente: "en_preparacion", variant: "secondary" }],
  en_preparacion: [{ label: "Marcar como listo", siguiente: "listo", variant: "outline" }],
};

const MENSAJE_ESTADO: Record<string, string> = {
  listo: "Esperando que un repartidor recoja el pedido.",
  repartidor_asignado: "Un repartidor fue asignado y viene en camino.",
  recogido: "El repartidor ya recogió el pedido.",
  en_camino: "El pedido está siendo entregado.",
  entregado: "Pedido entregado exitosamente.",
  rechazado: "Pedido rechazado.",
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const { activeRestauranteId: restauranteId } = await requireRestauranteActive(request);
  const pedidoId = Number(params.pedido_id);

  const [pedido] = await db
    .select()
    .from(pedidosTable)
    .where(eq(pedidosTable.id, pedidoId))
    .limit(1);

  if (!pedido || pedido.restauranteId !== restauranteId) throw redirect("/restaurante/pedidos");

  const detalles = await db
    .select()
    .from(pedidoDetallesTable)
    .where(eq(pedidoDetallesTable.pedidoId, pedidoId));

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

  let repartidoresDisponibles: { id: number; nombre: string }[] = [];
  if (pedido.estado === "listo" && !pedido.repartidorId) {
    repartidoresDisponibles = await db
      .select({ id: repartidoresTable.id, nombre: usuariosTable.nombre })
      .from(repartidoresTable)
      .innerJoin(usuariosTable, eq(usuariosTable.id, repartidoresTable.usuarioId))
      .where(eq(repartidoresTable.estado, "disponible"));
  }

  return { pedido, detalles, clienteNombre: cliente?.nombre ?? "Cliente", direccion, repartidoresDisponibles };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { activeRestauranteId: restauranteId } = await requireRestauranteActive(request);
  const pedidoId = Number(params.pedido_id);
  const formData = await request.formData();
  const intent = formData.get("intent");

  const [pedido] = await db
    .select({ restauranteId: pedidosTable.restauranteId, estado: pedidosTable.estado, repartidorId: pedidosTable.repartidorId })
    .from(pedidosTable)
    .where(eq(pedidosTable.id, pedidoId))
    .limit(1);

  if (!pedido || pedido.restauranteId !== restauranteId) throw redirect("/restaurante/pedidos");

  if (intent === "asignar-repartidor") {
    const repartidorId = Number(formData.get("repartidor_id"));

    try {
      await db.transaction(async (tx) => {
        const pedidoUpdated = await tx
          .update(pedidosTable)
          .set({ repartidorId, estado: "repartidor_asignado" })
          .where(and(
            eq(pedidosTable.id, pedidoId),
            eq(pedidosTable.estado, "listo"),
            isNull(pedidosTable.repartidorId),
          ))
          .returning({ id: pedidosTable.id });

        if (pedidoUpdated.length === 0) throw new Error("conflict");

        const repartidorUpdated = await tx
          .update(repartidoresTable)
          .set({ estado: "ocupado" })
          .where(and(
            eq(repartidoresTable.id, repartidorId),
            eq(repartidoresTable.estado, "disponible"),
          ))
          .returning({ id: repartidoresTable.id });

        if (repartidorUpdated.length === 0) throw new Error("conflict");

        await tx.insert(seguimientoPedidosTable).values({
          pedidoId,
          estado: "repartidor_asignado",
          descripcion: "Repartidor asignado por el restaurante",
        });
      });
    } catch {
      // El pedido ya fue tomado o el repartidor ya no está disponible
    }

    return null;
  }

  const nuevoEstado = formData.get("estado") as string;
  const TRANSICIONES_VALIDAS: Record<string, string[]> = {
    pendiente: ["aceptado", "rechazado"],
    aceptado: ["en_preparacion"],
    en_preparacion: ["listo"],
  };
  if (!TRANSICIONES_VALIDAS[pedido.estado]?.includes(nuevoEstado)) return null;

  await db
    .update(pedidosTable)
    .set({ estado: nuevoEstado })
    .where(eq(pedidosTable.id, pedidoId));

  await db.insert(seguimientoPedidosTable).values({
    pedidoId,
    estado: nuevoEstado,
    descripcion: `Estado actualizado a ${nuevoEstado}`,
  });

  return null;
}

export default function RestaurantePedidoDetalle() {
  const { pedido, detalles, clienteNombre, direccion, repartidoresDisponibles } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";
  const acciones = TRANSICIONES[pedido.estado] ?? [];
  const mensajeEstado = MENSAJE_ESTADO[pedido.estado];

  return (
    <RoleShell title={`Pedido #${pedido.id}`} description="Revisa productos, notas y cambia estado.">
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
            <CardContent>
              <p className="font-medium">{clienteNombre}</p>
              {direccion && (
                <p className="text-sm text-muted-foreground">{direccion.direccion}</p>
              )}
            </CardContent>
          </Card>
          <OrderItems
            items={detalles.map((d) => ({
              productoNombre: d.productoNombre,
              cantidad: d.cantidad,
              precioUnitario: d.precioUnitario,
              subtotal: d.subtotal,
            }))}
          />
          {pedido.notas && (
            <Card>
              <CardHeader><CardTitle>Notas</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">{pedido.notas}</CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-3">
          <Card>
            <CardContent className="flex items-center justify-between">
              <span>Estado</span>
              <StatusBadge status={pedido.estado} />
            </CardContent>
          </Card>
          <OrderSummary
            subtotal={pedido.subtotal}
            costoEnvio={pedido.costoEnvio}
            total={pedido.total}
          />
          {acciones.length > 0 ? (
            <div className="grid gap-2">
              {acciones.map((accion) => (
                <fetcher.Form key={accion.siguiente} method="post">
                  <input type="hidden" name="estado" value={accion.siguiente} />
                  <Button
                    type="submit"
                    className="w-full"
                    variant={(accion.variant as "destructive" | "secondary" | "outline") ?? "default"}
                    disabled={isSubmitting}
                  >
                    {accion.label}
                  </Button>
                </fetcher.Form>
              ))}
            </div>
          ) : mensajeEstado ? (
            <p className="text-sm text-muted-foreground">{mensajeEstado}</p>
          ) : null}
          {pedido.estado === "listo" && (
            <Card>
              <CardHeader><CardTitle>Asignar repartidor</CardTitle></CardHeader>
              <CardContent>
                {repartidoresDisponibles.length > 0 ? (
                  <fetcher.Form method="post" className="space-y-3">
                    <input type="hidden" name="intent" value="asignar-repartidor" />
                    <select
                      name="repartidor_id"
                      className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {repartidoresDisponibles.map((r) => (
                        <option key={r.id} value={r.id}>{r.nombre}</option>
                      ))}
                    </select>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      Asignar
                    </Button>
                  </fetcher.Form>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay repartidores disponibles ahora.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </RoleShell>
  );
}
