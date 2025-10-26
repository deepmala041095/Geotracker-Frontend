export interface POI {
  id: string | number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  category?: string;
  hours?: string;
  rating?: number;
  tags?: string[];
  updatedAt?: string | Date;
  createdAt: Date | string;
  location?: {
    type: string;
    coordinates: number[];
  };
}

export type NewPOI = Omit<POI, 'id' | 'createdAt' | 'updatedAt'>;
