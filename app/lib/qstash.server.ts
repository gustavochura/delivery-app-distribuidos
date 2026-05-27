import { Client, Receiver } from "@upstash/qstash";

export type PedidoCreadoEvent = {
  event: "pedido.creado";
  pedidoId: number;
  restauranteId: number;
  clienteId: number;
};

type PublishPedidoCreadoResult =
  | { published: true; messageId?: string }
  | { published: false; reason: "missing_config" | "publish_error" };

let client: Client | null | undefined;
let receiver: Receiver | null | undefined;

function getAppBaseUrl() {
  return process.env.APP_BASE_URL?.replace(/\/+$/, "") ?? null;
}

function getQstashClient() {
  if (client !== undefined) return client;

  if (!process.env.QSTASH_TOKEN) {
    client = null;
    return client;
  }

  client = new Client({
    token: process.env.QSTASH_TOKEN,
    enableTelemetry: false,
  });
  return client;
}

function getQstashReceiver() {
  if (receiver !== undefined) return receiver;

  if (
    !process.env.QSTASH_CURRENT_SIGNING_KEY ||
    !process.env.QSTASH_NEXT_SIGNING_KEY
  ) {
    receiver = null;
    return receiver;
  }

  receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
  });
  return receiver;
}

function hasQstashSigningKeys() {
  return Boolean(
    process.env.QSTASH_CURRENT_SIGNING_KEY &&
      process.env.QSTASH_NEXT_SIGNING_KEY,
  );
}

export function getPedidoCreadoUrl() {
  const baseUrl = getAppBaseUrl();
  if (!baseUrl) return null;
  return `${baseUrl}/api/qstash/pedido-creado`;
}

export async function publishPedidoCreado(
  body: PedidoCreadoEvent,
): Promise<PublishPedidoCreadoResult> {
  const qstash = getQstashClient();
  const url = getPedidoCreadoUrl();

  if (!qstash || !url || !hasQstashSigningKeys()) {
    return { published: false, reason: "missing_config" };
  }

  try {
    const response = await qstash.publishJSON({
      url,
      body,
      deduplicationId: `pedido-creado-${body.pedidoId}`,
      retries: 3,
      label: "pedido.creado",
    });

    return {
      published: true,
      messageId: "messageId" in response ? response.messageId : undefined,
    };
  } catch {
    return { published: false, reason: "publish_error" };
  }
}

export async function verifyQstashSignature({
  body,
  signature,
  upstashRegion,
}: {
  body: string;
  signature: string;
  upstashRegion?: string | null;
}) {
  const qstashReceiver = getQstashReceiver();
  const url = getPedidoCreadoUrl();

  if (!qstashReceiver || !url) return false;

  try {
    return await qstashReceiver.verify({
      body,
      signature,
      url,
      upstashRegion: upstashRegion ?? undefined,
    });
  } catch {
    return false;
  }
}
