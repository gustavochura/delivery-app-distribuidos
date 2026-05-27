import { Form, useLoaderData } from "react-router";
import { and, desc, eq, like } from "drizzle-orm";
import { db } from "~/database/client.server";
import { pedidosTable, restaurantesTable, usuariosTable, clientesTable } from "~/database/schema";
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
  const q = url.searchParams.get("q")?.trim() ?? "";

  const rows = await db
    .select({
      id: pedidosTable.id,
      estado: pedidosTable.estado,
      total: pedidosTable.total,
      createdAt: pedidosTable.createdAt,
      clienteNombre: usuariosTable.nombre,
      restauranteNombre: restaurantesTable.nombre,
    })
    .from(pedidosTable)
    .innerJoin(clientesTable, eq(clientesTable.id, pedidosTable.clienteId))
    .innerJoin(usuariosTable, eq(usuariosTable.id, clientesTable.usuarioId))
    .innerJoin(restaurantesTable, eq(restaurantesTable.id, pedidosTable.restauranteId))
    .where(
      and(
        eq(pedidosTable.restauranteId, restauranteId),
        estado ? eq(pedidosTable.estado, estado) : undefined,
        q ? like(usuariosTable.nombre, `%${q}%`) : undefined,
      ),
    )
    .orderBy(desc(pedidosTable.createdAt));

  const pedidos = rows.map((r) => ({
    id: r.id,
    restauranteNombre: r.restauranteNombre,
    createdAt: r.createdAt,
    estado: r.estado,
    total: r.total,
  }));

  return { pedidos, estadoActual: estado, q };
}

export default function RestaurantePedidos() {
  const { pedidos, estadoActual, q } = useLoaderData<typeof loader>();

  return (
    <RoleShell
      title="Pedidos"
      description="Gestiona y actualiza el estado de los pedidos."
    >
      <div className="space-y-5">
        <Form method="get">
          {estadoActual && <input type="hidden" name="estado" value={estadoActual} />}
          <SearchBar name="q" placeholder="Buscar por nombre de cliente" defaultValue={q} />
        </Form>
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
