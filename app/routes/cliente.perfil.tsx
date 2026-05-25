import { useState, useEffect } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { and, eq } from "drizzle-orm";
import { MapPin, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { db } from "~/database/client.server";
import { direccionesTable, usuariosTable } from "~/database/schema";
import { requireCliente } from "~/lib/roles.server";
import { RoleShell } from "~/components/delivery/common";
import { AddressPickerMap } from "~/components/delivery/address-picker-map";
import type { Route } from "./+types/cliente.perfil";

export async function loader({ request }: Route.LoaderArgs) {
  const { profiles } = await requireCliente(request);
  const clienteId = profiles.cliente!.id;

  const [usuario] = await db
    .select({ nombre: usuariosTable.nombre, email: usuariosTable.email, telefono: usuariosTable.telefono })
    .from(usuariosTable)
    .where(eq(usuariosTable.id, profiles.usuario.id))
    .limit(1);

  const direcciones = await db
    .select()
    .from(direccionesTable)
    .where(eq(direccionesTable.clienteId, clienteId));

  return { usuario: usuario!, clienteId, direcciones };
}

export async function action({ request }: Route.ActionArgs) {
  const { profiles } = await requireCliente(request);
  const clienteId = profiles.cliente!.id;
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "update-perfil") {
    const nombre = (formData.get("nombre") as string).trim();
    const telefono = (formData.get("telefono") as string).trim() || null;
    if (!nombre) return null;
    await db
      .update(usuariosTable)
      .set({ nombre, telefono })
      .where(eq(usuariosTable.id, profiles.usuario.id));
    return { ok: true };
  }

  if (intent === "nueva-direccion") {
    const direccion = (formData.get("direccion") as string).trim();
    if (!direccion) return null;
    const referencia = (formData.get("referencia") as string).trim() || null;
    const latRaw = formData.get("latitud");
    const lngRaw = formData.get("longitud");
    const latitud = latRaw ? Number(latRaw) : null;
    const longitud = lngRaw ? Number(lngRaw) : null;
    const [nueva] = await db
      .insert(direccionesTable)
      .values({ clienteId, direccion, referencia, latitud, longitud, principal: false })
      .returning();
    return { nuevaDireccion: nueva };
  }

  if (intent === "set-principal") {
    const id = Number(formData.get("id"));
    const [check] = await db
      .select({ id: direccionesTable.id })
      .from(direccionesTable)
      .where(and(eq(direccionesTable.id, id), eq(direccionesTable.clienteId, clienteId)))
      .limit(1);
    if (check) {
      await db.update(direccionesTable).set({ principal: false }).where(eq(direccionesTable.clienteId, clienteId));
      await db.update(direccionesTable).set({ principal: true }).where(eq(direccionesTable.id, id));
    }
    return null;
  }

  if (intent === "delete-direccion") {
    const id = Number(formData.get("id"));
    const [check] = await db
      .select({ id: direccionesTable.id })
      .from(direccionesTable)
      .where(and(eq(direccionesTable.id, id), eq(direccionesTable.clienteId, clienteId)))
      .limit(1);
    if (check) {
      await db.delete(direccionesTable).where(eq(direccionesTable.id, id));
    }
    return null;
  }

  return null;
}

type Direccion = Awaited<ReturnType<typeof loader>>["direcciones"][number];

export default function ClientePerfil() {
  const { usuario, direcciones: direccionesIniciales } = useLoaderData<typeof loader>();

  const fetcherPerfil = useFetcher<{ ok: boolean }>();
  const fetcherDireccion = useFetcher<{ nuevaDireccion: Direccion }>();
  const fetcherAccion = useFetcher();

  const [direcciones, setDirecciones] = useState<Direccion[]>(direccionesIniciales);
  const [showNueva, setShowNueva] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const isSavingPerfil = fetcherPerfil.state === "submitting";

  useEffect(() => {
    const nueva = fetcherDireccion.data?.nuevaDireccion;
    if (nueva) {
      setDirecciones((prev) => [...prev, nueva]);
      setShowNueva(false);
      setCoords(null);
    }
  }, [fetcherDireccion.data]);

  function markPrincipal(id: number) {
    setDirecciones((prev) => prev.map((d) => ({ ...d, principal: d.id === id })));
    fetcherAccion.submit({ intent: "set-principal", id: String(id) }, { method: "post" });
  }

  function deleteDireccion(id: number) {
    setDirecciones((prev) => prev.filter((d) => d.id !== id));
    fetcherAccion.submit({ intent: "delete-direccion", id: String(id) }, { method: "post" });
  }

  return (
    <RoleShell title="Mi perfil" description="Gestiona tu información y direcciones de entrega.">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">

        {/* Información personal */}
        <Card>
          <CardHeader><CardTitle>Información personal</CardTitle></CardHeader>
          <CardContent>
            <fetcherPerfil.Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="update-perfil" />
              <div>
                <Label>Nombre</Label>
                <input
                  name="nombre"
                  defaultValue={usuario.nombre}
                  required
                  className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <Label>Teléfono</Label>
                <input
                  name="telefono"
                  defaultValue={usuario.telefono ?? ""}
                  placeholder="Ej. 999 888 777"
                  className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">Correo electrónico</Label>
                <p className="mt-1 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  {usuario.email}
                </p>
              </div>
              <Button type="submit" disabled={isSavingPerfil}>
                {isSavingPerfil ? "Guardando…" : "Guardar cambios"}
              </Button>
              {fetcherPerfil.data?.ok && (
                <p className="text-sm text-green-600">Cambios guardados.</p>
              )}
            </fetcherPerfil.Form>
          </CardContent>
        </Card>

        {/* Direcciones de entrega */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Direcciones de entrega</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {direcciones.length === 0 && (
                <p className="text-sm text-muted-foreground">No tienes direcciones guardadas.</p>
              )}
              {direcciones.map((dir) => (
                <div
                  key={dir.id}
                  className={cn(
                    "flex items-start justify-between gap-3 rounded-lg border p-3",
                    dir.principal && "border-primary bg-primary/5",
                  )}
                >
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                      <p className="font-medium truncate">{dir.direccion}</p>
                    </div>
                    {dir.referencia && (
                      <p className="ml-5 text-muted-foreground">{dir.referencia}</p>
                    )}
                    {dir.principal && (
                      <p className="ml-5 text-xs font-medium text-primary">Principal</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      title={dir.principal ? "Dirección principal" : "Marcar como principal"}
                      disabled={dir.principal}
                      onClick={() => markPrincipal(dir.id)}
                    >
                      <Star
                        className="size-3.5"
                        fill={dir.principal ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth={dir.principal ? 0 : 1.5}
                        color={dir.principal ? "var(--primary)" : undefined}
                      />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      title="Eliminar"
                      onClick={() => deleteDireccion(dir.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setShowNueva((v) => !v)}
                className="flex w-full items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                <Plus className="size-4" /> Agregar dirección
              </button>
            </CardContent>
          </Card>

          {showNueva && (
            <Card>
              <CardHeader><CardTitle>Nueva dirección</CardTitle></CardHeader>
              <CardContent>
                <fetcherDireccion.Form method="post" className="space-y-3">
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
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={fetcherDireccion.state === "submitting"}>
                      {fetcherDireccion.state === "submitting" ? "Guardando…" : "Guardar"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setShowNueva(false)}>
                      Cancelar
                    </Button>
                  </div>
                </fetcherDireccion.Form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </RoleShell>
  );
}
