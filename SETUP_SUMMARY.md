# GeoTracker - React Native (Expo) - Project Documentation

## 📱 App Overview
A location-based application for tracking and managing Points of Interest (POIs) with the following key features:
- Interactive map with real-time location
- POI management (Create, Read, Update, Delete)
- Offline support
- Search and filter functionality

## 🪜 1. Setup
- Use Node.js 21
- Install Expo CLI
  ```bash
  npm install -g expo-cli
  ```
- Create project with TypeScript
  ```bash
  npx create-expo-app GeoTracker --template expo-template-blank-typescript
  ```

## ⚙️ 2. Install Core Libraries

### Navigation
```bash
npx expo install @react-navigation/native @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context
```

### Maps
```bash
npx expo install react-native-maps
```

### Location access
```bash
npx expo install expo-location
```

### UI
```bash
npx expo install react-native-paper react-native-vector-icons
```

### State Management
```bash
npm install @reduxjs/toolkit react-redux
```

### API calls
```bash
npm install axios
```

## 📁 3. Project Structure

### Core Directories
```
src/
├── api/                 # API services and configurations
│   ├── index.ts         # Axios instance and API config
│   └── poiService.ts    # POI-related API calls
│
├── components/          # Reusable UI components
│   ├── common/          # Shared components (buttons, inputs, etc.)
│   ├── map/             # Map-related components
│   └── ui/              # General UI components
│
├── features/            # Feature modules
│   ├── map/             # Map screen and components
│   │   ├── components/  # Map-specific components
│   │   └── MapScreen.tsx
│   │
│   ├── poi/             # POI management
│   │   ├── components/  # POI-related components
│   │   ├── POIListScreen.tsx
│   │   └── POIDetailScreen.tsx
│   │
│   └── settings/        # App settings
│       └── SettingsScreen.tsx
│
├── navigation/          # Navigation configuration
│   ├── AppNavigator.tsx # Main navigation stack
│   └── TabNavigator.tsx # Bottom tab navigation
│
├── store/               # Redux store
│   ├── index.ts         # Store configuration
│   └── slices/          # Redux slices
│       └── poiSlice.ts  # POI state management
│
└── utils/               # Utility functions
    ├── helpers.ts       # Helper functions
    └── types.ts         # TypeScript type definitions
```
src/
 ├── api/
 ├── components/
 ├── features/
 │   ├── map/
 │   ├── poi/
 ├── navigation/
 ├── store/
 └── App.tsx
```

## 🗺️ 4. Map Setup
- Use react-native-maps in MapScreen.tsx
- Get user location using expo-location
- Show markers for POIs

## 🧭 5. Navigation Structure

### Tab Navigation (Main Tabs)
```typescript
// src/navigation/TabNavigator.tsx
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
      }}>
      <Tab.Screen 
        name="Map" 
        component={MapScreen} 
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="map" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="POIs" 
        component={POIListScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="place" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="settings" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
```

### Stack Navigation
```typescript
// src/navigation/AppNavigator.tsx
const Stack = createNativeStackNavigator();

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="MainTabs" 
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="POIDetail" 
          component={POIDetailScreen}
          options={{ title: 'POI Details' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
- Add bottom tab navigation (Map, POIs, Settings) using React Navigation

## 🧠 6. State Management

### Redux Store Configuration
```typescript
// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import poiReducer from './slices/poiSlice';

export const store = configureStore({
  reducer: {
    poi: poiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### POI Slice Example
```typescript
// src/store/slices/poiSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { poiService } from '../../api/poiService';

interface POIState {
  items: POI[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: POIState = {
  items: [],
  status: 'idle',
  error: null,
};

export const fetchPOIs = createAsyncThunk(
  'poi/fetchPOIs',
  async ({ lat, lng, radius }: { lat: number; lng: number; radius: number }) => {
    const response = await poiService.getPOIs(lat, lng, radius);
    return response.data;
  }
);

const poiSlice = createSlice({
  name: 'poi',
  initialState,
  reducers: {
    // Add reducers here
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPOIs.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPOIs.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchPOIs.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch POIs';
      });
  },
});

export default poiSlice.reducer;
- Create poiSlice.ts for POI list state
- Configure store/index.ts
- Connect to the app via <Provider> in App.tsx

## 🌐 7. API Integration

### API Service Setup
```typescript
// src/api/index.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.API_BASE_URL || 'http://your-backend-url/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if exists
    const token = ''; // Get from secure store
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle errors globally
    if (error.response?.status === 401) {
      // Handle unauthorized
    }
    return Promise.reject(error);
  }
);

export default api;

// POI Service
// src/api/poiService.ts
import api from './index';

export const poiService = {
  getPOIs: async (lat: number, lng: number, radius: number) => {
    const response = await api.get('/pois', { params: { lat, lng, radius } });
    return response.data;
  },
  
  createPOI: async (poiData: POICreateDto) => {
    const response = await api.post('/pois', poiData);
    return response.data;
  },
  
  updatePOI: async (id: string, updates: POIUpdateDto) => {
    const response = await api.put(`/pois/${id}`, updates);
    return response.data;
  },
  
  deletePOI: async (id: string) => {
    const response = await api.delete(`/pois/${id}`);
    return response.data;
  },
};
- Create src/api/index.ts using Axios
- Use your backend URL (http://<your-ip>:3000/api)

## 🚀 8. Running the App

### Development Mode
```bash
# Start the development server
npx expo start

# Clear cache if needed
npx expo start -c

# Run on specific platform
npx expo start --android  # Android
npx expo start --ios      # iOS
npx expo start --web      # Web
```

### Production Build
```bash
# Configure EAS build
eas build:configure

# Build Android APK
eas build -p android --profile preview

# Build iOS IPA
eas build -p ios --profile preview
```

### Environment Variables
Create a `.env` file in the root directory:
```env
API_BASE_URL=your_api_url
MAPBOX_ACCESS_TOKEN=your_mapbox_token
```

Update `app.json` to use these variables:
```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "${API_BASE_URL}",
      "mapboxAccessToken": "${MAPBOX_ACCESS_TOKEN}"
    }
  }
}
```
```bash
npx expo start
```
- Scan QR code with Expo Go
- Or run on emulator (i for iOS / a for Android)

## 🛠 9. Troubleshooting (Node 21)
- If dependency issues:
  ```bash
  npm install --legacy-peer-deps
  ```
- If Expo cache issue:
  ```bash
  npx expo start -c
  ```

## 🎯 Final Stack
| Feature | Tech |
|---------|------|
| Framework | Expo (React Native + TypeScript) |
| Maps | react-native-maps |
| Navigation | React Navigation Tabs |
| Location | expo-location |
| UI | React Native Paper |
| State | Redux Toolkit |
| API | Axios (Express backend) |