import type { Metadata, Viewport } from 'next/types';
import { Inter, Roboto_Mono } from 'next/font/google';
import './globals.css';

// Font configuration
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto-mono',
});

// Metadata configuration
export const metadata: Metadata = {
  title: 'RedBut | Restaurant Waiter Assistant',
  description: 'AI-powered restaurant waiter assistant application',
  keywords: ['restaurant', 'waiter', 'assistant', 'AI', 'service'],
  authors: [{ name: 'RedBut Team' }],
  creator: 'RedBut',
  publisher: 'RedBut',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.json',
  themeColor: '#ff3b3b', // Main RedBut color
};

// Viewport configuration for mobile-first approach
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#ff3b3b',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable}`}>
      <body className="min-h-screen bg-background-light text-secondary-900 antialiased">
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
