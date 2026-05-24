import { redirect } from "react-router";
import { requireRestauranteActive } from "~/lib/roles.server";

export async function action({ request }: { request: Request }) {
  const { restaurantes } = await requireRestauranteActive(request);
  const formData = await request.formData();
  const nuevoId = Number(formData.get("restaurante_id"));

  if (!restaurantes.some((r) => r.restauranteId === nuevoId)) {
    throw redirect("/restaurante/pedidos");
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: "/restaurante/pedidos",
      "Set-Cookie": `restaurante_id=${nuevoId}; Path=/; HttpOnly; SameSite=Lax`,
    },
  });
}

export async function loader() {
  throw redirect("/restaurante/pedidos");
}

export default function RestauranteCambiar() {
  return null;
}
