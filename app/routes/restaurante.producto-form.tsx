import { useState } from "react";
import { Form, redirect, useLoaderData, useNavigation } from "react-router";
import { and, eq } from "drizzle-orm";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { db } from "~/database/client.server";
import { productosTable } from "~/database/schema";
import { requireRestauranteActive } from "~/lib/roles.server";
import { RoleShell } from "~/components/delivery/common";
import type { Route } from "./+types/restaurante.producto-form";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { activeRestauranteId: restauranteId } = await requireRestauranteActive(request);

  const esNuevo = params.producto_id === "nuevo";
  const productoId = esNuevo ? null : Number(params.producto_id);
  let producto = null;

  if (productoId) {
    const [found] = await db
      .select()
      .from(productosTable)
      .where(
        and(eq(productosTable.id, productoId), eq(productosTable.restauranteId, restauranteId)),
      )
      .limit(1);
    producto = found ?? null;
    if (!producto) throw redirect("/restaurante/productos");
  }

  return { producto, restauranteId };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { activeRestauranteId: restauranteId } = await requireRestauranteActive(request);
  const formData = await request.formData();

  const nombre = (formData.get("nombre") as string).trim();
  const descripcion = (formData.get("descripcion") as string) || null;
  const categoria = (formData.get("categoria") as string) || null;
  const imagen = (formData.get("imagen") as string) || null;
  const precio = Math.round(Number(formData.get("precio")) * 100);
  const disponible = formData.get("disponible") === "on";

  if (!nombre || isNaN(precio) || precio <= 0) return null;

  const esNuevo = params.producto_id === "nuevo";
  const productoId = esNuevo ? null : Number(params.producto_id);

  if (productoId) {
    const [existing] = await db
      .select({ restauranteId: productosTable.restauranteId })
      .from(productosTable)
      .where(eq(productosTable.id, productoId))
      .limit(1);

    if (existing?.restauranteId !== restauranteId) throw redirect("/restaurante/productos");

    await db
      .update(productosTable)
      .set({ nombre, descripcion, categoria, imagen, precio, disponible })
      .where(eq(productosTable.id, productoId));
  } else {
    await db.insert(productosTable).values({
      restauranteId,
      nombre,
      descripcion,
      categoria,
      imagen,
      precio,
      disponible,
    });
  }

  return redirect("/restaurante/productos");
}

export default function RestauranteProductoForm() {
  const { producto } = useLoaderData<typeof loader>();
  const esEdicion = !!producto;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [disponible, setDisponible] = useState(producto?.disponible ?? true);

  return (
    <RoleShell
      title={esEdicion ? "Editar producto" : "Crear producto"}
      description="Completa los datos del producto."
    >
      <Form method="post" className="max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>{esEdicion ? "Editar" : "Nuevo"} producto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Nombre *</label>
              <input
                name="nombre"
                defaultValue={producto?.nombre ?? ""}
                required
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Descripcion</label>
              <textarea
                name="descripcion"
                defaultValue={producto?.descripcion ?? ""}
                rows={3}
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Categoria</label>
              <input
                name="categoria"
                defaultValue={producto?.categoria ?? ""}
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Ej. Combos, Bebidas, Extras"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Imagen (URL)</label>
              <input
                name="imagen"
                defaultValue={producto?.imagen ?? ""}
                type="url"
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Precio (S/) *</label>
              <input
                name="precio"
                defaultValue={producto ? (producto.precio / 100).toFixed(2) : ""}
                type="number"
                min="0"
                step="0.01"
                required
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
              <div>
                <Label className="font-medium">Disponible</Label>
                <p className="text-xs text-muted-foreground">
                  El producto aparece en el menú del restaurante
                </p>
              </div>
              <input type="hidden" name="disponible" value={disponible ? "on" : ""} />
              <Switch checked={disponible} onCheckedChange={setDisponible} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear producto"}
              </Button>
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => history.back()}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </Form>
    </RoleShell>
  );
}
