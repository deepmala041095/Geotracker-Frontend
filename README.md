# GeoTracker

A React Native application for tracking and managing points of interest (POIs) with location-based services.

## Features

- View nearby points of interest on an interactive map
- Add, edit, and delete POIs
- Search and filter POIs by distance and category
- Offline support with local data persistence
- Real-time location tracking
- Cross-platform support (iOS, Android, Web)

## Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Expo CLI
- Android Studio / Xcode (for native builds)
- Expo Go app (for development)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd GeoTracker
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

## Running the App

### Development Mode

1. Start the development server:
   ```bash
   npm start
   # or
   yarn start
   ```

2. Use the Expo Go app on your mobile device to scan the QR code, or press:
   - `i` for iOS simulator
   - `a` for Android emulator
   - `w` for web browser

### Building for Production

#### Android APK

1. Configure the build:
   ```bash
   eas build:configure
   ```

2. Build the APK:
   ```bash
   eas build -p android --profile preview
   ```

3. The APK will be available in your Expo account and you'll receive an email when the build is complete.

## Configuration

Create a `.env` file in the root directory with the following variables:

```
API_BASE_URL=your_api_url_here
MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
```

## Project Structure

```
GeoTracker/
├── assets/             # App assets (images, icons, etc.)
├── src/
│   ├── api/            # API services and configurations
│   ├── components/     # Reusable UI components
│   ├── features/       # Feature-based modules
│   ├── hooks/          # Custom React hooks
│   └── utils/          # Utility functions
├── App.tsx            # Main application component
├── app.json           # Expo configuration
└── package.json       # Project dependencies
```

## Dependencies

- React Native
- Expo
- React Navigation
- Redux Toolkit
- React Native Maps
- Expo Location
- React Native Paper
- Axios

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the repository or contact the maintainers.

---

Built with ❤️ using React Native and Expo
