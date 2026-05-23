import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { order } from "~/data/mock-delivery";
import { RoleShell } from "~/components/delivery/common";

export default function RepartidorPedidoAsignado() {
  return (
    <RoleShell title="Pedido asignado" description="Acepta o rechaza la entrega disponible.">
      <Card>
        <CardHeader><CardTitle>Pedido #{order.id}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Recoger en</p>
            <p className="font-medium">{order.restaurant.name}</p>
            <p className="text-sm">{order.restaurant.address}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Entregar a</p>
            <p className="font-medium">{order.customer}</p>
            <p className="text-sm">{order.address}</p>
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-3">
            <Button nativeButton={false} render={<Link to={`/repartidor/pedidos/${order.id}/mapa`} />}>
              Aceptar pedido
            </Button>
            <Button variant="outline">Rechazar</Button>
          </div>
        </CardContent>
      </Card>
    </RoleShell>
  );
}
