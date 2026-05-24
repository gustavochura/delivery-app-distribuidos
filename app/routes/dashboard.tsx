import { Link, redirect, useLoaderData, useNavigate } from "react-router";
import { signOut } from "~/lib/auth-client";
import { auth } from "~/lib/auth.server";
import { getUserProfiles } from "~/lib/roles.server";
import type { Route } from "./+types/dashboard";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Separator } from "~/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { dashboardRoles } from "~/data/mock-delivery";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    throw redirect("/sign-in");
  }

  const profiles = await getUserProfiles(session.user.id);

  const availableRoles: string[] = [];
  if (profiles?.cliente) availableRoles.push("cliente");
  if (profiles?.restauranteAdmin) availableRoles.push("restaurante");
  if (profiles?.repartidor) availableRoles.push("repartidor");
  if (profiles?.usuario.isAdmin) availableRoles.push("admin");

  return {
    user: session.user,
    availableRoles,
  };
}

export function meta() {
  return [
    { title: "Dashboard | Delivery App" },
    { name: "description", content: "Panel privado de Delivery App." },
  ];
}

const roleTitleToKey: Record<string, string> = {
  Cliente: "cliente",
  Restaurante: "restaurante",
  Repartidor: "repartidor",
  Administrador: "admin",
};

export default function Dashboard() {
  const { user, availableRoles } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut({
      fetchOptions: {
        onSuccess: () => navigate("/sign-in"),
      },
    });
  }

  const rolesVisibles = dashboardRoles.filter(
    (role) => availableRoles.includes(roleTitleToKey[role.title] ?? ""),
  );

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <section className="mx-auto w-full max-w-3xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Button
              nativeButton={false}
              variant="link"
              className="h-auto px-0"
              render={<Link to="/" />}
            >
              Delivery App
            </Button>
            <h1 className="mt-3 text-3xl font-semibold">Dashboard</h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              Cuenta
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} variant="destructive">
                  Cerrar sesion
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {rolesVisibles.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {rolesVisibles.map((role) => {
              const Icon = role.icon;
              return (
                <Card key={role.href}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{role.title}</CardTitle>
                        <CardDescription>{role.description}</CardDescription>
                      </div>
                      <div className="rounded-lg bg-muted p-2">
                        <Icon className="size-5" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      nativeButton={false}
                      className="w-full"
                      render={<Link to={role.href} />}
                    >
                      Entrar como {role.title}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Alert>
            <AlertTitle>Sin perfil asignado</AlertTitle>
            <AlertDescription>
              Tu cuenta aun no tiene ningun perfil (cliente, repartidor, restaurante o administrador). Contacta al administrador del sistema.
            </AlertDescription>
          </Alert>
        )}

        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Sesion activa</CardTitle>
                <CardDescription>
                  Esta ruta se protege con Better Auth desde el loader.
                </CardDescription>
              </div>
              <Badge variant="secondary">Protegido</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Nombre</dt>
                <dd className="mt-1 font-medium">{user.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Email</dt>
                <dd className="mt-1 font-medium">{user.email}</dd>
              </div>
            </dl>
            <Separator className="my-6" />
            <p className="text-sm text-muted-foreground">
              El siguiente paso natural es crear perfiles de cliente,
              repartidor o administrador usando este usuario autenticado.
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
