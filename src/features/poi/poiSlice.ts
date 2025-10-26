import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface POI {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
}

interface POIState {
  list: POI[];
}

const initialState: POIState = { list: [] };

const poiSlice = createSlice({
  name: 'poi',
  initialState,
  reducers: {
    setPOIs(state, action: PayloadAction<POI[]>) {
      state.list = action.payload;
    },
  },
});

export const { setPOIs } = poiSlice.actions;
export default poiSlice.reducer;
