import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Investment Agent',
  description: 'Analyze tickers, build portfolios, and get strategy suggestions.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
