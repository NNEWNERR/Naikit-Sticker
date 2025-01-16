import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'naikit.sticker.fe',
  appName: 'Naikit-Sticker-FE',
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
