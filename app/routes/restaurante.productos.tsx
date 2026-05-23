import { Link } from "react-router";
import { Plus } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { products } from "~/data/mock-delivery";
import { RoleShell, SearchBar } from "~/components/delivery/common";
import { ProductAdminCard } from "~/components/delivery/restaurant";

export default function RestauranteProductos() {
  return (
    <RoleShell
      title="Gestion de productos"
      description="Administra menu, precios y disponibilidad."
      actions={<Button nativeButton={false} render={<Link to="/restaurante/productos/nuevo" />}><Plus /> Crear producto</Button>}
    >
      <div className="space-y-5">
        <SearchBar placeholder="Buscar producto" />
        <div className="flex gap-2">
          <Badge variant="secondary">Todos</Badge>
          <Badge variant="outline">Combos</Badge>
          <Badge variant="outline">Bebidas</Badge>
          <Badge variant="outline">Extras</Badge>
        </div>
        <div className="space-y-3">
          {products.map((product) => (
            <ProductAdminCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </RoleShell>
  );
}
