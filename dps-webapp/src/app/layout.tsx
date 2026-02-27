import type { Metadata } from 'next';
import { Open_Sans } from 'next/font/google';
import './globals.css';
import { createClient } from '@/lib/supabase/server';
import { UserMenu } from '@/components/user-menu';

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'DPS WebApp - Dealer Performance Scorecard',
  description: 'Generate dealership performance reports',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className={`${openSans.className} ${openSans.variable}`}>
        {/* Header bar */}
        <header className="bg-white border-b border-[var(--border)] sticky top-0 z-50">
          <div className="max-w-[1080px] w-[90%] mx-auto flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <img src="/footer-logo.png" alt="DPS" className="h-8 w-auto" />
              <span className="text-[var(--foreground)] font-semibold text-base">
                Dealer Performance Scorecard
              </span>
            </div>
            {user && (
              <nav className="flex items-center gap-6 text-sm">
                <a href="/" className="text-[#2ea3f2] hover:text-[#1a8fd8] rg-transition font-medium">
                  Generator
                </a>
                <UserMenu email={user.email ?? ''} />
              </nav>
            )}
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
