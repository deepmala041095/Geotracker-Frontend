export interface POI {
  id: string | number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
}

export type NewPOI = Omit<POI, 'id' | 'createdAt'>;
