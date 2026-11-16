import type { Metadata } from "next";
import { ChatBox } from "@/components/ChatBox";

export const metadata: Metadata = { title: "The Dugout" };

export default function ChatPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-5xl font-bold tracking-tight text-pitch">The Dugout</h1>
        <p className="max-w-prose leading-relaxed text-muted">
          Pull up a seat next to The Scout. Ask about any player in the top five leagues: what
          they&apos;re worth, how they&apos;ve played, where their value could go. Every answer is
          looked up in this site&apos;s database by an AI model (Google Gemini). It can still get
          things wrong, so check the player page.
        </p>
      </div>
      <ChatBox />
      <p className="text-xs leading-relaxed text-muted">
        Runs on Gemini&apos;s free tier: Google may use questions sent here to improve its
        products, so don&apos;t type anything personal. If it&apos;s busy, wait a minute and try
        again.
      </p>
    </div>
  );
}
