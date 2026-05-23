import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { order } from "~/data/mock-delivery";
import { RoleShell } from "~/components/delivery/common";
import { MapboxDeliveryMap } from "~/components/delivery/mapbox-delivery-map";

export default function RepartidorMapa() {
  return (
    <RoleShell title="Mapa de entrega" description="Ruta hacia restaurante y cliente.">
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <MapboxDeliveryMap mode="repartidor" />
        <Card>
          <CardHeader><CardTitle>Accion actual</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Dirigete al restaurante para recoger el pedido #{order.id}.</p>
            <Button className="w-full">Llegue al restaurante</Button>
            <Button variant="outline" className="w-full">Contactar cliente</Button>
          </CardContent>
        </Card>
      </div>
    </RoleShell>
  );
}
