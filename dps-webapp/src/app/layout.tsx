import type { Metadata } from 'next';
import { Open_Sans } from 'next/font/google';
import './globals.css';

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'DPS WebApp - Dealer Performance Scorecard',
  description: 'Generate dealership performance reports',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${openSans.className} ${openSans.variable}`}>
        {/* Header bar */}
        <header className="bg-white border-b border-[var(--border)] sticky top-0 z-50">
          <div className="max-w-[1080px] w-[90%] mx-auto flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-[#2ea3f2] flex items-center justify-center">
                <span className="text-white font-bold text-sm">DPS</span>
              </div>
              <span className="text-[var(--foreground)] font-semibold text-base">
                Dealer Performance Scorecard
              </span>
            </div>
            <nav className="flex items-center gap-6 text-sm">
              <a href="/" className="text-[#2ea3f2] hover:text-[#1a8fd8] rg-transition font-medium">
                Generator
              </a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
