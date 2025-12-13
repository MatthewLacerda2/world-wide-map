export interface GeoLocation {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface ResultEntry {
  origin: string;
  destination: string;
  pingTime: number;
  origin_geo?: GeoLocation | null;
  destination_geo?: GeoLocation | null;
  uuid?: string;
}

export type ResultsData = ResultEntry[];
