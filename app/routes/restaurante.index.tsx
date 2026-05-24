import { redirect } from "react-router";

export async function loader() {
  throw redirect("/restaurante/pedidos");
}

export default function RestauranteIndex() {
  return null;
}
