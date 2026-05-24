import "dotenv/config";

import { and, eq, inArray, or } from "drizzle-orm";
import { auth } from "../app/lib/auth.server";
import { db } from "../app/database/client.server";
import {
  session,
  user,
  usuariosTable,
  clientesTable,
  repartidoresTable,
  restaurantesTable,
  restauranteAdminsTable,
  productosTable,
  direccionesTable,
} from "../app/database/schema";

type SeedStudent = {
  codigo: string;
  nombreCompleto: string;
  role?: "cliente" | "repartidor" | "admin";
};

const students: SeedStudent[] = [
  { codigo: "2021204036", nombreCompleto: "CHURA ALAY, GUSTAVO" },
  { codigo: "2024204004", nombreCompleto: "AROCUTIPA ACAHUANA, LUIS CARLOS ALDAIR" },
  { codigo: "2023204065", nombreCompleto: "BAEZ COARI, FRANK DENIS DANIEL" },
  { codigo: "2023204038", nombreCompleto: "CABRERA LAYME, CRISTIAN" },
  { codigo: "2023204041", nombreCompleto: "CAMIZAN ALVARADO, ABEL ELIAB" },
  { codigo: "2023204048", nombreCompleto: "CATACORA COAILA, RODRIGO MARTIN" },
  { codigo: "2024204024", nombreCompleto: "CHOQUE ESPINOZA, MATHIAS RODRIGO" },
  { codigo: "2022204046", nombreCompleto: "DURAN NUÑEZ, ALEXANDER FABRICIO" },
  { codigo: "2021204046", nombreCompleto: "FLORES APAZA, ALEX HUGO" },
  { codigo: "2024204011", nombreCompleto: "FLORES BERMUDEZ, MIGUEL ANGEL" },
  { codigo: "2023204042", nombreCompleto: "HILA MAMANI, RENZO JHOEL" },
  { codigo: "2024204023", nombreCompleto: "JILAJA YI, KOC LAY PHILLIPE" },
  { codigo: "2024204020", nombreCompleto: "LOVON TICONA, MARLON RAUL" },
  { codigo: "2024204036", nombreCompleto: "LUPACA APAZA, ALAN ENDERS" },
  { codigo: "2024204003", nombreCompleto: "MAQUERA CHURA, EDUARD JOSUE" },
  { codigo: "2024204001", nombreCompleto: "MARCA GOMEZ, FRANCO" },
  { codigo: "2023204009", nombreCompleto: "MIRANDA PAURO, CARLOS ENRIQUE" },
  { codigo: "2023204040", nombreCompleto: "NINA CHUNGA, MARCELO LERHOY" },
  { codigo: "2024204014", nombreCompleto: "PUMA RIOS, PITER" },
  { codigo: "2024204007", nombreCompleto: "RAMIREZ CHURACUTIPA, JHON EDDY" },
  { codigo: "2020204065", nombreCompleto: "TURPO QUILCA, EMILY FRANSHESCA" },
  { codigo: "2024204032", nombreCompleto: "VALDIVIA MANRIQUE, MILKO JEANPIERRE" },
  { codigo: "2024204030", nombreCompleto: "VILLALOBOS VARGAS, DICK ENRRIQUE" },
  { codigo: "2021204064", nombreCompleto: "CABRERA QUISPE, DAYMER FERNANDO" },
  { codigo: "2019204019", nombreCompleto: "CARLOS HUAMAN, HIPOLITO JESUS" },
  { codigo: "2021204103", nombreCompleto: "COLQUE CLAROS, MAHICOL YUNIOR" },
  { codigo: "2021204111", nombreCompleto: "MAMANI VIZCARRA, STYVEN ANTHONY" },
  { codigo: "2022204004", nombreCompleto: "MELGAR HUANCA, PIERO RONALDO" },
  { codigo: "2018204052", nombreCompleto: "MULLAYA YUPANQUI, YENNY LISBETH" },
  { codigo: "2021204119", nombreCompleto: "PARI PUMA, LEO ENRIQUE" },
];

type SeedResult = {
  createdAuthUsers: number;
  existingAuthUsers: number;
  createdUsuarios: number;
  linkedUsuarios: number;
  existingUsuarios: number;
  assignedRoles: number;
  errors: Array<{ email: string; message: string }>;
};

function getEmail(codigo: string) {
  return `${codigo}@unam.edu.pe`.toLowerCase();
}

