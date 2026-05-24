import { Form, Link, useLoaderData, useRouteLoaderData } from "react-router";
import { and, eq, isNotNull } from "drizzle-orm";
import { Home, ReceiptText, ShoppingCart, User } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { db } from "~/database/client.server";
import { restaurantesTable } from "~/database/schema";
import { MobileBottomNav, RoleShell, SearchBar } from "~/components/delivery/common";
import { PromotionBanner, RestaurantCard } from "~/components/delivery/restaurant";
import type { Route } from "./+types/cliente.home";

export async function loader(_: Route.LoaderArgs) {
  const [restaurantes, categoriasRows] = await Promise.all([
    db
      .select()
      .from(restaurantesTable)
      .where(eq(restaurantesTable.activo, true))
      .limit(6),
    db
      .selectDistinct({ categoria: restaurantesTable.categoria })
      .from(restaurantesTable)
      .where(and(eq(restaurantesTable.activo, true), isNotNull(restaurantesTable.categoria))),
  ]);

  const categorias = categoriasRows.map((r) => r.categoria).filter(Boolean) as string[];
  return { restaurantes, categorias };
}

export default function ClienteHome() {
  const { restaurantes, categorias } = useLoaderData<typeof loader>();
  const layout = useRouteLoaderData("routes/layouts/cliente-browsing") as
    | { nombre: string | null; carritoCount: number; availableRoles: { key: string }[] }
    | undefined;
  const nombre = layout?.nombre ?? null;
  const carritoCount = layout?.carritoCount ?? 0;
  const availableRoles = layout?.availableRoles ?? [];
  const title = nombre ? `Hola, ${nombre}` : "Bienvenido";
  const description = nombre
    ? undefined
    : "Encuentra los mejores restaurantes cerca de ti";

  const nav = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/cliente/carrito", label: "Carrito", icon: ShoppingCart, badge: carritoCount },
    { href: "/cliente/pedidos", label: "Pedidos", icon: ReceiptText },
    ...(availableRoles.length > 1 ? [{ href: "/dashboard", label: "Roles", icon: User }] : []),
  ];

  return (
    <RoleShell title={title} description={description}>
      <div className="space-y-6 pb-24 md:pb-0">
        <Form method="get" action="/cliente/restaurantes">
          <SearchBar name="q" placeholder="Buscar restaurantes o productos" />
        </Form>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categorias.map((cat) => (
            <Link
              key={cat}
              className="inline-flex shrink-0"
              to={`/cliente/restaurantes?categoria=${encodeURIComponent(cat)}`}
            >
              <Badge
                variant="secondary"
                className="h-8 cursor-pointer whitespace-nowrap px-3 hover:bg-secondary/70"
              >
                {cat}
              </Badge>
            </Link>
          ))}
        </div>
        <PromotionBanner />
        <section>
          <h2 className="mb-3 text-lg font-semibold">Restaurantes cercanos</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {restaurantes.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        </section>
      </div>
      <MobileBottomNav items={nav} />
    </RoleShell>
  );
}
