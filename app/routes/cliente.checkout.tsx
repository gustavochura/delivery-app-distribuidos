import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { order } from "~/data/mock-delivery";
import { OrderSummary } from "~/components/delivery/orders";
import { RoleShell } from "~/components/delivery/common";

export default function ClienteCheckout() {
  return (
    <RoleShell title="Confirmar pedido" description="Revisa direccion, pago y resumen final.">
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card><CardHeader><CardTitle>Direccion</CardTitle></CardHeader><CardContent>{order.address}<p className="mt-1 text-sm text-muted-foreground">Referencia: porton negro.</p></CardContent></Card>
          <Card><CardHeader><CardTitle>Metodo de pago</CardTitle></CardHeader><CardContent>Pago simulado · Yape/Plin</CardContent></Card>
          <Card><CardHeader><CardTitle>Instrucciones para el repartidor</CardTitle></CardHeader><CardContent><textarea className="min-h-24 w-full rounded-lg border bg-transparent p-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50" placeholder="Ej. llamar al llegar" /></CardContent></Card>
        </div>
        <div className="space-y-3">
          <OrderSummary />
          <Button nativeButton={false} className="w-full" render={<Link to="/cliente/pedidos/1001" />}>
            Confirmar pedido
          </Button>
        </div>
      </div>
    </RoleShell>
  );
}
