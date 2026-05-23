import { Badge } from "~/components/ui/badge";
import { users } from "~/data/mock-delivery";
import { DataTable, RoleShell, SearchBar } from "~/components/delivery/common";

export default function AdminUsuarios() {
  return (
    <RoleShell title="Gestion de usuarios" description="Controla usuarios, roles y estados de cuenta.">
      <div className="space-y-5">
        <SearchBar placeholder="Buscar usuario" />
        <DataTable
          columns={["Nombre", "Email", "Rol", "Estado", "Accion"]}
          rows={users.map((user) => [
            user.name,
            user.email,
            <Badge key={`${user.email}-role`} variant="secondary">{user.role}</Badge>,
            <Badge key={`${user.email}-status`}>{user.status}</Badge>,
            "Ver detalle",
          ])}
        />
      </div>
    </RoleShell>
  );
}
