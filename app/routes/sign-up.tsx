import { Link, useNavigate } from "react-router";
import { useState } from "react";
import { signUp } from "~/lib/auth-client";
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

export function meta() {
  return [
    { title: "Registro | Delivery App" },
    { name: "description", content: "Crea una cuenta en Delivery App." },
  ];
}

export default function SignUp() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signUp.email(
        { name, email, password },
        {
          onSuccess: () => navigate("/dashboard"),
          onError: (ctx) => setError(ctx.error.message),
        },
      );

      if (result?.error) {
        setError(result.error.message ?? "No se pudo crear la cuenta.");
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
          <h1 className="mt-6 text-3xl font-semibold">Crear cuenta</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Empieza en Delivery App</CardTitle>
            <CardDescription>
              Crea tu cuenta base para acceder al panel privado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  required
                />
              </div>

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
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>No se pudo crear la cuenta</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creando..." : "Crear cuenta"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
          Ya tienes cuenta?{" "}
          <Link className="font-medium text-primary hover:underline" to="/sign-in">
            Inicia sesion
          </Link>
        </p>
      </section>
    </main>
  );
}
