import { useState, useEffect, useRef, useMemo } from "react";
import { Link, redirect, useFetcher, useLoaderData, useRouteLoaderData } from "react-router";
import { and, eq } from "drizzle-orm";
import { Check, Home, Plus, ReceiptText, ShoppingCart, Star, User } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { db } from "~/database/client.server";
import {
  carritosTable,
  carritoDetallesTable,
  productosTable,
  restaurantesTable,
} from "~/database/schema";
import { requireCliente } from "~/lib/roles.server";
import { auth } from "~/lib/auth.server";
import { getUserProfiles } from "~/lib/roles.server";
import { MobileBottomNav, RoleShell } from "~/components/delivery/common";
import type { ProductoDisplay } from "~/components/delivery/restaurant";
import type { Route } from "./+types/cliente.restaurante-detalle";

export async function loader({ request, params }: Route.LoaderArgs) {
  const id = Number(params.restaurante_id);
  if (!id) throw redirect("/cliente/restaurantes");

  const [restaurante] = await db
    .select()
    .from(restaurantesTable)
    .where(and(eq(restaurantesTable.id, id), eq(restaurantesTable.activo, true)))
    .limit(1);

  if (!restaurante) throw redirect("/cliente/restaurantes");

  const productos = await db
    .select()
    .from(productosTable)
    .where(eq(productosTable.restauranteId, id));

  // Check if user is logged in (optional) to show cart button
  const session = await auth.api.getSession({ headers: request.headers });
  let carritoCount = 0;
  if (session) {
    const profiles = await getUserProfiles(session.user.id);
    if (profiles?.cliente) {
      const items = await db
        .select({ cantidad: carritoDetallesTable.cantidad })
        .from(carritoDetallesTable)
        .innerJoin(carritosTable, eq(carritosTable.id, carritoDetallesTable.carritoId))
        .where(
          and(
            eq(carritosTable.clienteId, profiles.cliente.id),
            eq(carritosTable.estado, "activo"),
          ),
        );
      carritoCount = items.reduce((acc, i) => acc + i.cantidad, 0);
    }
  }

  return { restaurante, productos, carritoCount };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { profiles } = await requireCliente(request);
  const clienteId = profiles.cliente!.id;
  const restauranteId = Number(params.restaurante_id);
  const formData = await request.formData();
  const productoId = Number(formData.get("producto_id"));

  // Load product to get price
  const [producto] = await db
    .select()
    .from(productosTable)
    .where(and(
      eq(productosTable.id, productoId),
      eq(productosTable.restauranteId, restauranteId),
      eq(productosTable.disponible, true),
    ))
    .limit(1);

  if (!producto) return null;

  // Get or create active cart for THIS specific restaurant
  let [carrito] = await db
    .select()
    .from(carritosTable)
    .where(
      and(
        eq(carritosTable.clienteId, clienteId),
        eq(carritosTable.restauranteId, restauranteId),
        eq(carritosTable.estado, "activo"),
      ),
    )
    .limit(1);

  if (!carrito) {
    const [nuevo] = await db
      .insert(carritosTable)
      .values({ clienteId, restauranteId, estado: "activo", total: 0 })
      .returning();
    carrito = nuevo;
  }

  // Upsert: increase quantity if already in cart, else insert
  const [existing] = await db
    .select()
    .from(carritoDetallesTable)
    .where(
      and(
        eq(carritoDetallesTable.carritoId, carrito.id),
        eq(carritoDetallesTable.productoId, productoId),
      ),
    )
    .limit(1);

  if (existing) {
    const nuevaCantidad = existing.cantidad + 1;
    await db
      .update(carritoDetallesTable)
      .set({ cantidad: nuevaCantidad, subtotal: nuevaCantidad * producto.precio })
      .where(eq(carritoDetallesTable.id, existing.id));
  } else {
    await db.insert(carritoDetallesTable).values({
      carritoId: carrito.id,
      productoId,
      cantidad: 1,
      precioUnitario: producto.precio,
      subtotal: producto.precio,
    });
  }

  return null;
}

function ProductCardWithAdd({ product }: { product: ProductoDisplay }) {
  const fetcher = useFetcher();
  const [added, setAdded] = useState(false);
  const prevState = useRef(fetcher.state);

  useEffect(() => {
    if (prevState.current === "submitting" && fetcher.state === "idle") {
      setAdded(true);
      const timer = setTimeout(() => setAdded(false), 900);
      return () => clearTimeout(timer);
    }
    prevState.current = fetcher.state;
  }, [fetcher.state]);

  const isSubmitting = fetcher.state === "submitting";

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
            <fetcher.Form method="post">
              <input type="hidden" name="producto_id" value={product.id} />
              <Button
                type="submit"
                size="icon-sm"
                disabled={!product.disponible || isSubmitting}
                variant={added ? "default" : "outline"}
                className="transition-all duration-200"
              >
                {added ? <Check className="size-3" /> : <Plus />}
              </Button>
            </fetcher.Form>
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

export default function ClienteRestauranteDetalle() {
  const { restaurante, productos, carritoCount } = useLoaderData<typeof loader>();
  const layout = useRouteLoaderData("routes/layouts/cliente-browsing") as
    | { carritoCount: number; availableRoles: { key: string }[] }
    | undefined;
  const availableRoles = layout?.availableRoles ?? [];
  const nav = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/cliente/carrito", label: "Carrito", icon: ShoppingCart, badge: carritoCount },
    { href: "/cliente/pedidos", label: "Pedidos", icon: ReceiptText },
    ...(availableRoles.length > 1 ? [{ href: "/dashboard", label: "Roles", icon: User }] : []),
  ];
  const categorias = Array.from(new Set(productos.map((p) => p.categoria).filter(Boolean)));
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const productosFiltrados = useMemo(
    () => categoriaActiva ? productos.filter((p) => p.categoria === categoriaActiva) : productos,
    [productos, categoriaActiva],
  );

  return (
    <RoleShell title={restaurante.nombre} description={restaurante.direccion}>
      <div className="space-y-6 pb-20">
        <Card className="overflow-hidden">
          <img
            className="h-56 w-full object-cover"
            src={restaurante.imagen ?? "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200"}
            alt={restaurante.nombre}
          />
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{restaurante.categoria}</p>
                <div className="mt-2 flex gap-2">
                  <Badge variant="secondary">
                    <Star className="size-3" /> {restaurante.calificacion.toFixed(1)}
                  </Badge>
                  <Badge variant="outline">{restaurante.tiempoEstimado}</Badge>
                  <Badge>{restaurante.abierto ? "abierto" : "cerrado"}</Badge>
                </div>
              </div>
              <Button nativeButton={false} render={<Link to="/cliente/carrito" />}>
                <ShoppingCart />
                Ver carrito {carritoCount > 0 && `(${carritoCount})`}
              </Button>
            </div>
          </CardContent>
        </Card>
        {categorias.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {categorias.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaActiva(cat === categoriaActiva ? null : cat)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-sm transition-colors",
                  cat === categoriaActiva
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
        <div className="grid gap-3 lg:grid-cols-2">
          {productosFiltrados.map((producto) => (
            <ProductCardWithAdd key={producto.id} product={producto} />
          ))}
        </div>
      </div>
      <MobileBottomNav items={nav} />
    </RoleShell>
  );
}
