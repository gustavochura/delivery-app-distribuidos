import { useState } from "react";
import { Link, useFetcher, useLoaderData } from "react-router";
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

export async function action({ request }: Route.ActionArgs) {
  const { activeRestauranteId: restauranteId } = await requireRestauranteActive(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "toggle-availability") {
    const productoId = Number(formData.get("producto_id"));
    const disponible = formData.get("disponible") === "true";

    const [producto] = await db
      .select({ restauranteId: productosTable.restauranteId })
      .from(productosTable)
      .where(eq(productosTable.id, productoId))
      .limit(1);

    if (producto?.restauranteId === restauranteId) {
      await db
        .update(productosTable)
        .set({ disponible: !disponible })
        .where(eq(productosTable.id, productoId));
    }
  }

  return null;
}

function ToggleDisponibleButton({ producto }: { producto: { id: number; disponible: boolean } }) {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";
  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value="toggle-availability" />
      <input type="hidden" name="producto_id" value={producto.id} />
      <input type="hidden" name="disponible" value={String(producto.disponible)} />
      <Button type="submit" variant="ghost" size="sm" disabled={isSubmitting}>
        {isSubmitting ? "…" : producto.disponible ? "Pausar" : "Activar"}
      </Button>
    </fetcher.Form>
  );
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
                <>
                  <Button
                    nativeButton={false}
                    variant="ghost"
                    size="sm"
                    render={<Link to={`/restaurante/productos/${producto.id}`} />}
                  >
                    <Pencil className="size-3.5" />
                    Editar
                  </Button>
                  <ToggleDisponibleButton producto={producto} />
                </>
              }
            />
          ))}
        </div>
      </div>
    </RoleShell>
  );
}
