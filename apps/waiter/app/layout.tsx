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

// Metadata configuration for the Waiter app
export const metadata: Metadata = {
  title: 'RedBut | Waiter Dashboard',
  description: 'AI-powered restaurant waiter assistant dashboard',
  keywords: ['restaurant', 'waiter', 'dashboard', 'AI', 'requests', 'reviews'],
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
  manifest: '',
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
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
