import type { MetadataRoute } from 'next';

// Next.js App Router serves this from `/manifest.webmanifest`. iOS reads it
// after you Add to Home Screen — `display: standalone` is what gives the
// installed app its own card in the app switcher (instead of Safari's).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Premmisus Sales Portal',
    short_name: 'Premmisus',
    description: 'Premmisus sales operating system — calls, scripts, SMS inbox, leaderboard.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
