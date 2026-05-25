import { Link } from "react-router";
import { Clock, Plus, Star } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { StatusBadge } from "./common";

export type RestauranteDisplay = {
  id: number;
  nombre: string;
  categoria: string | null;
  direccion: string;
  imagen: string | null;
  calificacion: number;
  tiempoEstimado: string;
  tarifaEnvio: number;
  abierto: boolean;
};

export type ProductoDisplay = {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  imagen: string | null;
  precio: number;
  disponible: boolean;
};

export function RestaurantCard({ restaurant }: { restaurant: RestauranteDisplay }) {
  return (
    <Card className="overflow-hidden">
      <img
        className="h-36 w-full object-cover"
        src={restaurant.imagen ?? "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600"}
        alt={restaurant.nombre}
      />
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">{restaurant.nombre}</p>
            <p className="text-sm text-muted-foreground">{restaurant.categoria}</p>
          </div>
          <StatusBadge status={restaurant.abierto ? "abierto" : "cerrado"} />
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Star className="size-3" /> {restaurant.calificacion.toFixed(1)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" /> {restaurant.tiempoEstimado}
          </span>
          <span>S/ {(restaurant.tarifaEnvio / 100).toFixed(2)}</span>
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

export function ProductCard({ product }: { product: ProductoDisplay }) {
  return (
    <Card>
      <CardContent className="grid grid-cols-[88px_1fr] gap-3">
        <img
          className="h-24 w-22 rounded-lg object-cover"
          src={product.imagen ?? "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"}
          alt={product.nombre}
        />
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{product.nombre}</p>
              <p className="line-clamp-2 text-sm text-muted-foreground">{product.descripcion}</p>
            </div>
            <Button size="icon-sm" disabled={!product.disponible}>
              <Plus />
            </Button>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="font-semibold">S/ {(product.precio / 100).toFixed(2)}</p>
            <Badge variant={product.disponible ? "secondary" : "outline"}>
              {product.disponible ? "Disponible" : "No disponible"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProductAdminCard({ product, actions }: { product: ProductoDisplay; actions?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <img
          className="size-16 rounded-lg object-cover"
          src={product.imagen ?? "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"}
          alt={product.nombre}
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{product.nombre}</p>
          <p className="text-sm text-muted-foreground">{product.categoria}</p>
        </div>
        <p className="shrink-0 font-semibold">S/ {(product.precio / 100).toFixed(2)}</p>
        <Badge variant={product.disponible ? "secondary" : "outline"}>
          {product.disponible ? "Disponible" : "No disponible"}
        </Badge>
        {actions}
      </CardContent>
    </Card>
  );
}
