// src/hooks/usePOIStorage.ts
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { POI, NewPOI } from '../types/poi';
import { poiService } from '../api/poiService';

// Helper function to ensure POI has all required fields
const ensurePOI = (poi: any): POI => ({
  ...poi,
  id: typeof poi.id === 'number' ? String(poi.id) : poi.id,
  createdAt: poi.createdAt instanceof Date ? poi.createdAt : new Date(poi.createdAt || Date.now()),
  name: poi.name || 'Unnamed POI',
  description: poi.description || '',
  latitude: Number(poi.latitude) || 0,
  longitude: Number(poi.longitude) || 0
});

const POI_STORAGE_KEY = '@GeoTracker:pois';
const SYNC_QUEUE_KEY = '@GeoTracker:syncQueue';

export const usePOIStorage = () => {
  const [pois, setPois] = useState<POI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [syncInProgress, setSyncInProgress] = useState(false);

  // Load POIs from local storage on mount and sync with the server
  useEffect(() => {
    const loadPOIs = async () => {
      try {
        // Try to load from API first if getPOIs is available
        if (poiService && typeof poiService.getPOIs === 'function') {
          const onlinePOIs = await poiService.getPOIs();
          const validatedPOIs = onlinePOIs.map(ensurePOI);
          setPois(validatedPOIs);
          await AsyncStorage.setItem(POI_STORAGE_KEY, JSON.stringify(validatedPOIs));
          setIsOnline(true);
        } else {
          throw new Error('getPOIs not available');
        }
      } catch (error) {
        console.warn('Offline mode: Using local storage', error);
        // Fall back to local storage if API is not available
        try {
          const storedPOIs = await AsyncStorage.getItem(POI_STORAGE_KEY);
          if (storedPOIs) {
            const parsedPOIs = JSON.parse(storedPOIs);
            const validatedPOIs = Array.isArray(parsedPOIs) 
              ? parsedPOIs.map(ensurePOI)
              : [];
            setPois(validatedPOIs);
          } else {
            setPois([]);
          }
        } catch (storageError) {
          console.error('Error reading from storage:', storageError);
          setPois([]);
        }
        setIsOnline(false);
      } finally {
        setIsLoading(false);
        // Process any pending sync operations
        processSyncQueue();
      }
    };

    loadPOIs();
  }, []);

  // Process any pending sync operations
  const processSyncQueue = useCallback(async () => {
    if (syncInProgress) return;
    
    try {
      setSyncInProgress(true);
      const queue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (!queue) return;

      const operations = JSON.parse(queue);
      if (!operations.length) return;

      console.log('Processing sync queue with', operations.length, 'operations');
      
      for (const op of operations) {
        try {
          switch (op.type) {
            case 'ADD':
              await poiService.createPOI(op.data);
              break;
            case 'UPDATE':
              await poiService.updatePOI(op.data.id, op.data);
              break;
            case 'DELETE':
              await poiService.deletePOI(op.id);
              break;
          }
        } catch (error) {
          console.error('Failed to sync operation:', op, error);
          // Stop processing on first error to maintain operation order
          throw error;
        }
      }

      // Clear the queue if all operations succeeded
      await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncInProgress(false);
    }
  }, [syncInProgress]);

  // Add an operation to the sync queue
  const addToSyncQueue = async (type: 'ADD' | 'UPDATE' | 'DELETE', data: any) => {
    const queueItem = {
      type,
      id: data.id,
      data,
      timestamp: new Date().toISOString(),
    };

    const existingQueue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    const queue = existingQueue ? JSON.parse(existingQueue) : [];
    queue.push(queueItem);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  };

  // Add a new POI
  const addPOI = async (poiData: NewPOI): Promise<POI> => {
    const newPOI: POI = {
      ...poiData,
      id: Crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Update local state immediately for better UX
    const updatedPOIs = [...pois, newPOI];
    setPois(updatedPOIs);
    await AsyncStorage.setItem(POI_STORAGE_KEY, JSON.stringify(updatedPOIs));

    try {
      // Try to save to the server
      const savedPOI = await poiService.createPOI(newPOI);
      
      // Update local storage with server data (in case of server-side modifications)
      const updatedList = updatedPOIs.map(poi => 
        poi.id === newPOI.id ? { ...savedPOI } : poi
      );
      setPois(updatedList);
      await AsyncStorage.setItem(POI_STORAGE_KEY, JSON.stringify(updatedList));
      
      return savedPOI;
    } catch (error) {
      console.warn('Failed to save POI to server, adding to sync queue', error);
      await addToSyncQueue('ADD', newPOI);
      return newPOI;
    }
  };

  // Update an existing POI
  const updatePOI = async (id: string, updates: Partial<POI>): Promise<POI> => {
    const updatedPOI = {
      ...updates,
      id,
      updatedAt: new Date(),
    };

    // Update local state immediately
    const updatedPOIs = pois.map(poi => 
      poi.id === id ? { ...poi, ...updatedPOI } : poi
    );
    setPois(updatedPOIs);
    await AsyncStorage.setItem(POI_STORAGE_KEY, JSON.stringify(updatedPOIs));

    try {
      // Try to update on the server
      const savedPOI = await poiService.updatePOI(id, updatedPOI);
      
      // Update local storage with server data
      const finalUpdatedList = updatedPOIs.map(poi => 
        poi.id === id ? { ...savedPOI } : poi
      );
      setPois(finalUpdatedList);
      await AsyncStorage.setItem(POI_STORAGE_KEY, JSON.stringify(finalUpdatedList));
      
      return savedPOI;
    } catch (error) {
      console.warn('Failed to update POI on server, adding to sync queue', error);
      await addToSyncQueue('UPDATE', { ...updates, id });
      return updatedPOI as POI;
    }
  };

  // Delete a POI
  const deletePOI = async (id: string): Promise<void> => {
    // Remove from local state immediately
    const updatedPOIs = pois.filter(poi => poi.id !== id);
    setPois(updatedPOIs);
    await AsyncStorage.setItem(POI_STORAGE_KEY, JSON.stringify(updatedPOIs));

    try {
      // Try to delete from the server
      await poiService.deletePOI(id);
    } catch (error) {
      console.warn('Failed to delete POI from server, adding to sync queue', error);
      await addToSyncQueue('DELETE', { id });
    }
  };

  // Sync with the server
  const syncWithServer = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const onlinePOIs = await poiService.getPOIs();
      setPois(onlinePOIs);
      await AsyncStorage.setItem(POI_STORAGE_KEY, JSON.stringify(onlinePOIs));
      setIsOnline(true);
      
      // Process any pending sync operations
      await processSyncQueue();
      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      setIsOnline(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    pois,
    isLoading,
    isOnline,
    syncInProgress,
    addPOI,
    updatePOI,
    deletePOI,
    syncWithServer,
  };
};