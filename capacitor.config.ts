import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'krungthon.air.fe',
  appName: 'Krungthon-Air-FE',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
