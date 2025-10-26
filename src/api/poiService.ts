import { POI, NewPOI } from '../types/poi';
import { api } from './index';

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
  async list(page = 1, limit = 50) {
    const res = await api.get<Paginated<POI>>('/pois', { params: { page, limit } });
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

  async create(payload: {
    name: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    tags?: string[];
    rating?: number;
  }) {
    const res = await api.post<POI>('/pois', payload);
    return res.data;
  },

  async update(id: number, payload: Partial<POI>) {
    const res = await api.put<POI>(`/pois/${id}`, payload);
    return res.data;
  },

  async remove(id: number) {
    const res = await api.delete<{ success: boolean }>(`/pois/${id}`);
    return res.data;
  },

  async nearby(lat: number, lng: number, radiusKm: number) {
    const res = await api.get<POI[]>(`/pois/nearby`, { params: { lat, lng, radius: radiusKm } });
    return res.data;
  },

  // Get all POIs with pagination support
  async getPOIs(page = 1, limit = 100): Promise<POI[]> {
    try {
      const response = await api.get<Paginated<POI>>('/pois', {
        params: { page, limit }
      });
      
      // Handle both paginated response and direct array response
      const data = response.data?.data || response.data;
      
      if (!Array.isArray(data)) {
        console.error('Unexpected API response format:', data);
        throw new Error('Invalid response format from server');
      }
      
      // Transform the response to match our POI type
      return data.map(poi => ({
        ...poi,
        id: String(poi.id), // Ensure ID is string
        createdAt: poi.createdAt ? (poi.createdAt instanceof Date ? poi.createdAt : new Date(poi.createdAt)) : new Date(),
        name: poi.name || 'Unnamed POI',
        description: poi.description || '',
        latitude: Number(poi.latitude) || 0,
        longitude: Number(poi.longitude) || 0
      }));
    } catch (error) {
      console.error('Error in getPOIs:', error);
      // Fallback to list if getPOIs fails
      try {
        const response = await this.list(page, limit);
        return response.data || [];
      } catch (fallbackError) {
        console.error('Fallback list also failed:', fallbackError);
        throw new Error('Failed to fetch POIs. Please check your connection.');
      }
    }
  },

  // Create a new POI
  async createPOI(poi: NewPOI): Promise<POI> {
    try {
      // First try the main API endpoint
      try {
        const response = await api.post<POI>('/pois', poi);
        return response.data;
      } catch (apiError) {
        console.warn('API create failed, trying fallback:', apiError);
        // Fallback to direct fetch if API call fails
        const response = await fetch(`${API_BASE_URL}/pois`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(poi),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to create POI');
        }
        
        const data = await response.json();
        return {
          ...data,
          id: String(data.id),
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
        };
      }
    } catch (error) {
      console.error('Error in createPOI:', error);
      throw error;
    }
  },

  // Update a POI
  async updatePOI(id: string, updates: Partial<POI>): Promise<POI> {
    try {
      // First try the main API endpoint
      try {
        const response = await api.put<POI>(`/pois/${id}`, updates);
        return response.data;
      } catch (apiError) {
        console.warn('API update failed, trying fallback:', apiError);
        // Fallback to direct fetch if API call fails
        const response = await fetch(`${API_BASE_URL}/pois/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to update POI');
        }
        
        const data = await response.json();
        return {
          ...data,
          id: String(data.id),
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
        };
      }
    } catch (error) {
      console.error('Error in updatePOI:', error);
      throw error;
    }
  },

  // Delete a POI
  async deletePOI(id: string): Promise<void> {
    try {
      // First try the main API endpoint
      try {
        await api.delete(`/pois/${id}`);
        return;
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
    } catch (error) {
      console.error('Error in deletePOI:', error);
      throw error;
    }
  },


};
