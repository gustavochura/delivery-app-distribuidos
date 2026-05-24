import { Link, redirect, useNavigate } from "react-router";
import { useState } from "react";
import { signIn } from "~/lib/auth-client";
import { auth } from "~/lib/auth.server";
import type { Route } from "./+types/sign-in";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (session) throw redirect("/");
  return {};
}

export function meta() {
  return [
    { title: "Iniciar sesion | Delivery App" },
    { name: "description", content: "Accede a tu cuenta de Delivery App." },
  ];
}

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn.email(
        { email, password },
        {
          onSuccess: () => navigate("/"),
          onError: (ctx) => setError(ctx.error.message),
        },
      );

      if (result?.error) {
        setError(result.error.message ?? "No se pudo iniciar sesion.");
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo conectar con el servidor de autenticacion.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground">
      <section className="mx-auto w-full max-w-sm">
        <div className="mb-8">
          <Button
            nativeButton={false}
            variant="link"
            className="h-auto px-0"
            render={<Link to="/" />}
          >
            Delivery App
          </Button>
          <h1 className="mt-6 text-3xl font-semibold">Iniciar sesion</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bienvenido de vuelta</CardTitle>
            <CardDescription>
              Ingresa con tu email y password para continuar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>No se pudo iniciar sesion</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Ingresando..." : "Ingresar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
          No tienes cuenta?{" "}
          <Link className="font-medium text-primary hover:underline" to="/sign-up">
            Registrate
          </Link>
        </p>
      </section>
    </main>
  );
}
