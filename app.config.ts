import appJson from './app.json';

export default () => {
  const expoConfig = (appJson as any).expo || {};
  return {
    ...expoConfig,
    plugins: [
      ...(expoConfig.plugins || []),
      'expo-web-browser'
    ],
    extra: {
      ...(expoConfig.extra || {}),
      apiBaseUrl: process.env.API_BASE_URL || 'https://geotracker-backend.onrender.com/api',
    },
  };
};
