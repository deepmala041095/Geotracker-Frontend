import axios from 'axios';
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra || (Constants.manifest as any)?.extra || {}) as {
  apiBaseUrl?: string;
};

export const api = axios.create({
  baseURL: extra.apiBaseUrl || 'https://geotracker-backend.onrender.com/api',
  timeout: 10000,
});
