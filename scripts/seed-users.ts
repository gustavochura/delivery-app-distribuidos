import "dotenv/config";

import { eq, or } from "drizzle-orm";
import { auth } from "../app/lib/auth.server";
import { db } from "../app/database/client.server";
import { session, user, usuariosTable } from "../app/database/schema";

type SeedStudent = {
  codigo: string;
  nombreCompleto: string;
};

const students = [
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
  { codigo: "2021204036", nombreCompleto: "CHURA ALAY, GUSTAVO" },
  { codigo: "2021204103", nombreCompleto: "COLQUE CLAROS, MAHICOL YUNIOR" },
  { codigo: "2021204111", nombreCompleto: "MAMANI VIZCARRA, STYVEN ANTHONY" },
  { codigo: "2022204004", nombreCompleto: "MELGAR HUANCA, PIERO RONALDO" },
  { codigo: "2018204052", nombreCompleto: "MULLAYA YUPANQUI, YENNY LISBETH" },
  { codigo: "2021204119", nombreCompleto: "PARI PUMA, LEO ENRIQUE" },
] satisfies SeedStudent[];

type SeedResult = {
  createdAuthUsers: number;
  existingAuthUsers: number;
  createdUsuarios: number;
  linkedUsuarios: number;
  existingUsuarios: number;
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
  } catch (error) {
    throw new Error(
      [
        "No se pudo leer las tablas necesarias para el seed.",
        "Asegurate de aplicar primero las migraciones de Drizzle que crean `user`, `account`, `session`, `verification` y `usuarios.auth_user_id`.",
        "Comando sugerido cuando quieras aplicar cambios a la base: bun run db:migrate",
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

async function seedStudent(student: SeedStudent) {
  const email = getEmail(student.codigo);
  const password = getInitialPassword(student);
  const existingAuthUser = await findAuthUserByEmail(email);

  if (existingAuthUser) {
    const usuarioStatus = await ensureUsuario(
      existingAuthUser.id,
      student.nombreCompleto,
      email,
    );

    return {
      authStatus: "existing" as const,
      usuarioStatus,
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

  await db.delete(session).where(eq(session.userId, created.user.id));

  const usuarioStatus = await ensureUsuario(
    created.user.id,
    student.nombreCompleto,
    email,
  );

  return {
    authStatus: "created" as const,
    usuarioStatus,
    email,
  };
}

async function main() {
  await assertSeedTablesExist();

  const result: SeedResult = {
    createdAuthUsers: 0,
    existingAuthUsers: 0,
    createdUsuarios: 0,
    linkedUsuarios: 0,
    existingUsuarios: 0,
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

      console.log(`OK ${seeded.email} (${seeded.authStatus}/${seeded.usuarioStatus})`);
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
    Errores: result.errors.length,
  });

  if (result.errors.length > 0) {
    process.exitCode = 1;
  }
}

await main();
