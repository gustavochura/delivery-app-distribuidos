import { useState } from "react";
import { Link, useLoaderData } from "react-router";
import { eq } from "drizzle-orm";
import { Pencil, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { db } from "~/database/client.server";
import { productosTable } from "~/database/schema";
import { requireRestauranteActive } from "~/lib/roles.server";
import { RoleShell, SearchBar } from "~/components/delivery/common";
import { ProductAdminCard } from "~/components/delivery/restaurant";
import type { Route } from "./+types/restaurante.productos";

export async function loader({ request }: Route.LoaderArgs) {
  const { activeRestauranteId: restauranteId } = await requireRestauranteActive(request);

  const productos = await db
    .select()
    .from(productosTable)
    .where(eq(productosTable.restauranteId, restauranteId));

  return { productos };
}


export default function RestauranteProductos() {
  const { productos } = useLoaderData<typeof loader>();
  const [q, setQ] = useState("");
  const categorias = Array.from(new Set(productos.map((p) => p.categoria).filter(Boolean)));
  const productosFiltrados = q.trim()
    ? productos.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q.toLowerCase()) ||
          p.categoria?.toLowerCase().includes(q.toLowerCase()),
      )
    : productos;

  return (
    <RoleShell
      title="Gestion de productos"
      description="Administra menu, precios y disponibilidad."
      actions={
        <Button nativeButton={false} render={<Link to="/restaurante/productos/nuevo" />}>
          <Plus /> Crear producto
        </Button>
      }
    >
      <div className="space-y-5">
        <SearchBar placeholder="Buscar producto" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex gap-2 flex-wrap">
          {categorias.map((cat) => (
            <span key={cat} className="rounded-full border px-3 py-1 text-sm">{cat}</span>
          ))}
        </div>
        <div className="space-y-3">
          {productosFiltrados.map((producto) => (
            <ProductAdminCard
              key={producto.id}
              product={producto}
              actions={
                <Button
                  nativeButton={false}
                  variant="ghost"
                  size="sm"
                  render={<Link to={`/restaurante/productos/${producto.id}`} />}
                >
                  <Pencil className="size-3.5" />
                  Editar
                </Button>
              }
            />
          ))}
        </div>
      </div>
    </RoleShell>
  );
}
