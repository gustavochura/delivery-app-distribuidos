import { useLoaderData } from "react-router";
import { eq } from "drizzle-orm";
import { Badge } from "~/components/ui/badge";
import { db } from "~/database/client.server";
import {
  clientesTable,
  repartidoresTable,
  restauranteAdminsTable,
  usuariosTable,
} from "~/database/schema";
import { requireAdmin } from "~/lib/roles.server";
import { DataTable, RoleShell, SearchBar } from "~/components/delivery/common";
import type { Route } from "./+types/admin.usuarios";

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);

  const rows = await db
    .select({
      id: usuariosTable.id,
      nombre: usuariosTable.nombre,
      email: usuariosTable.email,
      isAdmin: usuariosTable.isAdmin,
      clienteId: clientesTable.id,
      repartidorId: repartidoresTable.id,
      restauranteAdminId: restauranteAdminsTable.id,
    })
    .from(usuariosTable)
    .leftJoin(clientesTable, eq(clientesTable.usuarioId, usuariosTable.id))
    .leftJoin(repartidoresTable, eq(repartidoresTable.usuarioId, usuariosTable.id))
    .leftJoin(restauranteAdminsTable, eq(restauranteAdminsTable.usuarioId, usuariosTable.id))
    .limit(100);

  const usuarios = rows.map((r) => {
    const roles: string[] = [];
    if (r.isAdmin) roles.push("admin");
    if (r.clienteId) roles.push("cliente");
    if (r.repartidorId) roles.push("repartidor");
    if (r.restauranteAdminId) roles.push("restaurante");
    return { id: r.id, nombre: r.nombre, email: r.email, roles };
  });

  return { usuarios };
}

export default function AdminUsuarios() {
  const { usuarios } = useLoaderData<typeof loader>();

  return (
    <RoleShell title="Gestion de usuarios" description="Controla usuarios, roles y estados de cuenta.">
      <div className="space-y-5">
        <SearchBar placeholder="Buscar usuario" />
        <DataTable
          columns={["Nombre", "Email", "Roles"]}
          rows={usuarios.map((u) => [
            u.nombre,
            u.email,
            <span key={u.id} className="flex flex-wrap gap-1">
              {u.roles.map((r) => (
                <Badge key={r} variant="secondary">{r}</Badge>
              ))}
            </span>,
          ])}
        />
      </div>
    </RoleShell>
  );
}
