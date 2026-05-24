import { useLoaderData } from "react-router";
import { desc, eq } from "drizzle-orm";
import { db } from "~/database/client.server";
import {
  clientesTable,
  pedidosTable,
  repartidoresTable,
  restaurantesTable,
  usuariosTable,
} from "~/database/schema";
import { requireAdmin } from "~/lib/roles.server";
import { DataTable, RoleShell, SearchBar, StatusBadge } from "~/components/delivery/common";
import type { Route } from "./+types/admin.pedidos";

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);

  const clienteUsuario = usuariosTable;
  const repartidorAlias = repartidoresTable;

  const pedidos = await db
    .select({
      id: pedidosTable.id,
      estado: pedidosTable.estado,
      total: pedidosTable.total,
      createdAt: pedidosTable.createdAt,
      restauranteNombre: restaurantesTable.nombre,
      clienteNombre: clienteUsuario.nombre,
    })
    .from(pedidosTable)
    .innerJoin(restaurantesTable, eq(restaurantesTable.id, pedidosTable.restauranteId))
    .innerJoin(clientesTable, eq(clientesTable.id, pedidosTable.clienteId))
    .innerJoin(clienteUsuario, eq(clienteUsuario.id, clientesTable.usuarioId))
    .orderBy(desc(pedidosTable.createdAt))
    .limit(50);

  return { pedidos };
}

export default function AdminPedidos() {
  const { pedidos } = useLoaderData<typeof loader>();

  return (
    <RoleShell title="Gestion global de pedidos" description="Monitorea todos los pedidos del sistema.">
      <div className="space-y-5">
        <SearchBar placeholder="Buscar pedido, cliente o restaurante" />
        <DataTable
          columns={["Pedido", "Cliente", "Restaurante", "Estado", "Total", "Fecha"]}
          rows={pedidos.map((item) => [
            `#${item.id}`,
            item.clienteNombre,
            item.restauranteNombre,
            <StatusBadge key={item.id} status={item.estado} />,
            `S/ ${(item.total / 100).toFixed(2)}`,
            item.createdAt,
          ])}
        />
      </div>
    </RoleShell>
  );
}
