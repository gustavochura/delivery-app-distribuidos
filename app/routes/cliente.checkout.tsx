import { useEffect, useState } from "react";
import { Form, redirect, useFetcher, useLoaderData, useNavigation, useRouteLoaderData } from "react-router";
import { and, eq } from "drizzle-orm";
import { Home, Plus, ReceiptText, ShoppingCart, User } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { db } from "~/database/client.server";
import {
  carritosTable,
  carritoDetallesTable,
  direccionesTable,
  pagosTable,
  pedidoDetallesTable,
  pedidosTable,
  productosTable,
  restaurantesTable,
  seguimientoPedidosTable,
} from "~/database/schema";
import { requireCliente } from "~/lib/roles.server";
import { publishPedidoCreado } from "~/lib/qstash.server";
import { MobileBottomNav, RoleShell } from "~/components/delivery/common";
import { AddressPickerMap } from "~/components/delivery/address-picker-map";
import type { Route } from "./+types/cliente.checkout";

export async function loader({ request }: Route.LoaderArgs) {
  const { profiles } = await requireCliente(request);
  const clienteId = profiles.cliente!.id;

  const carritos = await db
    .select()
    .from(carritosTable)
    .where(and(eq(carritosTable.clienteId, clienteId), eq(carritosTable.estado, "activo")));

  if (carritos.length === 0) throw redirect("/cliente/carrito");

  const grupos = await Promise.all(
    carritos.map(async (carrito) => {
      const items = await db
        .select({
          productoId: carritoDetallesTable.productoId,
          nombre: productosTable.nombre,
          cantidad: carritoDetallesTable.cantidad,
          precioUnitario: carritoDetallesTable.precioUnitario,
          subtotal: carritoDetallesTable.subtotal,
        })
        .from(carritoDetallesTable)
        .innerJoin(productosTable, eq(productosTable.id, carritoDetallesTable.productoId))
        .where(eq(carritoDetallesTable.carritoId, carrito.id));

      const [restaurante] = await db
        .select({ nombre: restaurantesTable.nombre, tarifaEnvio: restaurantesTable.tarifaEnvio })
        .from(restaurantesTable)
        .where(eq(restaurantesTable.id, carrito.restauranteId))
        .limit(1);

      const subtotalGrupo = items.reduce((acc, i) => acc + i.subtotal, 0);
      const tarifaEnvio = restaurante?.tarifaEnvio ?? 400;
      return { carritoId: carrito.id, restauranteId: carrito.restauranteId, restauranteNombre: restaurante?.nombre ?? "Restaurante", items, subtotalGrupo, tarifaEnvio };
    }),
  );

  const direcciones = await db
    .select()
    .from(direccionesTable)
    .where(eq(direccionesTable.clienteId, clienteId));

  const gruposFiltrados = grupos.filter((g) => g.items.length > 0);
  const subtotal = gruposFiltrados.reduce((acc, g) => acc + g.subtotalGrupo, 0);
  const costoEnvio = gruposFiltrados.reduce((acc, g) => acc + g.tarifaEnvio, 0);
  const total = subtotal + costoEnvio;

  return { grupos: gruposFiltrados, direcciones, clienteId, subtotal, costoEnvio, total };
}

