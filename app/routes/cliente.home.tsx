import { Home, ReceiptText, ShoppingCart, User } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { categories, restaurants } from "~/data/mock-delivery";
import { MobileBottomNav, RoleShell, SearchBar } from "~/components/delivery/common";
import { PromotionBanner, RestaurantCard } from "~/components/delivery/restaurant";

const nav = [
  { href: "/cliente/home", label: "Inicio", icon: Home },
  { href: "/cliente/carrito", label: "Carrito", icon: ShoppingCart },
  { href: "/cliente/pedidos/1001", label: "Pedidos", icon: ReceiptText },
  { href: "/dashboard", label: "Perfil", icon: User },
];

export default function ClienteHome() {
  return (
    <RoleShell title="Hola, Luis" description="Entrega en Urb. Santa Fortunata">
      <div className="space-y-6 pb-24 md:pb-0">
        <SearchBar placeholder="Buscar restaurantes o productos" />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <Badge key={category} variant="secondary" className="h-8 px-3">
              {category}
            </Badge>
          ))}
        </div>
        <PromotionBanner />
        <section>
          <h2 className="mb-3 text-lg font-semibold">Restaurantes cercanos</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {restaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        </section>
        <Card>
          <CardHeader>
            <CardTitle>Populares cerca de ti</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {restaurants.slice(0, 3).map((restaurant) => (
              <div key={restaurant.id} className="rounded-lg border p-3">
                <p className="font-medium">{restaurant.name}</p>
                <p className="text-sm text-muted-foreground">{restaurant.promo}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <MobileBottomNav items={nav} />
    </RoleShell>
  );
}
