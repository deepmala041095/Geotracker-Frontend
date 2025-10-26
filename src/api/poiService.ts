import { POI, NewPOI } from '../types/poi';
import { api } from './index';

// Helper function to ensure location data is properly formatted
const formatPOIData = (data: any) => {
  const formattedData = { ...data };
  
  // If we have both latitude and longitude, ensure the location field is set
  if (formattedData.latitude != null && formattedData.longitude != null) {
    formattedData.location = {
      type: 'Point',
      coordinates: [formattedData.longitude, formattedData.latitude]
    };
  }
  
  return formattedData;
};

// Re-export the POI type for backward compatibility
export type { POI };

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

const API_BASE_URL = 'https://geotracker-backend.onrender.com/api'; // Replace with your actual API URL

// Base API service with common methods
export const poiService = {

  // Get all POIs with pagination support
  async list(page = 1, limit = 50) {
    const res = await api.get<Paginated<POI>>('/pois', { params: { page, limit } });
    return res.data;
  },

  // Get all POIs with pagination support
  async getPOIs(page = 1, limit = 100): Promise<POI[]> {
    try {
      const response = await api.get<Paginated<POI>>('/pois', {
        params: { page, limit }
      });
      return response.data.data.map((poi: POI) => ({
        ...poi,
        name: poi.name || 'Unnamed POI',
        description: poi.description || '',
        latitude: Number(poi.latitude) || 0,
        longitude: Number(poi.longitude) || 0,
        id: String(poi.id), // Ensure ID is always a string
        createdAt: poi.createdAt ? new Date(poi.createdAt) : new Date()
      }));
    } catch (error) {
      console.error('Error in getPOIs:', error);
      throw new Error('Failed to fetch POIs. Please check your connection.');
    }
  },

  async listNearby(latitude: number, longitude: number, radiusKm: number, page = 1, limit = 50) {
    const res = await api.get<Paginated<POI>>('/pois/nearby', {
      params: {
        lat: latitude,
        lng: longitude,
        radius: radiusKm,
        page,
        limit
      }
    });
    return res.data;
  },

  async getById(id: number | string) {
    try {
      const res = await api.get<POI>(`/pois/${id}`);
      return res.data;
    } catch (error) {
      console.error(`Error fetching POI with ID ${id}:`, error);
      throw error;
    }
  },

  // Create a new POI
  async createPOI(poi: NewPOI): Promise<POI> {
    // Format the POI data before sending to the API
    const formattedData = formatPOIData(poi);
    
    try {
      // First try the main API endpoint
      const response = await api.post<POI>('/pois', formattedData);
      return {
        ...response.data,
        id: String(response.data.id), // Ensure ID is a string
        createdAt: response.data.createdAt ? new Date(response.data.createdAt) : new Date(),
        name: response.data.name || 'Unnamed POI',
        description: response.data.description || '',
        latitude: Number(response.data.latitude) || 0,
        longitude: Number(response.data.longitude) || 0
      };
    } catch (apiError) {
      console.warn('API create failed, trying fallback:', apiError);
      // Fallback to direct fetch if API call fails
      const response = await fetch(`${API_BASE_URL}/pois`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create POI');
      }
      
      const data = await response.json();
      return {
        ...data,
        id: String(data.id),
        name: data.name || 'Unnamed POI',
        description: data.description || '',
        latitude: Number(data.latitude) || 0,
        longitude: Number(data.longitude) || 0,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
      };
    }
  },

  // Update a POI
  async updatePOI(id: string, updates: Partial<POI>): Promise<POI> {
    // Format the update data before sending to the API
    const formattedUpdates = formatPOIData(updates);
    
    try {
      // First try the main API endpoint
      const response = await api.put<POI>(`/pois/${id}`, formattedUpdates);
      return {
        ...response.data,
        id: String(response.data.id), // Ensure ID is a string
        name: response.data.name || 'Unnamed POI',
        description: response.data.description || '',
        latitude: Number(response.data.latitude) || 0,
        longitude: Number(response.data.longitude) || 0,
        createdAt: response.data.createdAt ? new Date(response.data.createdAt) : new Date()
      };
    } catch (apiError) {
      console.warn('API update failed, trying fallback:', apiError);
      // Fallback to direct fetch if API call fails
      const response = await fetch(`${API_BASE_URL}/pois/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedUpdates),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update POI');
      }
      
      const data = await response.json();
      return {
        ...data,
        id: String(data.id),
        name: data.name || 'Unnamed POI',
        description: data.description || '',
        latitude: Number(data.latitude) || 0,
        longitude: Number(data.longitude) || 0,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
      };
    }
  },

  // Delete a POI
  async deletePOI(id: string): Promise<void> {
    try {
      // First try the main API endpoint
      await api.delete(`/pois/${id}`);
    } catch (apiError) {
      console.warn('API delete failed, trying fallback:', apiError);
      // Fallback to direct fetch if API call fails
      const response = await fetch(`${API_BASE_URL}/pois/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete POI');
      }
    }
  },

  async nearby(latitude: number, longitude: number, radiusKm: number) {
    try {
      const response = await api.get<POI[]>('/pois/nearby', {
        params: {
          lat: latitude,
          lng: longitude,
          radius: radiusKm
        }
      });
      return { data: response.data };
    } catch (error) {
      console.error('Error fetching nearby POIs:', error);
      throw error;
    }
  },


};
