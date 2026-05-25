import { Link } from "react-router";
import { MapPinned } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { StatusBadge } from "./common";

export type PedidoSummary = {
  id: number;
  restauranteNombre: string;
  createdAt: string;
  estado: string;
  total: number;
};

export type PedidoItem = {
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
};

export type TimelineStep = {
  label: string;
  completado: boolean;
};

export function OrderCard({ item, href }: { item: PedidoSummary; href: string }) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-medium">Pedido #{item.id}</p>
          <p className="text-sm text-muted-foreground">
            {item.restauranteNombre} · {item.createdAt}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={item.estado} />
          <p className="font-semibold">S/ {(item.total / 100).toFixed(2)}</p>
          <Button nativeButton={false} variant="outline" render={<Link to={href} />}>
            Ver detalle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function OrderTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Línea de tiempo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`size-3 rounded-full ${step.completado ? "bg-primary" : "bg-muted-foreground/30"}`}
              />
              {index < steps.length - 1 ? <div className="h-8 w-px bg-border" /> : null}
            </div>
            <p className={`text-sm ${step.completado ? "" : "text-muted-foreground"}`}>
              {step.label}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function OrderSummary({
  subtotal,
  costoEnvio,
  total,
}: {
  subtotal: number;
  costoEnvio: number;
  total: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>S/ {(subtotal / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Envío</span>
          <span>S/ {(costoEnvio / 100).toFixed(2)}</span>
        </div>
        <Separator />
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>S/ {(total / 100).toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function OrderItems({ items }: { items: PedidoItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Productos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between gap-3 text-sm">
            <span>
              {item.cantidad}x {item.productoNombre}
            </span>
            <span>S/ {(item.subtotal / 100).toFixed(2)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function TrackingButton({ pedidoId }: { pedidoId: number }) {
  return (
    <Button
      nativeButton={false}
      className="w-full"
      render={<Link to={`/cliente/pedidos/${pedidoId}/seguimiento`} />}
    >
      <MapPinned />
      Ver seguimiento
    </Button>
  );
}
