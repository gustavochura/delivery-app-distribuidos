import { Link } from "react-router";
import { MapPinned } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { order, restaurantOrders, timeline } from "~/data/mock-delivery";
import { StatusBadge } from "./common";

export function OrderCard({
  item,
  href,
}: {
  item: typeof order | (typeof restaurantOrders)[number];
  href: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-medium">Pedido #{item.id}</p>
          <p className="text-sm text-muted-foreground">
            {item.restaurant.name} · {item.createdAt}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={item.status} />
          <p className="font-semibold">S/ {item.total.toFixed(2)}</p>
          <Button nativeButton={false} variant="outline" render={<Link to={href} />}>
            Ver detalle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function OrderTimeline() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Linea de tiempo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {timeline.map((step, index) => (
          <div key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="size-3 rounded-full bg-primary" />
              {index < timeline.length - 1 ? <div className="h-8 w-px bg-border" /> : null}
            </div>
            <p className="text-sm">{step}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function OrderSummary() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>S/ {order.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Envio</span>
          <span>S/ {order.deliveryFee.toFixed(2)}</span>
        </div>
        <Separator />
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>S/ {order.total.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function OrderItems() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Productos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {order.items.map(({ product, quantity }) => (
          <div key={product.id} className="flex justify-between gap-3 text-sm">
            <span>
              {quantity}x {product.name}
            </span>
            <span>S/ {(product.price * quantity).toFixed(2)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function TrackingButton() {
  return (
    <Button
      nativeButton={false}
      className="w-full"
      render={<Link to={`/cliente/pedidos/${order.id}/seguimiento`} />}
    >
      <MapPinned />
      Ver seguimiento
    </Button>
  );
}
