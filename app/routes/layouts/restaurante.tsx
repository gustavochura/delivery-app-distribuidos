import { Link, Outlet, useLoaderData, useFetcher, useLocation, useNavigate } from "react-router";
import { Check, ChevronDown, Package, ShoppingBag, Store } from "lucide-react";
import { signOut } from "~/lib/auth-client";
import { requireRestauranteActive } from "~/lib/roles.server";
import { Button } from "~/components/ui/button";
import { MobileBottomNav } from "~/components/delivery/common";
import { cn } from "~/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { Route } from "./+types/restaurante";

const CURRENT_ROLE = "restaurante";

const roleOptions = [
  { key: "cliente", label: "Cliente", href: "/" },
  { key: "restaurante", label: "Restaurante", href: "/restaurante/pedidos" },
  { key: "repartidor", label: "Repartidor", href: "/repartidor/home" },
  { key: "admin", label: "Administrador", href: "/admin/dashboard" },
];

const navItems = [
  { href: "/restaurante/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/restaurante/productos", label: "Productos", icon: Package },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { profiles, restaurantes, activeRestauranteId } = await requireRestauranteActive(request);

  const availableRoles = roleOptions.filter((r) => {
    if (r.key === "cliente") return !!profiles.cliente;
    if (r.key === "restaurante") return !!profiles.restauranteAdmin;
    if (r.key === "repartidor") return !!profiles.repartidor;
    if (r.key === "admin") return profiles.usuario.isAdmin;
    return false;
  });

  return { nombre: profiles.usuario.nombre, availableRoles, restaurantes, activeRestauranteId };
}

export default function RestauranteLayout() {
  const { nombre, availableRoles, restaurantes, activeRestauranteId } = useLoaderData<typeof loader>();
  const location = useLocation();
  const navigate = useNavigate();
  const fetcher = useFetcher();

  const activeRestaurante = restaurantes.find((r) => r.restauranteId === activeRestauranteId);
  const currentLabel = roleOptions.find((r) => r.key === CURRENT_ROLE)!.label;

  async function handleSignOut() {
    await signOut({ fetchOptions: { onSuccess: () => navigate("/sign-in") } });
  }

  function switchRestaurante(restauranteId: number) {
    fetcher.submit({ restaurante_id: restauranteId }, { method: "post", action: "/restaurante/cambiar" });
  }

  return (
    <>
      <div className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          {/* Logo */}
          <Button
            nativeButton={false}
            variant="link"
            className="h-auto shrink-0 px-0 font-semibold"
            render={<Link to="/" />}
          >
            Delivery App
          </Button>

          {/* Separator */}
          <span className="text-border">|</span>

          {/* Nav links */}
          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => {
              const active = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Restaurant indicator / switcher */}
          {restaurantes.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    activeRestaurante?.abierto ? "bg-green-500" : "bg-red-400",
                  )}
                />
                <span className="max-w-[140px] truncate">{activeRestaurante?.nombre}</span>
                <ChevronDown className="size-3 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {restaurantes.map((r) => (
                  <DropdownMenuItem
                    key={r.restauranteId}
                    onClick={() => switchRestaurante(r.restauranteId)}
                  >
                    {r.restauranteId === activeRestauranteId ? (
                      <Check className="mr-2 size-3 shrink-0" />
                    ) : (
                      <span className="mr-2 inline-block size-3 shrink-0" />
                    )}
                    <span
                      className={cn(
                        "mr-2 size-2 shrink-0 rounded-full",
                        r.abierto ? "bg-green-500" : "bg-red-400",
                      )}
                    />
                    <span className="truncate">{r.nombre}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm sm:flex">
              <Store className="size-4 text-muted-foreground" />
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  activeRestaurante?.abierto ? "bg-green-500" : "bg-red-400",
                )}
              />
              <span className="max-w-[140px] truncate font-medium">{activeRestaurante?.nombre}</span>
            </div>
          )}

          {/* Role switcher */}
          {availableRoles.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                {currentLabel}
                <ChevronDown className="ml-1 size-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                {availableRoles.map((role) => (
                  <DropdownMenuItem key={role.key} render={<Link to={role.href} />}>
                    {role.key === CURRENT_ROLE ? (
                      <Check className="mr-2 size-3" />
                    ) : (
                      <span className="mr-2 inline-block size-3" />
                    )}
                    {role.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <span className="hidden text-sm text-muted-foreground sm:block">{nombre}</span>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Salir
          </Button>
        </div>
      </div>

      <Outlet context={{ activeRestauranteId, nombre }} />

      <MobileBottomNav items={navItems} />
    </>
  );
}
