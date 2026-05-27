import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
};

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const usuariosTable = sqliteTable("usuarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  authUserId: text("auth_user_id")
    .unique()
    .references(() => user.id, { onDelete: "set null" }),
  nombre: text("nombre").notNull(),
  email: text("email").notNull().unique(),
  telefono: text("telefono"),
  isAdmin: integer("is_admin", { mode: "boolean" }).default(false).notNull(),
  ...timestamps,
});

export const clientesTable = sqliteTable("clientes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  usuarioId: integer("usuario_id")
    .notNull()
    .unique()
    .references(() => usuariosTable.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const repartidoresTable = sqliteTable("repartidores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  usuarioId: integer("usuario_id")
    .notNull()
    .unique()
    .references(() => usuariosTable.id, { onDelete: "cascade" }),
  estado: text("estado").default("disponible").notNull(),
  ...timestamps,
});

export const restaurantesTable = sqliteTable("restaurantes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  categoria: text("categoria"),
  telefono: text("telefono"),
  direccion: text("direccion").notNull(),
  imagen: text("imagen"),
  calificacion: real("calificacion").default(5.0).notNull(),
  tiempoEstimado: text("tiempo_estimado").default("30-40 min").notNull(),
  tarifaEnvio: integer("tarifa_envio").default(0).notNull(),
  abierto: integer("abierto", { mode: "boolean" }).default(true).notNull(),
  activo: integer("activo", { mode: "boolean" }).default(true).notNull(),
  ...timestamps,
});

export const restauranteAdminsTable = sqliteTable(
  "restaurante_admins",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuariosTable.id, { onDelete: "cascade" }),
    restauranteId: integer("restaurante_id")
      .notNull()
      .references(() => restaurantesTable.id, { onDelete: "cascade" }),
    rol: text("rol").default("admin").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("restaurante_admins_usuario_restaurante_unique").on(
      table.usuarioId,
      table.restauranteId,
    ),
  ],
);

export const productosTable = sqliteTable("productos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  restauranteId: integer("restaurante_id")
    .notNull()
    .references(() => restaurantesTable.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  categoria: text("categoria"),
  imagen: text("imagen"),
  precio: integer("precio").notNull(),
  disponible: integer("disponible", { mode: "boolean" }).default(true).notNull(),
  ...timestamps,
});

export const direccionesTable = sqliteTable("direcciones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clienteId: integer("cliente_id")
    .notNull()
    .references(() => clientesTable.id, { onDelete: "cascade" }),
  direccion: text("direccion").notNull(),
  referencia: text("referencia"),
  latitud: real("latitud"),
  longitud: real("longitud"),
  principal: integer("principal", { mode: "boolean" }).default(false).notNull(),
  ...timestamps,
});

export const carritosTable = sqliteTable("carritos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clienteId: integer("cliente_id")
    .notNull()
    .references(() => clientesTable.id, { onDelete: "cascade" }),
  restauranteId: integer("restaurante_id")
    .notNull()
    .references(() => restaurantesTable.id, { onDelete: "cascade" }),
  estado: text("estado").default("activo").notNull(),
  total: integer("total").default(0).notNull(),
  ...timestamps,
}, (table) => [
  index("carritos_cliente_estado_idx").on(table.clienteId, table.estado),
]);

export const carritoDetallesTable = sqliteTable(
  "carrito_detalles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    carritoId: integer("carrito_id")
      .notNull()
      .references(() => carritosTable.id, { onDelete: "cascade" }),
    productoId: integer("producto_id")
      .notNull()
      .references(() => productosTable.id, { onDelete: "restrict" }),
    cantidad: integer("cantidad").default(1).notNull(),
    precioUnitario: integer("precio_unitario").notNull(),
    subtotal: integer("subtotal").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("carrito_detalles_carrito_producto_unique").on(
      table.carritoId,
      table.productoId,
    ),
  ],
);

export const pedidosTable = sqliteTable("pedidos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clienteId: integer("cliente_id")
    .notNull()
    .references(() => clientesTable.id, { onDelete: "restrict" }),
  restauranteId: integer("restaurante_id")
    .notNull()
    .references(() => restaurantesTable.id, { onDelete: "restrict" }),
  repartidorId: integer("repartidor_id").references(() => repartidoresTable.id, {
    onDelete: "set null",
  }),
  direccionId: integer("direccion_id")
    .notNull()
    .references(() => direccionesTable.id, { onDelete: "restrict" }),
  estado: text("estado").default("pendiente").notNull(),
  subtotal: integer("subtotal").default(0).notNull(),
  costoEnvio: integer("costo_envio").default(0).notNull(),
  total: integer("total").default(0).notNull(),
  notas: text("notas"),
  ...timestamps,
}, (table) => [
  index("pedidos_restaurante_estado_idx").on(table.restauranteId, table.estado),
  index("pedidos_repartidor_idx").on(table.repartidorId),
  index("pedidos_cliente_idx").on(table.clienteId),
]);

