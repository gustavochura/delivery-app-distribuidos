import { Link } from "react-router";
import { Clock, Plus, Star } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { products, restaurants } from "~/data/mock-delivery";
import { StatusBadge } from "./common";

export function RestaurantCard({
  restaurant,
}: {
  restaurant: (typeof restaurants)[number];
}) {
  return (
    <Card className="overflow-hidden">
      <img className="h-36 w-full object-cover" src={restaurant.image} alt={restaurant.name} />
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">{restaurant.name}</p>
            <p className="text-sm text-muted-foreground">{restaurant.category}</p>
          </div>
          <StatusBadge status={restaurant.status} />
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Star className="size-3" /> {restaurant.rating}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" /> {restaurant.eta}
          </span>
          <span>{restaurant.deliveryFee}</span>
        </div>
        <Button
          nativeButton={false}
          className="w-full"
          render={<Link to={`/cliente/restaurantes/${restaurant.id}`} />}
        >
          Ver restaurante
        </Button>
      </CardContent>
    </Card>
  );
}

export function PromotionBanner() {
  return (
    <div className="rounded-xl border bg-primary p-5 text-primary-foreground">
      <Badge variant="secondary" className="mb-3">
        Promocion
      </Badge>
      <h2 className="text-xl font-semibold">Delivery gratis en tu primer pedido</h2>
      <p className="mt-1 text-sm opacity-85">
        Usa restaurantes cercanos y confirma tu pedido en menos de un minuto.
      </p>
    </div>
  );
}

export function ProductCard({ product }: { product: (typeof products)[number] }) {
  return (
    <Card>
      <CardContent className="grid grid-cols-[88px_1fr] gap-3">
        <img className="h-24 w-22 rounded-lg object-cover" src={product.image} alt={product.name} />
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{product.name}</p>
              <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
            </div>
            <Button size="icon-sm" disabled={!product.available}>
              <Plus />
            </Button>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="font-semibold">S/ {product.price.toFixed(2)}</p>
            <Badge variant={product.available ? "secondary" : "outline"}>
              {product.available ? "Disponible" : "Agotado"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProductAdminCard({ product }: { product: (typeof products)[number] }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <img className="size-16 rounded-lg object-cover" src={product.image} alt={product.name} />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{product.name}</p>
          <p className="text-sm text-muted-foreground">{product.category}</p>
        </div>
        <p className="font-semibold">S/ {product.price.toFixed(2)}</p>
        <Badge variant={product.available ? "secondary" : "outline"}>
          {product.available ? "Activo" : "Pausado"}
        </Badge>
      </CardContent>
    </Card>
  );
}
