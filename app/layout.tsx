import type { Metadata, Viewport } from 'next';
import { Inter, Roboto, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ANTI_FLASH_SCRIPT } from '@/lib/theme';
import ServiceWorkerRegistrar from '@/components/inbox/ServiceWorkerRegistrar';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
  display: 'swap',
});

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Premmisus — Sales Portal',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Premmisus',
  },
};

// viewport-fit=cover is what makes iOS PWAs treat `position: fixed; bottom: 0`
// as anchored to the VISUAL viewport instead of the layout viewport. Without
// it the bottom nav scrolls with content on home-screen-installed iOS. Also
// required for env(safe-area-inset-*) to return non-zero values.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${roboto.variable} ${jetbrains.variable}`}>
      <body>
        {/* Anti-flash: applies theme class BEFORE React hydrates so users
            never see a flash of the wrong theme on first paint */}
        <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH_SCRIPT }} />
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
