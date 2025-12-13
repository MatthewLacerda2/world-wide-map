import { Marker, Popup } from "react-leaflet";
import type { GeoLocation } from "../types";

interface LocationMarkerProps {
  geo: GeoLocation;
}

export function LocationMarker({ geo }: LocationMarkerProps) {
  return (
    <Marker position={[geo.latitude, geo.longitude]}>
      <Popup>
        {geo.city}, {geo.region}, {geo.country}
      </Popup>
    </Marker>
  );
}
