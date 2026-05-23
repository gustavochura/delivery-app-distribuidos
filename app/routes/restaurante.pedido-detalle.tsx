import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { order } from "~/data/mock-delivery";
import { RoleShell, StatusBadge } from "~/components/delivery/common";
import { OrderItems, OrderSummary } from "~/components/delivery/orders";

export default function RestaurantePedidoDetalle() {
  return (
    <RoleShell title={`Pedido #${order.id}`} description="Revisa productos, notas y cambia estado.">
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
            <CardContent>
              <p className="font-medium">{order.customer}</p>
              <p className="text-sm text-muted-foreground">{order.address}</p>
            </CardContent>
          </Card>
          <OrderItems />
          <Card>
            <CardHeader><CardTitle>Notas</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Sin cebolla en la ensalada. Enviar cremas extra.
            </CardContent>
          </Card>
        </div>
        <div className="space-y-3">
          <Card><CardContent className="flex items-center justify-between"><span>Estado</span><StatusBadge status={order.status} /></CardContent></Card>
          <OrderSummary />
          <div className="grid gap-2">
            <Button>Aceptar pedido</Button>
            <Button variant="secondary">Marcar en preparacion</Button>
            <Button variant="outline">Marcar como listo</Button>
            <Button variant="destructive">Rechazar pedido</Button>
          </div>
        </div>
      </div>
    </RoleShell>
  );
}
