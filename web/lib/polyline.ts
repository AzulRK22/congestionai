// web/lib/polyline.ts
export type LatLng = { lat: number; lng: number };

/** Decodifica un polyline (Google Encoded Polyline Algorithm) a [{lat,lng}] */
export function decodePolyline(enc: string): LatLng[] {
  if (!enc) return [];
  let index = 0,
    lat = 0,
    lng = 0;
  const coords: LatLng[] = [];

  while (index < enc.length) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = enc.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = enc.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coords.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return coords;
}
