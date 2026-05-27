import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  route("api/auth/*", "routes/api.auth.$.ts"),
  route("api/qstash/pedido-creado", "routes/api.qstash.pedido-creado.ts"),
  route("sign-in", "routes/sign-in.tsx"),
  route("sign-up", "routes/sign-up.tsx"),
  route("dashboard", "routes/dashboard.tsx"),

  // Navegacion publica — no requiere sesion
  layout("routes/layouts/cliente-browsing.tsx", [
    index("routes/cliente.home.tsx"),
    route("cliente/restaurantes", "routes/cliente.restaurantes.tsx"),
    route("cliente/restaurantes/:restaurante_id", "routes/cliente.restaurante-detalle.tsx"),
  ]),

  // Acciones privadas — requiere sesion + perfil cliente
  layout("routes/layouts/cliente.tsx", [
    route("cliente/carrito", "routes/cliente.carrito.tsx"),
    route("cliente/checkout", "routes/cliente.checkout.tsx"),
    route("cliente/pedidos", "routes/cliente.pedidos.tsx"),
    route("cliente/pedidos/:pedido_id", "routes/cliente.pedido-detalle.tsx"),
    route("cliente/pedidos/:pedido_id/ubicacion", "routes/cliente.pedido-ubicacion.tsx"),
    route("cliente/pedidos/:pedido_id/seguimiento", "routes/cliente.seguimiento.tsx"),
    route("cliente/perfil", "routes/cliente.perfil.tsx"),
  ]),

  route("restaurante/cambiar", "routes/restaurante.cambiar.tsx"),

  layout("routes/layouts/restaurante.tsx", [
    route("restaurante", "routes/restaurante.index.tsx"),
    route("restaurante/pedidos", "routes/restaurante.pedidos.tsx"),
    route("restaurante/pedidos/:pedido_id", "routes/restaurante.pedido-detalle.tsx"),
    route("restaurante/productos", "routes/restaurante.productos.tsx"),
    route("restaurante/productos/:producto_id", "routes/restaurante.producto-form.tsx"),
  ]),

  layout("routes/layouts/repartidor.tsx", [
    route("repartidor/home", "routes/repartidor.home.tsx"),
    route("repartidor/pedidos/:pedido_id/mapa", "routes/repartidor.mapa.tsx"),
  ]),

  layout("routes/layouts/admin.tsx", [
    route("admin/dashboard", "routes/admin.dashboard.tsx"),
    route("admin/pedidos", "routes/admin.pedidos.tsx"),
    route("admin/usuarios", "routes/admin.usuarios.tsx"),
  ]),
] satisfies RouteConfig;