export async function action({ request }: Route.ActionArgs) {
  const { profiles } = await requireCliente(request);
  const clienteId = profiles.cliente!.id;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "nueva-direccion") {
    const direccionTexto = (formData.get("direccion") as string).trim();
    if (!direccionTexto) return null;
    const referencia = (formData.get("referencia") as string) || null;
    const latRaw = formData.get("latitud");
    const lngRaw = formData.get("longitud");
    const latitud = latRaw ? Number(latRaw) : null;
    const longitud = lngRaw ? Number(lngRaw) : null;

    const [nueva] = await db
      .insert(direccionesTable)
      .values({ clienteId, direccion: direccionTexto, referencia, latitud, longitud, principal: false })
      .returning();

    return { nuevaDireccion: nueva };
  }

  const direccionId = Number(formData.get("direccion_id"));
  const metodo = (formData.get("metodo") as string) ?? "efectivo";
  const notas = (formData.get("notas") as string) || null;

  const [direccion] = await db
    .select({ id: direccionesTable.id })
    .from(direccionesTable)
    .where(and(eq(direccionesTable.id, direccionId), eq(direccionesTable.clienteId, clienteId)))
    .limit(1);

  if (!direccion) throw redirect("/cliente/checkout");

  const carritos = await db
    .select()
    .from(carritosTable)
    .where(and(eq(carritosTable.clienteId, clienteId), eq(carritosTable.estado, "activo")));

  if (carritos.length === 0) throw redirect("/cliente/carrito");

  const pedidoIds: number[] = [];
  const qstashJobs: { pedidoId: number; restauranteId: number }[] = [];

  await db.transaction(async (tx) => {
    for (const carrito of carritos) {
      const items = await tx
        .select({
          productoId: carritoDetallesTable.productoId,
          nombre: productosTable.nombre,
          cantidad: carritoDetallesTable.cantidad,
          precioUnitario: carritoDetallesTable.precioUnitario,
          subtotal: carritoDetallesTable.subtotal,
        })
        .from(carritoDetallesTable)
        .innerJoin(productosTable, eq(productosTable.id, carritoDetallesTable.productoId))
        .where(eq(carritoDetallesTable.carritoId, carrito.id));

      if (items.length === 0) continue;

      const [restauranteInfo] = await tx
        .select({ tarifaEnvio: restaurantesTable.tarifaEnvio })
        .from(restaurantesTable)
        .where(eq(restaurantesTable.id, carrito.restauranteId))
        .limit(1);
      const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0);
      const costoEnvio = restauranteInfo?.tarifaEnvio ?? 400;
      const total = subtotal + costoEnvio;

      const [pedido] = await tx
        .insert(pedidosTable)
        .values({
          clienteId,
          restauranteId: carrito.restauranteId,
          direccionId,
          estado: "pendiente",
          subtotal,
          costoEnvio,
          total,
          notas,
        })
        .returning({ id: pedidosTable.id });

      await tx.insert(pedidoDetallesTable).values(
        items.map((i) => ({
          pedidoId: pedido.id,
          productoId: i.productoId,
          productoNombre: i.nombre,
          cantidad: i.cantidad,
          precioUnitario: i.precioUnitario,
          subtotal: i.subtotal,
        })),
      );

      await tx.insert(pagosTable).values({ pedidoId: pedido.id, monto: total, metodo, estado: "pendiente" });

      await tx.insert(seguimientoPedidosTable).values({
        pedidoId: pedido.id,
        estado: "pedido_creado",
        descripcion: "Pedido creado por el cliente",
      });

      await tx.update(carritosTable).set({ estado: "completado" }).where(eq(carritosTable.id, carrito.id));

      pedidoIds.push(pedido.id);
      qstashJobs.push({ pedidoId: pedido.id, restauranteId: carrito.restauranteId });
    }
  });

  // Publicar eventos QStash fuera de la transacción para no bloquearla con I/O externo
  for (const { pedidoId, restauranteId } of qstashJobs) {
    const qstash = await publishPedidoCreado({
      event: "pedido.creado",
      pedidoId,
      restauranteId,
      clienteId,
    });

    if (!qstash.published) {
      await db.insert(seguimientoPedidosTable).values({
        pedidoId,
        estado: qstash.reason === "missing_config" ? "qstash_no_configurado" : "qstash_error",
        descripcion:
          qstash.reason === "missing_config"
            ? "QStash no configurado: falta token, signing keys o APP_BASE_URL"
            : "No se pudo publicar el evento pedido.creado en QStash",
      });
    }
  }

  return redirect(`/cliente/pedidos/${pedidoIds[0]}`);
}

type Direccion = Awaited<ReturnType<typeof loader>>["direcciones"][number];

