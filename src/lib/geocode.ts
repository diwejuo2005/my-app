// A resolved location: everything that has to change together when someone
// moves, so their map pin, local time and weather all follow the city name.
export type Place = {
  city: string;
  region?: string; // state / province, to tell apart e.g. Durham NC from Durham UK
  country: string; // full name, e.g. "United States"
  countryCode: string; // ISO code, e.g. "US"
  timezone: string;
  lat: number;
  lon: number;
};

export async function searchPlaces(query: string): Promise<Place[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.results || []).map((r: any) => ({
    city: r.name,
    region: r.admin1,
    country: r.country ?? r.country_code,
    countryCode: r.country_code,
    timezone: r.timezone,
    lat: r.latitude,
    lon: r.longitude,
  }));
}

export function describePlace(p: Pick<Place, "city" | "region" | "country">): string {
  return [p.city, p.region, p.country].filter(Boolean).join(", ");
}
