import { redirect } from "react-router";
import { eq } from "drizzle-orm";
import { auth } from "~/lib/auth.server";
import { db } from "~/database/client.server";
import {
  usuariosTable,
  clientesTable,
  repartidoresTable,
  restauranteAdminsTable,
  restaurantesTable,
} from "~/database/schema";

export type UserProfiles = {
  usuario: {
    id: number;
    nombre: string;
    email: string;
    isAdmin: boolean;
  };
  cliente: { id: number } | null;
  repartidor: { id: number; estado: string } | null;
  restauranteAdmin: { id: number; restauranteId: number } | null;
};

export async function getUserProfiles(
  authUserId: string,
): Promise<UserProfiles | null> {
  const rows = await db
    .select({
      usuarioId: usuariosTable.id,
      usuarioNombre: usuariosTable.nombre,
      usuarioEmail: usuariosTable.email,
      usuarioIsAdmin: usuariosTable.isAdmin,
      clienteId: clientesTable.id,
      repartidorId: repartidoresTable.id,
      repartidorEstado: repartidoresTable.estado,
      restauranteAdminId: restauranteAdminsTable.id,
      restauranteId: restauranteAdminsTable.restauranteId,
    })
    .from(usuariosTable)
    .leftJoin(clientesTable, eq(clientesTable.usuarioId, usuariosTable.id))
    .leftJoin(
      repartidoresTable,
      eq(repartidoresTable.usuarioId, usuariosTable.id),
    )
    .leftJoin(
      restauranteAdminsTable,
      eq(restauranteAdminsTable.usuarioId, usuariosTable.id),
    )
    .where(eq(usuariosTable.authUserId, authUserId))
    .limit(1);

  if (!rows[0]) return null;

  const row = rows[0];
  return {
    usuario: {
      id: row.usuarioId,
      nombre: row.usuarioNombre,
      email: row.usuarioEmail,
      isAdmin: row.usuarioIsAdmin,
    },
    cliente: row.clienteId != null ? { id: row.clienteId } : null,
    repartidor:
      row.repartidorId != null
        ? { id: row.repartidorId, estado: row.repartidorEstado! }
        : null,
    restauranteAdmin:
      row.restauranteAdminId != null
        ? { id: row.restauranteAdminId, restauranteId: row.restauranteId! }
        : null,
  };
}

async function requireSession(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw redirect("/sign-in");
  return session;
}

export async function requireCliente(request: Request) {
  const session = await requireSession(request);
  const profiles = await getUserProfiles(session.user.id);
  if (!profiles?.cliente) throw redirect("/dashboard");
  return { session, profiles };
}

export async function requireRepartidor(request: Request) {
  const session = await requireSession(request);
  const profiles = await getUserProfiles(session.user.id);
  if (!profiles?.repartidor) throw redirect("/dashboard");
  return { session, profiles };
}

export async function requireRestaurante(request: Request) {
  const session = await requireSession(request);
  const profiles = await getUserProfiles(session.user.id);
  if (!profiles?.restauranteAdmin) throw redirect("/dashboard");
  return { session, profiles };
}

export async function requireAdmin(request: Request) {
  const session = await requireSession(request);
  const profiles = await getUserProfiles(session.user.id);
  if (!profiles?.usuario.isAdmin) throw redirect("/dashboard");
  return { session, profiles };
}

export async function getAllRestaurantesForAdmin(authUserId: string) {
  return db
    .select({
      restauranteAdminId: restauranteAdminsTable.id,
      restauranteId: restaurantesTable.id,
      nombre: restaurantesTable.nombre,
      abierto: restaurantesTable.abierto,
    })
    .from(restauranteAdminsTable)
    .innerJoin(restaurantesTable, eq(restaurantesTable.id, restauranteAdminsTable.restauranteId))
    .innerJoin(usuariosTable, eq(usuariosTable.id, restauranteAdminsTable.usuarioId))
    .where(eq(usuariosTable.authUserId, authUserId));
}

export function getRestauranteIdFromCookie(request: Request): number | null {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/\brestaurante_id=(\d+)\b/);
  return match ? Number(match[1]) : null;
}

export async function requireRestauranteActive(request: Request) {
  const session = await requireSession(request);
  const profiles = await getUserProfiles(session.user.id);
  if (!profiles?.restauranteAdmin) throw redirect("/dashboard");

  const restaurantes = await getAllRestaurantesForAdmin(session.user.id);
  const cookieId = getRestauranteIdFromCookie(request);
  const active = restaurantes.find((r) => r.restauranteId === cookieId) ?? restaurantes[0];
  if (!active) throw redirect("/dashboard");

  return { session, profiles, activeRestauranteId: active.restauranteId, restaurantes };
}