export const pedidoDetallesTable = sqliteTable("pedido_detalles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pedidoId: integer("pedido_id")
    .notNull()
    .references(() => pedidosTable.id, { onDelete: "cascade" }),
  productoId: integer("producto_id")
    .notNull()
    .references(() => productosTable.id, { onDelete: "restrict" }),
  productoNombre: text("producto_nombre").notNull(),
  cantidad: integer("cantidad").notNull(),
  precioUnitario: integer("precio_unitario").notNull(),
  subtotal: integer("subtotal").notNull(),
  ...timestamps,
}, (table) => [
  index("pedido_detalles_pedido_idx").on(table.pedidoId),
]);

export const pagosTable = sqliteTable("pagos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pedidoId: integer("pedido_id")
    .notNull()
    .references(() => pedidosTable.id, { onDelete: "cascade" }),
  monto: integer("monto").notNull(),
  metodo: text("metodo").notNull(),
  estado: text("estado").default("pendiente").notNull(),
  referencia: text("referencia"),
  ...timestamps,
});

export const seguimientoPedidosTable = sqliteTable("seguimiento_pedidos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pedidoId: integer("pedido_id")
    .notNull()
    .references(() => pedidosTable.id, { onDelete: "cascade" }),
  estado: text("estado").notNull(),
  descripcion: text("descripcion"),
  ...timestamps,
}, (table) => [
  index("seguimiento_pedido_idx").on(table.pedidoId),
]);


