import type { Metadata } from "next";
import Link from "next/link";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { Disclaimer } from "@/components/Disclaimer";
import "./globals.css";

const body = Barlow({
  variable: "--font-barlow",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

const display = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "Footballer Value Index", template: "%s | Footballer Value Index" },
  description:
    "Market values, stats and five-year value estimates for players in Europe's top five leagues.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="border-b-4 border-pitch">
          <nav className="mx-auto flex max-w-5xl items-baseline justify-between gap-4 px-4 py-3">
            <Link
              href="/"
              className="font-display text-2xl font-bold tracking-tight text-pitch"
            >
              Footballer Value Index
            </Link>
            <Link href="/players" className="font-medium text-ink underline-offset-4 hover:underline">
              Players
            </Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-rule">
          <div className="mx-auto max-w-5xl px-4 py-6">
            <Disclaimer />
          </div>
        </footer>
      </body>
    </html>
  );
}
