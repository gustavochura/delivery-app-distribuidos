import { Phone } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { order } from "~/data/mock-delivery";
import { RoleShell } from "~/components/delivery/common";
import { MapboxDeliveryMap } from "~/components/delivery/mapbox-delivery-map";

export default function ClienteSeguimiento() {
  return (
    <RoleShell title="Seguimiento en mapa" description={`Pedido #${order.id} · ETA 12 min`}>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <MapboxDeliveryMap />
        <Card>
          <CardHeader><CardTitle>{order.status.replaceAll("_", " ")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Tu repartidor esta camino a la direccion de entrega.</p>
            <div className="rounded-lg border p-3">
              <p className="font-medium">{order.driver.name}</p>
              <p className="text-sm text-muted-foreground">{order.driver.vehicle}</p>
            </div>
            <Button className="w-full"><Phone /> Contactar repartidor</Button>
          </CardContent>
        </Card>
      </div>
    </RoleShell>
  );
}
