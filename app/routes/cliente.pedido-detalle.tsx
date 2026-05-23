import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { order } from "~/data/mock-delivery";
import { RoleShell } from "~/components/delivery/common";
import { OrderItems, OrderSummary, OrderTimeline, TrackingButton } from "~/components/delivery/orders";

export default function ClientePedidoDetalle() {
  return (
    <RoleShell title={`Pedido #${order.id}`} description={`${order.restaurant.name} · ${order.createdAt}`}>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card><CardHeader><CardTitle>Estado actual</CardTitle></CardHeader><CardContent><Badge>{order.status.replaceAll("_", " ")}</Badge></CardContent></Card>
          <OrderTimeline />
          <OrderItems />
          <Card><CardHeader><CardTitle>Repartidor</CardTitle></CardHeader><CardContent>{order.driver.name}<p className="text-sm text-muted-foreground">{order.driver.vehicle} · {order.driver.phone}</p></CardContent></Card>
        </div>
        <div className="space-y-3">
          <OrderSummary />
          <TrackingButton />
        </div>
      </div>
    </RoleShell>
  );
}
