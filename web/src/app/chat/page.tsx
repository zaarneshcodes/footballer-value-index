import type { Metadata } from "next";
import { ChatBox } from "@/components/ChatBox";

export const metadata: Metadata = { title: "Ask the data" };

export default function ChatPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-5xl font-bold tracking-tight text-pitch">Ask the data</h1>
        <p className="max-w-prose leading-relaxed text-muted">
          Questions about players in the top five leagues: market values, season stats and the
          five-year estimates. Answers come only from this site&apos;s database, looked up by an AI
          model (Google Gemini). It can still make mistakes, so check the player page.
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
