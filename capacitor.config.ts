import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alfa.option',
  appName: 'Alfa Option',
  webDir: 'out',
  server: {
    // Load the live site through Caddy (port 81) so /api/* proxying to the
    // Expert Option bridge works inside the app.
    url: 'http://76.13.40.219:81',
    cleartext: true,
  },
  android: {
    appendUserAgent: 'AlfaOptionApp',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#272E4A',
    },
  },
};

export default config;
