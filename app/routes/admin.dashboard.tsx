import { useLoaderData } from "react-router";
import { and, count, eq, gte, inArray } from "drizzle-orm";
import { Bike, PackageCheck, Store, Users } from "lucide-react";
import { db } from "~/database/client.server";
import {
  clientesTable,
  pedidosTable,
  repartidoresTable,
  restaurantesTable,
  usuariosTable,
} from "~/database/schema";
import { requireAdmin } from "~/lib/roles.server";
import { ChartPlaceholder, DataTable, RoleShell, StatsCard, StatusBadge } from "~/components/delivery/common";
import type { Route } from "./+types/admin.dashboard";

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    [{ totalUsuarios }],
    [{ totalRestaurantes }],
    [{ totalRepartidores }],
    [{ pedidosActivos }],
    pedidosRecientes,
  ] = await Promise.all([
    db.select({ totalUsuarios: count() }).from(usuariosTable),
    db.select({ totalRestaurantes: count() }).from(restaurantesTable).where(eq(restaurantesTable.activo, true)),
    db.select({ totalRepartidores: count() }).from(repartidoresTable),
    db
      .select({ pedidosActivos: count() })
      .from(pedidosTable)
      .where(
        and(
          gte(pedidosTable.createdAt, today.toISOString()),
          inArray(pedidosTable.estado, [
            "pendiente", "aceptado", "en_preparacion", "listo",
            "repartidor_asignado", "recogido", "en_camino",
          ]),
        ),
      ),
    db
      .select({
        id: pedidosTable.id,
        estado: pedidosTable.estado,
        total: pedidosTable.total,
        createdAt: pedidosTable.createdAt,
        restauranteNombre: restaurantesTable.nombre,
        clienteNombre: usuariosTable.nombre,
      })
      .from(pedidosTable)
      .innerJoin(restaurantesTable, eq(restaurantesTable.id, pedidosTable.restauranteId))
      .innerJoin(clientesTable, eq(clientesTable.id, pedidosTable.clienteId))
      .innerJoin(usuariosTable, eq(usuariosTable.id, clientesTable.usuarioId))
      .limit(10),
  ]);

  return {
    stats: { totalUsuarios, totalRestaurantes, totalRepartidores, pedidosActivos },
    pedidosRecientes,
  };
}

export default function AdminDashboard() {
  const { stats, pedidosRecientes } = useLoaderData<typeof loader>();

  const statCards = [
    { label: "Usuarios", value: String(stats.totalUsuarios), icon: Users },
    { label: "Restaurantes", value: String(stats.totalRestaurantes), icon: Store },
    { label: "Repartidores", value: String(stats.totalRepartidores), icon: Bike },
    { label: "Pedidos activos", value: String(stats.pedidosActivos), icon: PackageCheck },
  ];

  return (
    <RoleShell title="Dashboard general" description="Vista global del sistema de delivery.">
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-4">
          {statCards.map((stat) => (
            <StatsCard key={stat.label} {...stat} />
          ))}
        </div>
        <ChartPlaceholder />
        <DataTable
          columns={["Pedido", "Cliente", "Restaurante", "Estado", "Total"]}
          rows={pedidosRecientes.map((item) => [
            `#${item.id}`,
            item.clienteNombre,
            item.restauranteNombre,
            <StatusBadge key={item.id} status={item.estado} />,
            `S/ ${(item.total / 100).toFixed(2)}`,
          ])}
        />
      </div>
    </RoleShell>
  );
}
