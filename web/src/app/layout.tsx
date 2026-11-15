import type { Metadata } from "next";
import Link from "next/link";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { Ball, Logo } from "@/components/brand/Logo";
import { Disclaimer } from "@/components/Disclaimer";
import { MatchMoment, MomentsToggle } from "@/components/match/MatchMoment";
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
        <header className="pitch-strip relative overflow-hidden border-b-[3px] border-[var(--chalk-line)]/80">
          {/* Halfway line and centre circle, in chalk: decoration only. */}
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-1/2 h-full w-48 -translate-x-1/2 max-sm:hidden"
            viewBox="0 0 192 64"
            preserveAspectRatio="xMidYMid slice"
          >
            <line x1="96" y1="0" x2="96" y2="64" stroke="var(--chalk-line)" strokeOpacity="0.28" strokeWidth="2" />
            <circle cx="96" cy="32" r="40" fill="none" stroke="var(--chalk-line)" strokeOpacity="0.28" strokeWidth="2" />
            <circle cx="96" cy="32" r="2.5" fill="var(--chalk-line)" fillOpacity="0.4" />
          </svg>
          <nav className="relative mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3.5">
            <Logo />
            <Link
              href="/players"
              className="nav-link press flex items-center gap-2 rounded-full border-2 border-[var(--chalk-line)]/70 px-3.5 py-1 font-display text-lg font-semibold text-[var(--chalk-line)] hover:border-[var(--chalk-line)]"
            >
              <Ball className="nav-ball h-4 w-4" />
              Players
            </Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-rule">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6">
            <Disclaimer />
            <MomentsToggle />
          </div>
        </footer>
        <MatchMoment />
      </body>
    </html>
  );
}