export default function ClienteCheckout() {
  const { grupos, direcciones: direccionesIniciales, subtotal, costoEnvio, total } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const fetcherDireccion = useFetcher<{ nuevaDireccion: Direccion }>();
  const isSavingDireccion = fetcherDireccion.state === "submitting";

  const inicial = direccionesIniciales.find((d) => d.principal) ?? direccionesIniciales[0];
  const [todasDirecciones, setTodasDirecciones] = useState<Direccion[]>(direccionesIniciales);
  const [selectedId, setSelectedId] = useState<number | null>(inicial?.id ?? null);
  const [showNueva, setShowNueva] = useState(direccionesIniciales.length === 0);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const nueva = fetcherDireccion.data?.nuevaDireccion;
    if (nueva) {
      setTodasDirecciones((prev) => [...prev, nueva]);
      setSelectedId(nueva.id);
      setShowNueva(false);
      setCoords(null);
    }
  }, [fetcherDireccion.data]);

  const layout = useRouteLoaderData("routes/layouts/cliente") as
    | { carritoCount: number; availableRoles: { key: string }[] }
    | undefined;
  const carritoCount = layout?.carritoCount ?? 0;
  const availableRoles = layout?.availableRoles ?? [];
  const nav = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/cliente/carrito", label: "Carrito", icon: ShoppingCart, badge: carritoCount },
    { href: "/cliente/pedidos", label: "Pedidos", icon: ReceiptText },
    ...(availableRoles.length > 1 ? [{ href: "/dashboard", label: "Roles", icon: User }] : []),
  ];

  return (
    <RoleShell title="Confirmar pedidos" description={`${grupos.length} pedido${grupos.length > 1 ? "s" : ""} a confirmar`}>
      <Form method="post">
        <input type="hidden" name="direccion_id" value={selectedId ?? ""} />
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Resumen por restaurante</CardTitle></CardHeader>
              <CardContent className="divide-y p-0">
                {grupos.map((g) => (
                  <div key={g.carritoId} className="px-6 py-4">
                    <p className="mb-3 font-semibold">{g.restauranteNombre}</p>
                    <div className="space-y-1.5">
                      {g.items.map((item) => (
                        <div key={item.productoId} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.nombre}
                            <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground">
                              x{item.cantidad}
                            </span>
                          </span>
                          <span className="tabular-nums">S/ {(item.subtotal / 100).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 space-y-1 border-t pt-3 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal productos</span>
                        <span className="tabular-nums">S/ {(g.subtotalGrupo / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Envío</span>
                        <span className="tabular-nums">S/ {(g.tarifaEnvio / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1 font-semibold">
                        <span>Total</span>
                        <span className="tabular-nums">S/ {((g.subtotalGrupo + g.tarifaEnvio) / 100).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Dirección de entrega</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {todasDirecciones.map((dir) => (
                  <button
                    key={dir.id}
                    type="button"
                    onClick={() => setSelectedId(dir.id)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left text-sm transition-colors",
                      selectedId === dir.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted",
                    )}
                  >
                    <p className="font-medium">{dir.direccion}</p>
                    {dir.referencia && (
                      <p className="text-muted-foreground">{dir.referencia}</p>
                    )}
                    {dir.principal && (
                      <span className="text-xs font-medium text-primary">Principal</span>
                    )}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setShowNueva((v) => !v)}
                  className="flex w-full items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
                >
                  <Plus className="size-4" />
                  Agregar nueva dirección
                </button>

                {showNueva && (
                  <fetcherDireccion.Form method="post" className="space-y-3 rounded-lg border p-3">
                    <input type="hidden" name="intent" value="nueva-direccion" />
                    <input type="hidden" name="latitud" value={coords?.lat ?? ""} />
                    <input type="hidden" name="longitud" value={coords?.lng ?? ""} />
                    <input
                      name="direccion"
                      required
                      placeholder="Ej. Av. La Cultura 1800, Ilo"
                      className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <input
                      name="referencia"
                      placeholder="Referencia (opcional)"
                      className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <AddressPickerMap onCoordinates={(lat, lng) => setCoords({ lat, lng })} />
                    <Button type="submit" size="sm" disabled={isSavingDireccion}>
                      {isSavingDireccion ? "Guardando…" : "Guardar y usar"}
                    </Button>
                  </fetcherDireccion.Form>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Método de pago</CardTitle></CardHeader>
              <CardContent>
                <select
                  name="metodo"
                  className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="yape">Yape/Plin</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Instrucciones para el repartidor</CardTitle></CardHeader>
              <CardContent>
                <textarea
                  name="notas"
                  className="min-h-24 w-full rounded-lg border bg-transparent p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Ej. llamar al llegar"
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <Card>
              <CardContent className="space-y-2 py-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal productos</span>
                  <span>S/ {(subtotal / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Envío ({grupos.length} restaurante{grupos.length > 1 ? "s" : ""})</span>
                  <span>S/ {(costoEnvio / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total</span>
                  <span>S/ {(total / 100).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
            <Button type="submit" className="w-full" disabled={!selectedId || isSubmitting}>
              {isSubmitting ? "Procesando…" : `Confirmar ${grupos.length > 1 ? `${grupos.length} pedidos` : "pedido"}`}
            </Button>
          </div>
        </div>
      </Form>
      <MobileBottomNav items={nav} />
    </RoleShell>
  );
}
