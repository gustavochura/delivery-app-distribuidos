import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { and, eq } from "drizzle-orm";
import { db } from "~/database/client.server";
import { pedidosTable, seguimientoPedidosTable } from "~/database/schema";
import {
  type PedidoCreadoEvent,
  verifyQstashSignature,
} from "~/lib/qstash.server";

function json(body: unknown, init?: ResponseInit) {
  return Response.json(body, init);
}

function isPedidoCreadoEvent(value: unknown): value is PedidoCreadoEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;

  return (
    event.event === "pedido.creado" &&
    Number.isInteger(event.pedidoId) &&
    Number.isInteger(event.restauranteId) &&
    Number.isInteger(event.clienteId)
  );
}

export async function loader(_: LoaderFunctionArgs) {
  return json({ error: "Method not allowed" }, { status: 405 });
}

export async function action({ request }: ActionFunctionArgs) {
  const rawBody = await request.text();
  const signature = request.headers.get("Upstash-Signature");

  if (!signature) {
    return json({ error: "Missing QStash signature" }, { status: 401 });
  }

  const isValid = await verifyQstashSignature({
    body: rawBody,
    signature,
    upstashRegion: request.headers.get("Upstash-Region"),
  });

  if (!isValid) {
    return json({ error: "Invalid QStash signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!isPedidoCreadoEvent(payload)) {
    return json({ error: "Invalid pedido.creado payload" }, { status: 400 });
  }

  const [pedido] = await db
    .select({
      id: pedidosTable.id,
      clienteId: pedidosTable.clienteId,
      restauranteId: pedidosTable.restauranteId,
    })
    .from(pedidosTable)
    .where(eq(pedidosTable.id, payload.pedidoId))
    .limit(1);

  if (
    !pedido ||
    pedido.clienteId !== payload.clienteId ||
    pedido.restauranteId !== payload.restauranteId
  ) {
    return json({ error: "Pedido not found" }, { status: 404 });
  }

  const [existing] = await db
    .select({ id: seguimientoPedidosTable.id })
    .from(seguimientoPedidosTable)
    .where(
      and(
        eq(seguimientoPedidosTable.pedidoId, payload.pedidoId),
        eq(seguimientoPedidosTable.estado, "qstash_pedido_creado"),
      ),
    )
    .limit(1);

  if (existing) {
    return json({ ok: true, duplicate: true });
  }

  await db.insert(seguimientoPedidosTable).values({
    pedidoId: payload.pedidoId,
    estado: "qstash_pedido_creado",
    descripcion: "Evento pedido.creado recibido desde Upstash QStash",
  });

  return json({ ok: true, duplicate: false });
}
