import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import { Bike, Home, Store } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { deliveryPoints } from "~/data/mock-delivery";
import type { Feature, LineString } from "geojson";

const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;

export type DeliveryMapPoint = {
  latitude: number;
  longitude: number;
};

function MarkerBubble({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex -translate-y-2 flex-col items-center gap-1">
      <div className="rounded-full border bg-card p-2 shadow-md">{children}</div>
      <span className="rounded-full bg-background px-2 py-0.5 text-xs shadow-sm">
        {label}
      </span>
    </div>
  );
}

export function MapboxDeliveryMap({
  mode = "cliente",
  restaurant,
  driver,
  customer,
}: {
  mode?: "cliente" | "repartidor";
  restaurant?: DeliveryMapPoint | null;
  driver?: DeliveryMapPoint | null;
  customer?: DeliveryMapPoint | null;
}) {
  const points = {
    restaurant: restaurant ?? deliveryPoints.restaurant,
    driver: driver ?? deliveryPoints.driver,
    customer: customer ?? deliveryPoints.customer,
  };
  const routeGeoJson: Feature<LineString> = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [
        [points.restaurant.longitude, points.restaurant.latitude],
        [points.driver.longitude, points.driver.latitude],
        [points.customer.longitude, points.customer.latitude],
      ],
    },
  };

  if (!token) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="grid min-h-[420px] place-items-center bg-muted/40 p-6 text-center">
          <div>
            <p className="font-medium">Mapbox pendiente de configuracion</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Agrega `VITE_MAPBOX_ACCESS_TOKEN` en `.env` para renderizar el mapa real.
              Mientras tanto, esta pantalla conserva el panel de seguimiento.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-[420px] overflow-hidden rounded-xl border">
      <Map
        mapboxAccessToken={token}
        initialViewState={{
          longitude: points.driver.longitude,
          latitude: points.driver.latitude,
          zoom: 14,
          pitch: mode === "repartidor" ? 45 : 25,
        }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ height: "100%", width: "100%" }}
      >
        <Source id="route" type="geojson" data={routeGeoJson}>
          <Layer
            id="route-line"
            type="line"
            paint={{
              "line-color": "#111827",
              "line-width": 4,
              "line-opacity": 0.85,
            }}
          />
        </Source>
        <Marker {...points.restaurant}>
          <MarkerBubble label="Restaurante">
            <Store className="size-4" />
          </MarkerBubble>
        </Marker>
        <Marker {...points.driver}>
          <MarkerBubble label="Repartidor">
            <Bike className="size-4" />
          </MarkerBubble>
        </Marker>
        <Marker {...points.customer}>
          <MarkerBubble label="Cliente">
            <Home className="size-4" />
          </MarkerBubble>
        </Marker>
      </Map>
    </div>
  );
}
