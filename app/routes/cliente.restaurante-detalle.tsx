import { Link } from "react-router";
import { ShoppingCart, Star } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { products, restaurants } from "~/data/mock-delivery";
import { ProductCard } from "~/components/delivery/restaurant";
import { RoleShell } from "~/components/delivery/common";

export default function ClienteRestauranteDetalle() {
  const restaurant = restaurants[0];
  const tabs = Array.from(new Set(products.map((product) => product.category)));

  return (
    <RoleShell title={restaurant.name} description={restaurant.address}>
      <div className="space-y-6 pb-20">
        <Card className="overflow-hidden">
          <img className="h-56 w-full object-cover" src={restaurant.image} alt={restaurant.name} />
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{restaurant.category}</p>
                <div className="mt-2 flex gap-2">
                  <Badge variant="secondary">
                    <Star className="size-3" /> {restaurant.rating}
                  </Badge>
                  <Badge variant="outline">{restaurant.eta}</Badge>
                  <Badge>{restaurant.status}</Badge>
                </div>
              </div>
              <Button nativeButton={false} render={<Link to="/cliente/carrito" />}>
                <ShoppingCart />
                Ver carrito
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <Badge key={tab} variant="secondary" className="h-8 px-3">
              {tab}
            </Badge>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </RoleShell>
  );
}
