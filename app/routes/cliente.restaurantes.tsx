import { Badge } from "~/components/ui/badge";
import { restaurants } from "~/data/mock-delivery";
import { EmptyState, RoleShell, SearchBar } from "~/components/delivery/common";
import { RestaurantCard } from "~/components/delivery/restaurant";

const filters = ["Abierto ahora", "Mejor calificados", "Menor tiempo", "Envio bajo", "Promociones"];

export default function ClienteRestaurantes() {
  return (
    <RoleShell title="Restaurantes" description="Explora todos los restaurantes disponibles.">
      <div className="space-y-5">
        <SearchBar placeholder="Buscar restaurante" />
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Badge key={filter} variant="outline">
              {filter}
            </Badge>
          ))}
        </div>
        {restaurants.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {restaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        ) : (
          <EmptyState title="Sin restaurantes" description="Prueba con otros filtros." />
        )}
      </div>
    </RoleShell>
  );
}
