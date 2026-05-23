import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { dailyStats, order } from "~/data/mock-delivery";
import { RoleShell, StatsCard } from "~/components/delivery/common";

export default function RepartidorHome() {
  return (
    <RoleShell title="Hola, Renzo" description="Activa tu disponibilidad y toma pedidos asignados.">
      <div className="space-y-5">
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium">Estado actual</p>
              <p className="text-sm text-muted-foreground">Disponible para recibir pedidos</p>
            </div>
            <Button>Disponible</Button>
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-3">
          {dailyStats.map((stat) => (
            <StatsCard key={stat.label} {...stat} />
          ))}
        </div>
        <Card>
          <CardHeader><CardTitle>Pedido actual</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium">Pedido #{order.id}</p>
              <p className="text-sm text-muted-foreground">{order.restaurant.name} hacia {order.address}</p>
            </div>
            <Button nativeButton={false} render={<Link to="/repartidor/pedidos/asignado" />}>
              Ver asignado
            </Button>
          </CardContent>
        </Card>
      </div>
    </RoleShell>
  );
}
