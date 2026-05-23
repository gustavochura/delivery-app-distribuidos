import {
  Bike,
  ChefHat,
  Clock,
  DollarSign,
  PackageCheck,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";

export const categories = [
  "Pollo",
  "Pizza",
  "Hamburguesas",
  "Sushi",
  "Criollo",
  "Postres",
];

export const restaurants = [
  {
    id: "1",
    name: "Polleria El Buen Sabor",
    category: "Pollo a la brasa",
    rating: 4.8,
    eta: "25-35 min",
    deliveryFee: "S/ 4.00",
    status: "abierto",
    address: "Av. La Cultura 421",
    image:
      "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?q=80&w=1200&auto=format&fit=crop",
    promo: "20% en combos familiares",
  },
  {
    id: "2",
    name: "Pizza Centro",
    category: "Pizza artesanal",
    rating: 4.6,
    eta: "30-40 min",
    deliveryFee: "S/ 3.50",
    status: "abierto",
    address: "Jr. Arequipa 210",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1200&auto=format&fit=crop",
    promo: "2x1 en personales",
  },
  {
    id: "3",
    name: "Sushi Andino",
    category: "Sushi fusion",
    rating: 4.7,
    eta: "35-45 min",
    deliveryFee: "S/ 5.00",
    status: "cerrado",
    address: "Calle Moquegua 555",
    image:
      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=1200&auto=format&fit=crop",
    promo: "Rolls seleccionados",
  },
];

export const products = [
  {
    id: "1",
    restaurantId: "1",
    category: "Combos",
    name: "Combo brasa familiar",
    description: "Pollo entero, papas, ensalada y cremas de casa.",
    price: 69.9,
    available: true,
    image:
      "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: "2",
    restaurantId: "1",
    category: "Bebidas",
    name: "Chicha morada",
    description: "Botella helada de un litro.",
    price: 9.9,
    available: true,
    image:
      "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: "3",
    restaurantId: "1",
    category: "Extras",
    name: "Papas crocantes",
    description: "Porcion grande para compartir.",
    price: 12.5,
    available: false,
    image:
      "https://images.unsplash.com/photo-1576107232684-1279f390859f?q=80&w=1000&auto=format&fit=crop",
  },
];

export const cartItems = [
  { product: products[0], quantity: 1 },
  { product: products[1], quantity: 2 },
];

export const order = {
  id: "1001",
  customer: "LUIS CARLOS ALDAIR",
  restaurant: restaurants[0],
  driver: {
    name: "Renzo Jhoel",
    phone: "+51 999 333 222",
    vehicle: "Moto lineal",
  },
  status: "en_camino",
  total: 93.7,
  subtotal: 89.7,
  deliveryFee: 4,
  payment: "Yape/Plin",
  address: "Urb. Santa Fortunata Mz. B Lt. 12",
  createdAt: "Hoy, 12:42",
  items: cartItems,
};

export const orderStatuses = [
  "pendiente",
  "aceptado",
  "en_preparacion",
  "listo",
  "buscando_repartidor",
  "repartidor_asignado",
  "yendo_al_restaurante",
  "recogido",
  "en_camino",
  "entregado",
  "cancelado",
  "rechazado",
] as const;

export const timeline = [
  "Pedido creado",
  "Restaurante acepto",
  "En preparacion",
  "Listo para recoger",
  "Repartidor asignado",
  "Pedido recogido",
  "En camino",
  "Entregado",
];

export const adminStats = [
  { label: "Usuarios", value: "1,248", icon: Users, tone: "info" },
  { label: "Restaurantes", value: "86", icon: Store, tone: "success" },
  { label: "Repartidores", value: "134", icon: Bike, tone: "warning" },
  { label: "Pedidos activos", value: "42", icon: PackageCheck, tone: "success" },
  { label: "Ingresos", value: "S/ 18,420", icon: DollarSign, tone: "info" },
];

export const restaurantOrders = [
  { ...order, status: "pendiente", id: "1001", total: 93.7, createdAt: "12:42" },
  { ...order, status: "en_preparacion", id: "1002", total: 48.5, createdAt: "12:18" },
  { ...order, status: "listo", id: "1003", total: 62.0, createdAt: "11:58" },
];

export const users = [
  { name: "Luis Arocutipa", email: "2024204004@unam.edu.pe", role: "cliente", status: "activo" },
  { name: "Renzo Hila", email: "2023204042@unam.edu.pe", role: "repartidor", status: "activo" },
  { name: "Gustavo Chura", email: "2021204036@unam.edu.pe", role: "admin", status: "activo" },
];

export const dashboardRoles = [
  { title: "Cliente", href: "/cliente/home", icon: ShoppingBag, description: "Explorar restaurantes, pedir y seguir entregas." },
  { title: "Restaurante", href: "/restaurante/pedidos", icon: ChefHat, description: "Gestionar pedidos recibidos y menu." },
  { title: "Repartidor", href: "/repartidor/home", icon: Bike, description: "Tomar pedidos y navegar entregas." },
  { title: "Administrador", href: "/admin/dashboard", icon: Users, description: "Monitorear usuarios, pedidos y reportes." },
];

export const deliveryPoints = {
  restaurant: { longitude: -70.935, latitude: -17.193 },
  customer: { longitude: -70.923, latitude: -17.187 },
  driver: { longitude: -70.929, latitude: -17.19 },
};

export const dailyStats = [
  { label: "Entregas", value: "8", icon: PackageCheck },
  { label: "Ganancia", value: "S/ 92", icon: DollarSign },
  { label: "Conectado", value: "5h 20m", icon: Clock },
];
