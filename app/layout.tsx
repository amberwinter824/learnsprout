import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GlobalStyles from "./components/GlobalStyles";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Learn Sprout",
  description: "Personalized Montessori activities for your child",
};

// This tells Next.js not to statically optimize this page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <GlobalStyles />
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}