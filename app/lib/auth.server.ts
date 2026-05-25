import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db, schema } from "~/database/client.server";
import { clientesTable, usuariosTable } from "~/database/schema";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:5173",
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const [nuevo] = await db
            .insert(usuariosTable)
            .values({ authUserId: user.id, nombre: user.name, email: user.email })
            .returning({ id: usuariosTable.id });
          await db.insert(clientesTable).values({ usuarioId: nuevo.id });
        },
      },
    },
  },
});
