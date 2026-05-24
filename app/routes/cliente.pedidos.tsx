import { Link, useLoaderData, useRouteLoaderData } from "react-router";
import { desc, eq } from "drizzle-orm";
import { Home, ReceiptText, ShoppingCart, User } from "lucide-react";
import { db } from "~/database/client.server";
import { pedidosTable, restaurantesTable } from "~/database/schema";
import { requireCliente } from "~/lib/roles.server";
import { EmptyState, MobileBottomNav, RoleShell, StatusBadge } from "~/components/delivery/common";
import { Card, CardContent } from "~/components/ui/card";
import type { Route } from "./+types/cliente.pedidos";

export async function loader({ request }: Route.LoaderArgs) {
  const { profiles } = await requireCliente(request);

  const pedidos = await db
    .select({
      id: pedidosTable.id,
      estado: pedidosTable.estado,
      total: pedidosTable.total,
      createdAt: pedidosTable.createdAt,
      restauranteNombre: restaurantesTable.nombre,
    })
    .from(pedidosTable)
    .innerJoin(restaurantesTable, eq(restaurantesTable.id, pedidosTable.restauranteId))
    .where(eq(pedidosTable.clienteId, profiles.cliente!.id))
    .orderBy(desc(pedidosTable.id));

  return { pedidos };
}

export function meta() {
  return [{ title: "Mis pedidos | Delivery App" }];
}

export default function ClientePedidos() {
  const { pedidos } = useLoaderData<typeof loader>();
  const layout = useRouteLoaderData("routes/layouts/cliente") as
    | { carritoCount: number; availableRoles: { key: string }[] }
    | undefined;
  const carritoCount = layout?.carritoCount ?? 0;
  const availableRoles = layout?.availableRoles ?? [];
  const nav = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/cliente/carrito", label: "Carrito", icon: ShoppingCart, badge: carritoCount },
    { href: "/cliente/pedidos", label: "Pedidos", icon: ReceiptText },
    ...(availableRoles.length > 1 ? [{ href: "/dashboard", label: "Roles", icon: User }] : []),
  ];

  return (
    <RoleShell title="Mis pedidos">
      {pedidos.length === 0 ? (
        <EmptyState
          title="Aun no tienes pedidos"
          description="Explora los restaurantes y haz tu primer pedido."
        />
      ) : (
        <div className="space-y-3">
          {pedidos.map((pedido) => (
            <Link key={pedido.id} to={`/cliente/pedidos/${pedido.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="font-medium">{pedido.restauranteNombre}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Pedido #{pedido.id} · {pedido.createdAt}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <StatusBadge status={pedido.estado} />
                    <span className="text-sm font-medium">
                      S/ {(pedido.total / 100).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <MobileBottomNav items={nav} />
    </RoleShell>
  );
}