function getFirstName(nombreCompleto: string) {
  const [, givenNames = ""] = nombreCompleto.split(",");
  const [firstName] = givenNames.trim().split(/\s+/);

  if (!firstName) {
    throw new Error(`No se pudo obtener el primer nombre de "${nombreCompleto}"`);
  }

  return firstName.toUpperCase();
}

function getInitialPassword(student: SeedStudent) {
  return `${getFirstName(student.nombreCompleto)}${student.codigo}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const cause = "cause" in error ? error.cause : undefined;

    return cause
      ? `${error.message}: ${getErrorMessage(cause)}`
      : error.message;
  }

  return String(error);
}

async function assertSeedTablesExist() {
  try {
    await db.select({ id: user.id }).from(user).limit(1);
    await db.select({ id: usuariosTable.id }).from(usuariosTable).limit(1);
    await db.select({ id: clientesTable.id }).from(clientesTable).limit(1);
    await db.select({ id: repartidoresTable.id }).from(repartidoresTable).limit(1);
  } catch (error) {
    throw new Error(
      [
        "No se pudo leer las tablas necesarias para el seed.",
        "Asegurate de aplicar primero las migraciones de Drizzle.",
        "Comando sugerido: bun run db:migrate",
        `Detalle: ${getErrorMessage(error)}`,
      ].join("\n"),
    );
  }
}

async function findAuthUserByEmail(email: string) {
  const [authUser] = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  return authUser;
}

async function findUsuarioByAuthUserOrEmail(authUserId: string, email: string) {
  const [usuario] = await db
    .select()
    .from(usuariosTable)
    .where(
      or(
        eq(usuariosTable.authUserId, authUserId),
        eq(usuariosTable.email, email),
      ),
    )
    .limit(1);

  return usuario;
}

async function ensureUsuario(authUserId: string, nombre: string, email: string) {
  const existingUsuario = await findUsuarioByAuthUserOrEmail(authUserId, email);

  if (!existingUsuario) {
    await db.insert(usuariosTable).values({
      authUserId,
      nombre,
      email,
    });

    return "created" as const;
  }

  if (existingUsuario.authUserId === authUserId) {
    return "existing" as const;
  }

  if (existingUsuario.authUserId === null) {
    await db
      .update(usuariosTable)
      .set({ authUserId })
      .where(eq(usuariosTable.id, existingUsuario.id));

    return "linked" as const;
  }

  throw new Error(
    `El perfil usuarios ${existingUsuario.id} ya apunta a otro auth_user_id`,
  );
}

async function ensureRolePerfil(
  usuarioId: number,
  role: "cliente" | "repartidor" | "admin",
): Promise<boolean> {
  if (role === "cliente") {
    const [existing] = await db
      .select({ id: clientesTable.id })
      .from(clientesTable)
      .where(eq(clientesTable.usuarioId, usuarioId))
      .limit(1);

    if (!existing) {
      await db.insert(clientesTable).values({ usuarioId });
      return true;
    }
    return false;
  }

  if (role === "repartidor") {
    const [existing] = await db
      .select({ id: repartidoresTable.id })
      .from(repartidoresTable)
      .where(eq(repartidoresTable.usuarioId, usuarioId))
      .limit(1);

    if (!existing) {
      await db.insert(repartidoresTable).values({ usuarioId });
      return true;
    }
    return false;
  }

  if (role === "admin") {
    await db
      .update(usuariosTable)
      .set({ isAdmin: true })
      .where(eq(usuariosTable.id, usuarioId));
    return true;
  }

  return false;
}

async function seedStudent(student: SeedStudent) {
  const email = getEmail(student.codigo);
  const password = getInitialPassword(student);
  const existingAuthUser = await findAuthUserByEmail(email);

  let authUserId: string;

  if (existingAuthUser) {
    authUserId = existingAuthUser.id;
    const usuarioStatus = await ensureUsuario(
      existingAuthUser.id,
      student.nombreCompleto,
      email,
    );

    let roleAssigned = false;
    const [usuario] = await db
      .select({ id: usuariosTable.id })
      .from(usuariosTable)
      .where(eq(usuariosTable.authUserId, authUserId))
      .limit(1);

    if (usuario) {
      await ensureRolePerfil(usuario.id, "cliente");
      if (student.role) {
        roleAssigned = await ensureRolePerfil(usuario.id, student.role);
      }
    }

    return {
      authStatus: "existing" as const,
      usuarioStatus,
      roleAssigned,
      email,
    };
  }

  const created = await auth.api.signUpEmail({
    body: {
      name: student.nombreCompleto,
      email,
      password,
      rememberMe: false,
    },
  });

  authUserId = created.user.id;
  await db.delete(session).where(eq(session.userId, authUserId));

  const usuarioStatus = await ensureUsuario(
    authUserId,
    student.nombreCompleto,
    email,
  );

  let roleAssigned = false;
  const [usuario] = await db
    .select({ id: usuariosTable.id })
    .from(usuariosTable)
    .where(eq(usuariosTable.authUserId, authUserId))
    .limit(1);

  if (usuario) {
    await ensureRolePerfil(usuario.id, "cliente");
    if (student.role) {
      roleAssigned = await ensureRolePerfil(usuario.id, student.role);
    }
  }

  return {
    authStatus: "created" as const,
    usuarioStatus,
    roleAssigned,
    email,
  };
}

const SPECIAL_USERS_EMAILS = [
  "2021204036@unam.edu.pe", // Gustavo
  "2023204040@unam.edu.pe", // Marcelo
  "2024204036@unam.edu.pe", // Alan
  "2018204052@unam.edu.pe", // Yenny
  "2020204065@unam.edu.pe", // Emily
];

async function seedRolesEspeciales() {
  console.log("\nAsignando roles especiales...");

  const usuarios = await Promise.all(
    SPECIAL_USERS_EMAILS.map(async (email) => {
      const [u] = await db
        .select({ id: usuariosTable.id, nombre: usuariosTable.nombre })
        .from(usuariosTable)
        .where(eq(usuariosTable.email, email))
        .limit(1);
      return u ? { ...u, email } : null;
    }),
  );

  const usuariosValidos = usuarios.filter((u): u is NonNullable<typeof u> => u !== null);

  // Delete existing restaurant assignments so re-running produces the correct round-robin
  if (usuariosValidos.length > 0) {
    await db
      .delete(restauranteAdminsTable)
      .where(inArray(restauranteAdminsTable.usuarioId, usuariosValidos.map((u) => u.id)));
    console.log(`  Asignaciones previas eliminadas para ${usuariosValidos.length} usuarios especiales`);
  }

  for (const usuario of usuariosValidos) {
    // isAdmin = true
    await db.update(usuariosTable).set({ isAdmin: true }).where(eq(usuariosTable.id, usuario.id));

    // Repartidor profile
    const [existingRep] = await db
      .select({ id: repartidoresTable.id })
      .from(repartidoresTable)
      .where(eq(repartidoresTable.usuarioId, usuario.id))
      .limit(1);
    if (!existingRep) {
      await db.insert(repartidoresTable).values({ usuarioId: usuario.id });
    }

    console.log(`  ${usuario.nombre} → admin + repartidor`);
  }

  // Distribuir restaurantes entre los 5 usuarios en round-robin
  const restaurantes = await db
    .select({ id: restaurantesTable.id, nombre: restaurantesTable.nombre })
    .from(restaurantesTable)
    .orderBy(restaurantesTable.id);

  for (let i = 0; i < restaurantes.length; i++) {
    const restaurante = restaurantes[i];
    const usuario = usuariosValidos[i % usuariosValidos.length];
    if (!usuario) continue;

    await db.insert(restauranteAdminsTable).values({
      usuarioId: usuario.id,
      restauranteId: restaurante.id,
      rol: "admin",
    });
    console.log(`  ${restaurante.nombre} → ${usuario.nombre}`);
  }
}

async function seedDemoData() {
  // Demo restaurant
  const [existing] = await db
    .select({ id: restaurantesTable.id })
    .from(restaurantesTable)
    .where(eq(restaurantesTable.nombre, "Polleria El Buen Sabor"))
    .limit(1);

  let restauranteId: number;

  if (existing) {
    restauranteId = existing.id;
    console.log("Demo restaurante ya existe, saltando...");
  } else {
    const [inserted] = await db
      .insert(restaurantesTable)
      .values({
        nombre: "Polleria El Buen Sabor",
        descripcion: "La mejor pollería de la ciudad. Brasa y más.",
        categoria: "Pollo a la brasa",
        direccion: "Av. La Cultura 421",
        imagen:
          "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?q=80&w=1200&auto=format&fit=crop",
        calificacion: 4.8,
        tiempoEstimado: "25-35 min",
        tarifaEnvio: 400,
        abierto: true,
        activo: true,
      })
      .returning({ id: restaurantesTable.id });
    restauranteId = inserted.id;
    console.log(`Restaurante demo creado (id=${restauranteId})`);

    await db.insert(productosTable).values([
      {
        restauranteId,
        nombre: "Combo brasa familiar",
        descripcion: "Pollo entero, papas, ensalada y cremas de casa.",
        categoria: "Combos",
        imagen:
          "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?q=80&w=1000&auto=format&fit=crop",
        precio: 6990,
        disponible: true,
      },
      {
        restauranteId,
        nombre: "Chicha morada",
        descripcion: "Botella helada de un litro.",
        categoria: "Bebidas",
        imagen:
          "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?q=80&w=1000&auto=format&fit=crop",
        precio: 990,
        disponible: true,
      },
      {
        restauranteId,
        nombre: "Papas crocantes",
        descripcion: "Porcion grande para compartir.",
        categoria: "Extras",
        imagen:
          "https://images.unsplash.com/photo-1576107232684-1279f390859f?q=80&w=1000&auto=format&fit=crop",
        precio: 1250,
        disponible: false,
      },
    ]);
    console.log("Productos demo creados");
  }

  // Additional demo restaurants
  type RestauranteData = {
    nombre: string;
    descripcion: string;
    categoria: string;
    direccion: string;
    imagen: string;
    calificacion: number;
    tiempoEstimado: string;
    tarifaEnvio: number;
    productos: Array<{ nombre: string; descripcion: string; categoria: string; imagen: string; precio: number; disponible: boolean }>;
  };

  const additionalRestaurantes: RestauranteData[] = [
    {
      nombre: "Pizza Centro",
      descripcion: "Pizza artesanal horneada en horno de leña.",
      categoria: "Pizza artesanal",
      direccion: "Jr. Arequipa 210",
      imagen: "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1200&auto=format&fit=crop",
      calificacion: 4.6,
      tiempoEstimado: "30-40 min",
      tarifaEnvio: 350,
      productos: [
        { nombre: "Pizza Margarita", descripcion: "Tomate, mozzarella fresca y albahaca.", categoria: "Pizzas", imagen: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=800", precio: 3200, disponible: true },
        { nombre: "Calzone de Jamon", descripcion: "Relleno de jamon, queso y champiñones.", categoria: "Pizzas", imagen: "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?q=80&w=800", precio: 2800, disponible: true },
        { nombre: "Tiramisu", descripcion: "Clasico postre italiano con cafe y mascarpone.", categoria: "Postres", imagen: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?q=80&w=800", precio: 1400, disponible: true },
        { nombre: "Limonada italiana", descripcion: "Limonada fresca con hierbas.", categoria: "Bebidas", imagen: "https://images.unsplash.com/photo-1523371054106-bbf80586c38c?q=80&w=800", precio: 800, disponible: true },
      ],
    },
    {
      nombre: "Burger House",
      descripcion: "Hamburguesas artesanales con carne al 100%.",
      categoria: "Hamburguesas",
      direccion: "Calle Ilo 88",
      imagen: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1200&auto=format&fit=crop",
      calificacion: 4.5,
      tiempoEstimado: "20-30 min",
      tarifaEnvio: 300,
      productos: [
        { nombre: "Burger Clasica", descripcion: "Carne angus, lechuga, tomate y salsa de la casa.", categoria: "Burgers", imagen: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800", precio: 2600, disponible: true },
        { nombre: "Doble Cheddar", descripcion: "Doble carne, doble cheddar y bacon crujiente.", categoria: "Burgers", imagen: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?q=80&w=800", precio: 3400, disponible: true },
        { nombre: "Papas Fritas", descripcion: "Papas doradas con sal y especias.", categoria: "Acompañamientos", imagen: "https://images.unsplash.com/photo-1576107232684-1279f390859f?q=80&w=800", precio: 1000, disponible: true },
        { nombre: "Aros de Cebolla", descripcion: "Crocantes aros de cebolla con salsa ranch.", categoria: "Acompañamientos", imagen: "https://images.unsplash.com/photo-1639024471283-03518883512d?q=80&w=800", precio: 1200, disponible: true },
      ],
    },
    {
      nombre: "Sushi Andino",
      descripcion: "Sushi fusión con ingredientes locales.",
      categoria: "Sushi fusión",
      direccion: "Calle Moquegua 555",
      imagen: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=1200&auto=format&fit=crop",
      calificacion: 4.7,
      tiempoEstimado: "35-45 min",
      tarifaEnvio: 500,
      productos: [
        { nombre: "Roll California", descripcion: "Cangrejo, aguacate y pepino con tobiko.", categoria: "Rolls", imagen: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?q=80&w=800", precio: 2500, disponible: true },
        { nombre: "Sashimi de Salmon", descripcion: "Salmon fresco cortado en finas laminas.", categoria: "Sashimi", imagen: "https://images.unsplash.com/photo-1617196034085-a5ee7b32f7aa?q=80&w=800", precio: 3800, disponible: true },
        { nombre: "Miso Soup", descripcion: "Sopa tradicional japonesa con tofu y alga.", categoria: "Sopas", imagen: "https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=800", precio: 900, disponible: true },
        { nombre: "Roll Andino", descripcion: "Trucha, quinua y aji amarillo. Fusion peruana.", categoria: "Rolls", imagen: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?q=80&w=800", precio: 2900, disponible: true },
      ],
    },
    {
      nombre: "La Cocina Criolla",
      descripcion: "Autentica comida peruana con sabor casero.",
      categoria: "Comida criolla",
      direccion: "Av. San Martin 340",
      imagen: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=1200&auto=format&fit=crop",
      calificacion: 4.9,
      tiempoEstimado: "40-50 min",
      tarifaEnvio: 350,
      productos: [
        { nombre: "Lomo Saltado", descripcion: "Clasico lomo saltado con papas fritas y arroz.", categoria: "Platos de fondo", imagen: "https://images.unsplash.com/photo-1604491257711-f7ca8b6d4e4c?q=80&w=800", precio: 3500, disponible: true },
        { nombre: "Aji de Gallina", descripcion: "Gallina en salsa de aji amarillo con arroz y papa.", categoria: "Platos de fondo", imagen: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?q=80&w=800", precio: 2800, disponible: true },
        { nombre: "Ceviche", descripcion: "Ceviche clasico de corvina con leche de tigre.", categoria: "Entradas", imagen: "https://images.unsplash.com/photo-1619221882275-9a9d04e2b970?q=80&w=800", precio: 3200, disponible: true },
        { nombre: "Chicha Morada", descripcion: "Refrescante bebida morada artesanal.", categoria: "Bebidas", imagen: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?q=80&w=800", precio: 700, disponible: true },
      ],
    },
    {
      nombre: "Dulce Tentacion",
      descripcion: "Postres artesanales y reposteria fina.",
      categoria: "Postres y cafeteria",
      direccion: "Pasaje Comercio 12",
      imagen: "https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=1200&auto=format&fit=crop",
      calificacion: 4.8,
      tiempoEstimado: "15-25 min",
      tarifaEnvio: 250,
      productos: [
        { nombre: "Torta de Chocolate", descripcion: "Torta humeda de triple chocolate con ganache.", categoria: "Tortas", imagen: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=800", precio: 2200, disponible: true },
        { nombre: "Cheesecake de Frutos Rojos", descripcion: "Cheesecake cremoso con coulis de frutos rojos.", categoria: "Tortas", imagen: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?q=80&w=800", precio: 1900, disponible: true },
        { nombre: "Brownie", descripcion: "Brownie tibio con helado de vainilla.", categoria: "Postres", imagen: "https://images.unsplash.com/photo-1564355808539-22fda35bed7e?q=80&w=800", precio: 1600, disponible: true },
        { nombre: "Cafe Latte", descripcion: "Espresso con leche cremosa.", categoria: "Bebidas", imagen: "https://images.unsplash.com/photo-1561047029-3000c68339ca?q=80&w=800", precio: 950, disponible: true },
      ],
    },
  ];

  for (const data of additionalRestaurantes) {
    const [existingR] = await db
      .select({ id: restaurantesTable.id })
      .from(restaurantesTable)
      .where(eq(restaurantesTable.nombre, data.nombre))
      .limit(1);

    if (existingR) {
      console.log(`${data.nombre} ya existe, saltando...`);
      continue;
    }

    const [newR] = await db
      .insert(restaurantesTable)
      .values({
        nombre: data.nombre,
        descripcion: data.descripcion,
        categoria: data.categoria,
        direccion: data.direccion,
        imagen: data.imagen,
        calificacion: data.calificacion,
        tiempoEstimado: data.tiempoEstimado,
        tarifaEnvio: data.tarifaEnvio,
        abierto: true,
        activo: true,
      })
      .returning({ id: restaurantesTable.id });

    await db.insert(productosTable).values(
      data.productos.map((p) => ({ restauranteId: newR.id, ...p })),
    );

    console.log(`${data.nombre} creado con ${data.productos.length} productos`);
  }

  await seedRolesEspeciales();

  // Add demo address for Gustavo (cliente)
  const [gustavoUsuario] = await db
    .select({ id: usuariosTable.id })
    .from(usuariosTable)
    .where(eq(usuariosTable.email, "2021204036@unam.edu.pe"))
    .limit(1);

  if (gustavoUsuario) {
    const [gustavoCliente] = await db
      .select({ id: clientesTable.id })
      .from(clientesTable)
      .where(eq(clientesTable.usuarioId, gustavoUsuario.id))
      .limit(1);

    if (gustavoCliente) {
      const [existingGDir] = await db
        .select({ id: direccionesTable.id })
        .from(direccionesTable)
        .where(eq(direccionesTable.clienteId, gustavoCliente.id))
        .limit(1);

      if (!existingGDir) {
        await db.insert(direccionesTable).values({
          clienteId: gustavoCliente.id,
          direccion: "Av. La Cultura 1800, UNAM",
          referencia: "Campus universitario, edificio principal",
          latitud: -17.189,
          longitud: -70.931,
          principal: true,
        });
        console.log("Direccion demo creada para Gustavo");
      }
    }
  }

  // Add demo address for Luis (cliente)
  const [luisUsuario] = await db
    .select({ id: usuariosTable.id })
    .from(usuariosTable)
    .where(eq(usuariosTable.email, "2024204004@unam.edu.pe"))
    .limit(1);

  if (luisUsuario) {
    const [luisCliente] = await db
      .select({ id: clientesTable.id })
      .from(clientesTable)
      .where(eq(clientesTable.usuarioId, luisUsuario.id))
      .limit(1);

    if (luisCliente) {
      const [existingDir] = await db
        .select({ id: direccionesTable.id })
        .from(direccionesTable)
        .where(eq(direccionesTable.clienteId, luisCliente.id))
        .limit(1);

      if (!existingDir) {
        await db.insert(direccionesTable).values({
          clienteId: luisCliente.id,
          direccion: "Urb. Santa Fortunata Mz. B Lt. 12",
          referencia: "Porton negro, frente al parque",
          latitud: -17.187,
          longitud: -70.923,
          principal: true,
        });
        console.log("Direccion demo creada para Luis");
      }
    }
  }
}

async function main() {
  await assertSeedTablesExist();

  const result: SeedResult = {
    createdAuthUsers: 0,
    existingAuthUsers: 0,
    createdUsuarios: 0,
    linkedUsuarios: 0,
    existingUsuarios: 0,
    assignedRoles: 0,
    errors: [],
  };

  for (const student of students) {
    try {
      const seeded = await seedStudent(student);

      if (seeded.authStatus === "created") {
        result.createdAuthUsers++;
      } else {
        result.existingAuthUsers++;
      }

      if (seeded.usuarioStatus === "created") {
        result.createdUsuarios++;
      } else if (seeded.usuarioStatus === "linked") {
        result.linkedUsuarios++;
      } else {
        result.existingUsuarios++;
      }

      if (seeded.roleAssigned) {
        result.assignedRoles++;
      }

      const roleTag = student.role ? ` [${student.role}]` : "";
      console.log(`OK ${seeded.email} (${seeded.authStatus}/${seeded.usuarioStatus})${roleTag}`);
    } catch (error) {
      const email = getEmail(student.codigo);
      const message = getErrorMessage(error);

      result.errors.push({ email, message });
      console.error(`ERROR ${email}: ${message}`);
    }
  }

  console.log("\nSeed usuarios completado");
  console.table({
    "Auth creados": result.createdAuthUsers,
    "Auth existentes": result.existingAuthUsers,
    "Usuarios creados": result.createdUsuarios,
    "Usuarios enlazados": result.linkedUsuarios,
    "Usuarios existentes": result.existingUsuarios,
    "Roles asignados": result.assignedRoles,
    Errores: result.errors.length,
  });

  if (result.errors.length > 0) {
    process.exitCode = 1;
  }

  console.log("\nSeeding datos demo...");
  await seedDemoData();
}

await main();
