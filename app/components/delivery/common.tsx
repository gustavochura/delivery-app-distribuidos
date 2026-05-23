import { Link, useLocation } from "react-router";
import { Home, Search, ShoppingCart } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";

export function SearchBar({
  placeholder = "Buscar",
  className,
}: {
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input className="pl-9" placeholder={placeholder} />
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "cancelado" || status === "rechazado"
      ? "destructive"
      : status === "entregado"
        ? "default"
        : "secondary";

  return (
    <Badge variant={variant}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}

export function StatsCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 py-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <div className="rounded-lg bg-muted p-2">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export function RoleShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <section className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Button
              nativeButton={false}
              variant="link"
              className="h-auto px-0"
              render={<Link to="/dashboard" />}
            >
              Delivery App
            </Button>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {actions}
        </header>
        {children}
      </section>
    </main>
  );
}

export function MobileBottomNav({
  items,
}: {
  items: Array<{ href: string; label: string; icon?: React.ComponentType<{ className?: string }> }>;
}) {
  const location = useLocation();

  return (
    <nav className="fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-md items-center justify-around rounded-xl border bg-card p-2 shadow-lg md:hidden">
      {items.map((item) => {
        const Icon = item.icon ?? Home;
        const active = location.pathname === item.href;

        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex min-w-16 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground",
              active && "bg-muted text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarNavigation({
  items,
}: {
  items: Array<{ href: string; label: string; icon?: React.ComponentType<{ className?: string }> }>;
}) {
  const location = useLocation();

  return (
    <aside className="hidden w-56 shrink-0 space-y-1 md:block">
      {items.map((item) => {
        const Icon = item.icon ?? ShoppingCart;
        const active = location.pathname === item.href;

        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
              active && "bg-muted text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </aside>
  );
}

export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b bg-muted/50 text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b last:border-b-0">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function ChartPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad de pedidos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-44 items-end gap-3">
          {[44, 72, 58, 91, 66, 84, 52].map((height, index) => (
            <div
              key={index}
              className="flex-1 rounded-t-lg bg-primary/80"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
