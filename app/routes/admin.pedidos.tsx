import { restaurantOrders } from "~/data/mock-delivery";
import { DataTable, RoleShell, SearchBar, StatusBadge } from "~/components/delivery/common";

export default function AdminPedidos() {
  return (
    <RoleShell title="Gestion global de pedidos" description="Monitorea todos los pedidos del sistema.">
      <div className="space-y-5">
        <SearchBar placeholder="Buscar pedido, cliente o restaurante" />
        <DataTable
          columns={["Pedido", "Cliente", "Restaurante", "Repartidor", "Estado", "Total", "Fecha"]}
          rows={restaurantOrders.map((item) => [
            `#${item.id}`,
            item.customer,
            item.restaurant.name,
            item.driver.name,
            <StatusBadge key={item.id} status={item.status} />,
            `S/ ${item.total.toFixed(2)}`,
            item.createdAt,
          ])}
        />
      </div>
    </RoleShell>
  );
}
