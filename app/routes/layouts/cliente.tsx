import { Link, Outlet, useLoaderData, useNavigate } from "react-router";
import { Check, ChevronDown, ReceiptText, ShoppingCart } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { signOut } from "~/lib/auth-client";
import { requireCliente } from "~/lib/roles.server";
import { db } from "~/database/client.server";
import { carritosTable, carritoDetallesTable } from "~/database/schema";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { Route } from "./+types/cliente";

const CURRENT_ROLE = "cliente";

const roleOptions = [
  { key: "cliente", label: "Cliente", href: "/" },
  { key: "restaurante", label: "Restaurante", href: "/restaurante/pedidos" },
  { key: "repartidor", label: "Repartidor", href: "/repartidor/home" },
  { key: "admin", label: "Administrador", href: "/admin/dashboard" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { profiles } = await requireCliente(request);

  const availableRoles = roleOptions.filter((r) => {
    if (r.key === "cliente") return !!profiles.cliente;
    if (r.key === "restaurante") return !!profiles.restauranteAdmin;
    if (r.key === "repartidor") return !!profiles.repartidor;
    if (r.key === "admin") return profiles.usuario.isAdmin;
    return false;
  });

  const items = await db
    .select({ cantidad: carritoDetallesTable.cantidad })
    .from(carritoDetallesTable)
    .innerJoin(carritosTable, eq(carritosTable.id, carritoDetallesTable.carritoId))
    .where(and(
      eq(carritosTable.clienteId, profiles.cliente!.id),
      eq(carritosTable.estado, "activo"),
    ));
  const carritoCount = items.reduce((acc, i) => acc + i.cantidad, 0);

  return { nombre: profiles.usuario.nombre, availableRoles, carritoCount };
}

export default function ClienteLayout() {
  const { nombre, availableRoles, carritoCount } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut({ fetchOptions: { onSuccess: () => navigate("/sign-in") } });
  }

  const currentLabel = roleOptions.find((r) => r.key === CURRENT_ROLE)!.label;

  return (
    <>
      <div className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Button
            nativeButton={false}
            variant="link"
            className="h-auto px-0 font-semibold"
            render={<Link to="/" />}
          >
            Delivery App
          </Button>
          <div className="flex items-center gap-2">
            <Button
              nativeButton={false}
              variant="ghost"
              size="icon"
              className="size-9"
              render={<Link to="/cliente/pedidos" />}
            >
              <ReceiptText className="size-4" />
            </Button>
            <Link to="/cliente/carrito" className="relative">
              <Button variant="ghost" size="icon" className="size-9">
                <ShoppingCart className="size-4" />
              </Button>
              {carritoCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {carritoCount > 9 ? "9+" : carritoCount}
                </span>
              )}
            </Link>
            {availableRoles.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="sm" />}
                >
                  {currentLabel}
                  <ChevronDown className="ml-1 size-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  {availableRoles.map((role) => (
                    <DropdownMenuItem
                      key={role.key}
                      render={<Link to={role.href} />}
                    >
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
            <span className="hidden text-sm text-muted-foreground sm:block">
              {nombre}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Salir
            </Button>
          </div>
        </div>
      </div>
      <Outlet context={{ nombre }} />
    </>
  );
}
