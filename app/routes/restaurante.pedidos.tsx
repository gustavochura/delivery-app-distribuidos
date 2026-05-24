import { useLoaderData } from "react-router";
import { and, desc, eq } from "drizzle-orm";
import { db } from "~/database/client.server";
import { pedidosTable, usuariosTable, clientesTable } from "~/database/schema";
import { requireRestauranteActive } from "~/lib/roles.server";
import { EmptyState, RoleShell, SearchBar } from "~/components/delivery/common";
import { OrderCard } from "~/components/delivery/orders";
import { Badge } from "~/components/ui/badge";
import type { Route } from "./+types/restaurante.pedidos";

const filters = [
  { label: "Nuevos",          value: "pendiente" },
  { label: "Aceptados",       value: "aceptado" },
  { label: "En preparación",  value: "en_preparacion" },
  { label: "Listos",          value: "listo" },
  { label: "Entregados",      value: "entregado" },
  { label: "Rechazados",      value: "rechazado" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { activeRestauranteId: restauranteId } = await requireRestauranteActive(request);

  const url = new URL(request.url);
  const estado = url.searchParams.get("estado");

  const rows = await db
    .select({
      id: pedidosTable.id,
      estado: pedidosTable.estado,
      total: pedidosTable.total,
      createdAt: pedidosTable.createdAt,
      clienteNombre: usuariosTable.nombre,
    })
    .from(pedidosTable)
    .innerJoin(clientesTable, eq(clientesTable.id, pedidosTable.clienteId))
    .innerJoin(usuariosTable, eq(usuariosTable.id, clientesTable.usuarioId))
    .where(
      estado
        ? and(eq(pedidosTable.restauranteId, restauranteId), eq(pedidosTable.estado, estado))
        : eq(pedidosTable.restauranteId, restauranteId),
    )
    .orderBy(desc(pedidosTable.createdAt));

  const pedidos = rows.map((r) => ({
    id: r.id,
    restauranteNombre: "",
    createdAt: r.createdAt,
    estado: r.estado,
    total: r.total,
  }));

  return { pedidos, estadoActual: estado };
}

export default function RestaurantePedidos() {
  const { pedidos, estadoActual } = useLoaderData<typeof loader>();

  return (
    <RoleShell
      title="Pedidos"
      description="Gestiona y actualiza el estado de los pedidos."
    >
      <div className="space-y-5">
        <SearchBar placeholder="Buscar pedido o cliente" />
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <a key={filter.value} href={`?estado=${filter.value === estadoActual ? "" : filter.value}`}>
              <Badge variant={estadoActual === filter.value ? "default" : "secondary"}>
                {filter.label}
              </Badge>
            </a>
          ))}
        </div>
        <div className="space-y-3">
          {pedidos.length === 0 ? (
            <EmptyState
              title="Sin pedidos"
              description={estadoActual ? `No hay pedidos con estado "${estadoActual}".` : "Aún no se han recibido pedidos."}
            />
          ) : (
            pedidos.map((item) => (
              <OrderCard key={item.id} item={item} href={`/restaurante/pedidos/${item.id}`} />
            ))
          )}
        </div>
      </div>
    </RoleShell>
  );
}
