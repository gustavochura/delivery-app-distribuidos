import type { Route } from "./+types/home";
import { Link } from "react-router";
import { ArrowRight, LayoutDashboard, ShieldCheck, Store } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Delivery App" },
    { name: "description", content: "Delivery App con Better Auth." },
  ];
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <section className="mx-auto grid min-h-[78vh] w-full max-w-5xl content-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-center">
          <Badge variant="secondary" className="mb-5 w-fit">
            <ShieldCheck />
            Better Auth activo
          </Badge>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Operacion de delivery con una base UI limpia y protegida.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            Pedidos, restaurantes y repartidores conviven con autenticacion por
            email y password, componentes shadcn sobre Base UI y Tailwind v4.
          </p>
          <nav className="mt-8 flex flex-wrap gap-3">
            <Button nativeButton={false} size="lg" render={<Link to="/sign-up" />}>
              Crear cuenta
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              size="lg"
              render={<Link to="/sign-in" />}
            >
              Iniciar sesion
            </Button>
            <Button
              nativeButton={false}
              variant="ghost"
              size="lg"
              render={<Link to="/dashboard" />}
            >
              Dashboard
            </Button>
          </nav>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Estado del stack</CardTitle>
            <CardDescription>
              Componentes listos para extender las pantallas operativas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <Store className="size-4" />
                </div>
                <div>
                  <p className="font-medium">Dominio delivery</p>
                  <p className="text-sm text-muted-foreground">
                    Schema Drizzle con pedidos como entidad central.
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <LayoutDashboard className="size-4" />
                </div>
                <div>
                  <p className="font-medium">Panel privado</p>
                  <p className="text-sm text-muted-foreground">
                    Dashboard protegido por sesion server-side.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
