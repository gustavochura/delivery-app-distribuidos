import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { restaurantOrders } from "~/data/mock-delivery";
import { RoleShell, SearchBar } from "~/components/delivery/common";
import { OrderCard } from "~/components/delivery/orders";

const filters = ["nuevos", "aceptados", "en_preparacion", "listos", "entregados", "cancelados"];

export default function RestaurantePedidos() {
  return (
    <RoleShell
      title="Pedidos del restaurante"
      description="Gestiona pedidos recibidos y actualiza estados operativos."
      actions={<Button variant="outline">Restaurante abierto</Button>}
    >
      <div className="space-y-5">
        <SearchBar placeholder="Buscar pedido o cliente" />
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Badge key={filter} variant="secondary">
              {filter.replaceAll("_", " ")}
            </Badge>
          ))}
        </div>
        <div className="space-y-3">
          {restaurantOrders.map((item) => (
            <OrderCard key={item.id} item={item} href={`/restaurante/pedidos/${item.id}`} />
          ))}
        </div>
      </div>
    </RoleShell>
  );
}