export const userRelations = relations(user, ({ one, many }) => ({
  usuario: one(usuariosTable, {
    fields: [user.id],
    references: [usuariosTable.authUserId],
  }),
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const usuariosRelations = relations(usuariosTable, ({ one, many }) => ({
  authUser: one(user, {
    fields: [usuariosTable.authUserId],
    references: [user.id],
  }),
  cliente: one(clientesTable, {
    fields: [usuariosTable.id],
    references: [clientesTable.usuarioId],
  }),
  repartidor: one(repartidoresTable, {
    fields: [usuariosTable.id],
    references: [repartidoresTable.usuarioId],
  }),
  restauranteAdmins: many(restauranteAdminsTable),
}));

export const clientesRelations = relations(clientesTable, ({ one, many }) => ({
  usuario: one(usuariosTable, {
    fields: [clientesTable.usuarioId],
    references: [usuariosTable.id],
  }),
  direcciones: many(direccionesTable),
  carritos: many(carritosTable),
  pedidos: many(pedidosTable),
}));

export const repartidoresRelations = relations(
  repartidoresTable,
  ({ one, many }) => ({
    usuario: one(usuariosTable, {
      fields: [repartidoresTable.usuarioId],
      references: [usuariosTable.id],
    }),
    pedidos: many(pedidosTable),
  }),
);

export const restaurantesRelations = relations(
  restaurantesTable,
  ({ many }) => ({
    admins: many(restauranteAdminsTable),
    productos: many(productosTable),
    carritos: many(carritosTable),
    pedidos: many(pedidosTable),
  }),
);

export const restauranteAdminsRelations = relations(
  restauranteAdminsTable,
  ({ one }) => ({
    usuario: one(usuariosTable, {
      fields: [restauranteAdminsTable.usuarioId],
      references: [usuariosTable.id],
    }),
    restaurante: one(restaurantesTable, {
      fields: [restauranteAdminsTable.restauranteId],
      references: [restaurantesTable.id],
    }),
  }),
);

export const productosRelations = relations(productosTable, ({ one, many }) => ({
  restaurante: one(restaurantesTable, {
    fields: [productosTable.restauranteId],
    references: [restaurantesTable.id],
  }),
  carritoDetalles: many(carritoDetallesTable),
  pedidoDetalles: many(pedidoDetallesTable),
}));

export const direccionesRelations = relations(
  direccionesTable,
  ({ one, many }) => ({
    cliente: one(clientesTable, {
      fields: [direccionesTable.clienteId],
      references: [clientesTable.id],
    }),
    pedidos: many(pedidosTable),
  }),
);

export const carritosRelations = relations(carritosTable, ({ one, many }) => ({
  cliente: one(clientesTable, {
    fields: [carritosTable.clienteId],
    references: [clientesTable.id],
  }),
  restaurante: one(restaurantesTable, {
    fields: [carritosTable.restauranteId],
    references: [restaurantesTable.id],
  }),
  detalles: many(carritoDetallesTable),
}));

export const carritoDetallesRelations = relations(
  carritoDetallesTable,
  ({ one }) => ({
    carrito: one(carritosTable, {
      fields: [carritoDetallesTable.carritoId],
      references: [carritosTable.id],
    }),
    producto: one(productosTable, {
      fields: [carritoDetallesTable.productoId],
      references: [productosTable.id],
    }),
  }),
);

export const pedidosRelations = relations(pedidosTable, ({ one, many }) => ({
  cliente: one(clientesTable, {
    fields: [pedidosTable.clienteId],
    references: [clientesTable.id],
  }),
  restaurante: one(restaurantesTable, {
    fields: [pedidosTable.restauranteId],
    references: [restaurantesTable.id],
  }),
  repartidor: one(repartidoresTable, {
    fields: [pedidosTable.repartidorId],
    references: [repartidoresTable.id],
  }),
  direccion: one(direccionesTable, {
    fields: [pedidosTable.direccionId],
    references: [direccionesTable.id],
  }),
  detalles: many(pedidoDetallesTable),
  pagos: many(pagosTable),
  seguimiento: many(seguimientoPedidosTable),
}));

export const pedidoDetallesRelations = relations(
  pedidoDetallesTable,
  ({ one }) => ({
    pedido: one(pedidosTable, {
      fields: [pedidoDetallesTable.pedidoId],
      references: [pedidosTable.id],
    }),
    producto: one(productosTable, {
      fields: [pedidoDetallesTable.productoId],
      references: [productosTable.id],
    }),
  }),
);

export const pagosRelations = relations(pagosTable, ({ one }) => ({
  pedido: one(pedidosTable, {
    fields: [pagosTable.pedidoId],
    references: [pedidosTable.id],
  }),
}));

export const seguimientoPedidosRelations = relations(
  seguimientoPedidosTable,
  ({ one }) => ({
    pedido: one(pedidosTable, {
      fields: [seguimientoPedidosTable.pedidoId],
      references: [pedidosTable.id],
    }),
  }),
);

export type InsertAuthUser = typeof user.$inferInsert;
export type SelectAuthUser = typeof user.$inferSelect;

export type InsertSession = typeof session.$inferInsert;
export type SelectSession = typeof session.$inferSelect;

export type InsertAccount = typeof account.$inferInsert;
export type SelectAccount = typeof account.$inferSelect;

export type InsertVerification = typeof verification.$inferInsert;
export type SelectVerification = typeof verification.$inferSelect;

export type InsertUsuario = typeof usuariosTable.$inferInsert;
export type SelectUsuario = typeof usuariosTable.$inferSelect;

export type InsertCliente = typeof clientesTable.$inferInsert;
export type SelectCliente = typeof clientesTable.$inferSelect;

export type InsertRepartidor = typeof repartidoresTable.$inferInsert;
export type SelectRepartidor = typeof repartidoresTable.$inferSelect;

export type InsertRestaurante = typeof restaurantesTable.$inferInsert;
export type SelectRestaurante = typeof restaurantesTable.$inferSelect;

export type InsertRestauranteAdmin = typeof restauranteAdminsTable.$inferInsert;
export type SelectRestauranteAdmin = typeof restauranteAdminsTable.$inferSelect;

export type InsertProducto = typeof productosTable.$inferInsert;
export type SelectProducto = typeof productosTable.$inferSelect;

export type InsertDireccion = typeof direccionesTable.$inferInsert;
export type SelectDireccion = typeof direccionesTable.$inferSelect;

export type InsertCarrito = typeof carritosTable.$inferInsert;
export type SelectCarrito = typeof carritosTable.$inferSelect;

export type InsertCarritoDetalle = typeof carritoDetallesTable.$inferInsert;
export type SelectCarritoDetalle = typeof carritoDetallesTable.$inferSelect;

export type InsertPedido = typeof pedidosTable.$inferInsert;
export type SelectPedido = typeof pedidosTable.$inferSelect;

export type InsertPedidoDetalle = typeof pedidoDetallesTable.$inferInsert;
export type SelectPedidoDetalle = typeof pedidoDetallesTable.$inferSelect;

export type InsertPago = typeof pagosTable.$inferInsert;
export type SelectPago = typeof pagosTable.$inferSelect;

export type InsertSeguimientoPedido =
  typeof seguimientoPedidosTable.$inferInsert;
export type SelectSeguimientoPedido =
  typeof seguimientoPedidosTable.$inferSelect;

