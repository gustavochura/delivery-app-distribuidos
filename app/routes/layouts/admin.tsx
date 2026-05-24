import { Link, Outlet, useLoaderData, useNavigate } from "react-router";
import { Check, ChevronDown } from "lucide-react";
import { signOut } from "~/lib/auth-client";
import { requireAdmin } from "~/lib/roles.server";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { Route } from "./+types/admin";

const CURRENT_ROLE = "admin";

const roleOptions = [
  { key: "cliente", label: "Cliente", href: "/" },
  { key: "restaurante", label: "Restaurante", href: "/restaurante/pedidos" },
  { key: "repartidor", label: "Repartidor", href: "/repartidor/home" },
  { key: "admin", label: "Administrador", href: "/admin/dashboard" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { profiles } = await requireAdmin(request);

  const availableRoles = roleOptions.filter((r) => {
    if (r.key === "cliente") return !!profiles.cliente;
    if (r.key === "restaurante") return !!profiles.restauranteAdmin;
    if (r.key === "repartidor") return !!profiles.repartidor;
    if (r.key === "admin") return profiles.usuario.isAdmin;
    return false;
  });

  return { nombre: profiles.usuario.nombre, availableRoles };
}

export default function AdminLayout() {
  const { nombre, availableRoles } = useLoaderData<typeof loader>();
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
