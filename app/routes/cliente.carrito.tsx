import { Link } from "react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cartItems } from "~/data/mock-delivery";
import { OrderSummary } from "~/components/delivery/orders";
import { RoleShell } from "~/components/delivery/common";

export default function ClienteCarrito() {
  return (
    <RoleShell title="Carrito" description="Productos seleccionados de un solo restaurante.">
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <Alert>
            <AlertTitle>Regla del carrito</AlertTitle>
            <AlertDescription>
              Si agregas productos de otro restaurante, se pedira confirmar el reemplazo del carrito.
            </AlertDescription>
          </Alert>
          {cartItems.map(({ product, quantity }) => (
            <Card key={product.id}>
              <CardContent className="flex items-center gap-4">
                <img className="size-16 rounded-lg object-cover" src={product.image} alt={product.name} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-muted-foreground">S/ {product.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon-sm"><Minus /></Button>
                  <span className="w-6 text-center text-sm">{quantity}</span>
                  <Button variant="outline" size="icon-sm"><Plus /></Button>
                </div>
                <Button variant="ghost" size="icon-sm"><Trash2 /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-3">
          <OrderSummary />
          <Button nativeButton={false} className="w-full" render={<Link to="/cliente/checkout" />}>
            Continuar al checkout
          </Button>
        </div>
      </div>
    </RoleShell>
  );
}
