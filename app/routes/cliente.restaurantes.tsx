import { useState, useEffect } from "react";
import { Form, Link, useLoaderData, useNavigation, useRouteLoaderData, useSubmit } from "react-router";
import { and, eq, isNotNull, like, or } from "drizzle-orm";
import { Home, ReceiptText, ShoppingCart, User } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { db } from "~/database/client.server";
import { restaurantesTable } from "~/database/schema";
import { EmptyState, MobileBottomNav, RoleShell, SearchBar } from "~/components/delivery/common";
import { RestaurantCard } from "~/components/delivery/restaurant";
import { useDebounce } from "~/lib/hooks";
import type { Route } from "./+types/cliente.restaurantes";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const categoria = url.searchParams.get("categoria") ?? "";

  const where = and(
    eq(restaurantesTable.activo, true),
    q
      ? or(
          like(restaurantesTable.nombre, `%${q}%`),
          like(restaurantesTable.categoria, `%${q}%`),
        )
      : undefined,
    categoria ? like(restaurantesTable.categoria, `%${categoria}%`) : undefined,
  );

  const [restaurantes, categoriasRows] = await Promise.all([
    db.select().from(restaurantesTable).where(where),
    db
      .selectDistinct({ categoria: restaurantesTable.categoria })
      .from(restaurantesTable)
      .where(and(eq(restaurantesTable.activo, true), isNotNull(restaurantesTable.categoria))),
  ]);

  const categorias = categoriasRows.map((r) => r.categoria).filter(Boolean) as string[];
  return { q, categoria, restaurantes, categorias };
}

export default function ClienteRestaurantes() {
  const { q, categoria, restaurantes, categorias } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSearching = navigation.location !== undefined;
  const layout = useRouteLoaderData("routes/layouts/cliente-browsing") as
    | { nombre: string | null; carritoCount: number; availableRoles: { key: string }[] }
    | undefined;
  const carritoCount = layout?.carritoCount ?? 0;
  const availableRoles = layout?.availableRoles ?? [];
  const isLoggedIn = (layout?.nombre ?? null) !== null;

  const nav = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/cliente/carrito", label: "Carrito", icon: ShoppingCart, badge: carritoCount },
    { href: "/cliente/pedidos", label: "Pedidos", icon: ReceiptText },
    ...(availableRoles.length > 1 ? [{ href: "/dashboard", label: "Roles", icon: User }] : []),
  ];

  const [searchValue, setSearchValue] = useState(q);
  useEffect(() => { setSearchValue(q); }, [q]);

  const debouncedSubmit = useDebounce(
    (value: string) => submit({ q: value, categoria }, { method: "get" }),
    300,
  );

  return (
    <RoleShell title="Restaurantes" description="Explora todos los restaurantes disponibles.">
      <div className="space-y-5">
        <Form method="get" role="search">
          <input type="hidden" name="categoria" value={categoria} />
          <SearchBar
            name="q"
            value={searchValue}
            placeholder="Buscar restaurante"
            onChange={(e) => {
              const value = e.target.value;
              setSearchValue(value);
              debouncedSubmit(value);
            }}
            className={isSearching ? "opacity-60" : undefined}
          />
        </Form>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Link className="inline-flex shrink-0" to={q ? `?q=${encodeURIComponent(q)}` : "?"}>
            <Badge variant={!categoria ? "default" : "outline"} className="h-8 cursor-pointer px-3 whitespace-nowrap">
              Todos
            </Badge>
          </Link>
          {categorias.map((cat) => (
            <Link
              key={cat}
              className="inline-flex shrink-0"
              to={q ? `?q=${encodeURIComponent(q)}&categoria=${encodeURIComponent(cat)}` : `?categoria=${encodeURIComponent(cat)}`}
            >
              <Badge
                variant={categoria === cat ? "default" : "outline"}
                className="h-8 cursor-pointer px-3 whitespace-nowrap"
              >
                {cat}
              </Badge>
            </Link>
          ))}
        </div>
        {restaurantes.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {restaurantes.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Sin resultados"
            description={
              categoria
                ? `No hay restaurantes de "${categoria}"${q ? ` con "${q}"` : ""}.`
                : `No hay restaurantes que coincidan con "${q}".`
            }
          />
        )}
      </div>
      {isLoggedIn && <MobileBottomNav items={nav} />}
    </RoleShell>
  );
}
