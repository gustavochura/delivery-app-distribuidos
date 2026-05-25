import { useState } from "react";
import Map, { Marker } from "react-map-gl/mapbox";
import { MapPin } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";

const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;

const DEFAULT_LAT = -13.5319;
const DEFAULT_LNG = -71.9675;

export function AddressPickerMap({
  onCoordinates,
  defaultLat = DEFAULT_LAT,
  defaultLng = DEFAULT_LNG,
}: {
  onCoordinates: (lat: number, lng: number) => void;
  defaultLat?: number;
  defaultLng?: number;
}) {
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null);

  if (!token) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="grid min-h-[220px] place-items-center bg-muted/40 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Mapa no disponible. Agrega la dirección como texto.
          </p>
        </CardContent>
      </Card>
    );
  }

  function handleClick(e: { lngLat: { lat: number; lng: number } }) {
    setMarker({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    onCoordinates(e.lngLat.lat, e.lngLat.lng);
  }

  function handleDragEnd(e: { lngLat: { lat: number; lng: number } }) {
    setMarker({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    onCoordinates(e.lngLat.lat, e.lngLat.lng);
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">Toca el mapa para marcar tu ubicación</p>
      <div className="h-[220px] overflow-hidden rounded-lg border">
        <Map
          mapboxAccessToken={token}
          initialViewState={{ longitude: defaultLng, latitude: defaultLat, zoom: 14 }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          style={{ height: "100%", width: "100%" }}
          onClick={handleClick}
          cursor="crosshair"
        >
          {marker && (
            <Marker
              latitude={marker.lat}
              longitude={marker.lng}
              draggable
              onDragEnd={handleDragEnd}
            >
              <div className="flex -translate-y-2 flex-col items-center">
                <div className="rounded-full bg-primary p-1.5 text-primary-foreground shadow-md">
                  <MapPin className="size-4" />
                </div>
              </div>
            </Marker>
          )}
        </Map>
      </div>
    </div>
  );
}
