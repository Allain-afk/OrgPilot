import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OrgPilot — School Ops Co-pilot",
  description: "Autonomous agent for student organization operations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <nav className="border-b border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between">
              <div className="flex items-center gap-6">
                <Link
                  href="/"
                  className="text-lg font-bold tracking-tight text-indigo-600 dark:text-indigo-400"
                >
                  OrgPilot
                </Link>
                <div className="flex gap-4 text-sm">
                  <Link
                    href="/"
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/approvals"
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  >
                    Pending Approvals
                  </Link>
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Logged in as <span className="font-medium">Maria Lopez</span>{" "}
                <span className="text-xs text-gray-400">(President)</span>
              </div>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
