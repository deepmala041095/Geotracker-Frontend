import { configureStore } from '@reduxjs/toolkit';
import poiReducer from '../features/poi/poiSlice';

export const store = configureStore({
  reducer: {
    poi: poiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
