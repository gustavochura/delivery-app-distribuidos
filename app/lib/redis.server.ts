import { Redis } from "@upstash/redis";

export type DriverLocation = {
  lat: number;
  lng: number;
  repartidorId: number;
  pedidoId: number;
  updatedAt: string;
};

let redis: Redis | null | undefined;

function getRedis() {
  if (redis !== undefined) return redis;

  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    redis = null;
    return redis;
  }

  try {
    redis = Redis.fromEnv();
  } catch {
    redis = null;
  }

  return redis;
}

function getDriverLocationKey(pedidoId: number) {
  return `delivery:pedido:${pedidoId}:driver-location`;
}

export function isRedisConfigured() {
  return getRedis() !== null;
}

export async function saveDriverLocation(input: {
  pedidoId: number;
  repartidorId: number;
  lat: number;
  lng: number;
}) {
  const client = getRedis();
  if (!client) return { saved: false };

  const location: DriverLocation = {
    ...input,
    updatedAt: new Date().toISOString(),
  };

  try {
    await client.set(getDriverLocationKey(input.pedidoId), location, {
      ex: 60 * 60,
    });
  } catch {
    return { saved: false };
  }

  return { saved: true, location };
}

export async function getDriverLocation(pedidoId: number) {
  const client = getRedis();
  if (!client) return null;

  try {
    return await client.get<DriverLocation>(getDriverLocationKey(pedidoId));
  } catch {
    return null;
  }
}

export async function deleteDriverLocation(pedidoId: number) {
  const client = getRedis();
  if (!client) return;

  try {
    await client.del(getDriverLocationKey(pedidoId));
  } catch {
    // Redis is a volatile middleware cache; delivery state remains in Turso.
  }
}
