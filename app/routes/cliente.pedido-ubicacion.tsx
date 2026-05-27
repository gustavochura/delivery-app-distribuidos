import { data, redirect } from "react-router";
import { eq } from "drizzle-orm";
import { db } from "~/database/client.server";
import { pedidosTable } from "~/database/schema";
import { getDriverLocation, isRedisConfigured } from "~/lib/redis.server";
import { requireCliente } from "~/lib/roles.server";

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { pedido_id?: string };
}) {
  const { profiles } = await requireCliente(request);
  const pedidoId = Number(params.pedido_id);

  const [pedido] = await db
    .select({
      id: pedidosTable.id,
      clienteId: pedidosTable.clienteId,
      repartidorId: pedidosTable.repartidorId,
      estado: pedidosTable.estado,
    })
    .from(pedidosTable)
    .where(eq(pedidosTable.id, pedidoId))
    .limit(1);

  if (!pedido || pedido.clienteId !== profiles.cliente!.id) {
    throw redirect("/");
  }

  const location = await getDriverLocation(pedido.id);

  return data({
    redisConfigured: isRedisConfigured(),
    location,
    estado: pedido.estado,
    hasDriver: pedido.repartidorId !== null,
  });
}
