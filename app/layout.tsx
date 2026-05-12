import type { Metadata } from 'next';
import { Inter, Roboto, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ANTI_FLASH_SCRIPT } from '@/lib/theme';

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
  icons: { icon: '/favicon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${roboto.variable} ${jetbrains.variable}`}>
      <body>
        {/* Anti-flash: applies theme class BEFORE React hydrates so users
            never see a flash of the wrong theme on first paint */}
        <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
