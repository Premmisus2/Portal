import type { Metadata } from 'next';

// Private-page hosting strategy: URL is reachable by anyone with the link,
// but search engines must not index it. Robots meta blocks Google/Bing.
// The page itself contains pricing + commission detail we don't want public.
export const metadata: Metadata = {
  title: 'Premmisus — Offer Overview',
  description: 'Prospective sales partner overview. Marketing services, AI services, commission structure, career ladder.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function OfferLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
