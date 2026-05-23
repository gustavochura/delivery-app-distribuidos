import { adminStats, restaurantOrders } from "~/data/mock-delivery";
import { ChartPlaceholder, DataTable, RoleShell, StatsCard } from "~/components/delivery/common";
import { StatusBadge } from "~/components/delivery/common";

export default function AdminDashboard() {
  return (
    <RoleShell title="Dashboard general" description="Vista global del sistema de delivery.">
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-5">
          {adminStats.map((stat) => (
            <StatsCard key={stat.label} {...stat} />
          ))}
        </div>
        <ChartPlaceholder />
        <DataTable
          columns={["Pedido", "Cliente", "Restaurante", "Estado", "Total"]}
          rows={restaurantOrders.map((item) => [
            `#${item.id}`,
            item.customer,
            item.restaurant.name,
            <StatusBadge key={item.id} status={item.status} />,
            `S/ ${item.total.toFixed(2)}`,
          ])}
        />
      </div>
    </RoleShell>
  );
}
