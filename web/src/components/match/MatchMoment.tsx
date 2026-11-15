"use client";

import { useEffect, useState } from "react";
import { Scene, type SceneName } from "@/components/match/Scenes";

// Corner "match moment": a small pitch card (bottom-right) that plays a short scene
// after a search or when a player page opens. It never blocks clicks, disappears on
// its own, and can be switched off (remembered in this browser).

type Moment = { scene: SceneName; caption: string };
const EVENT = "fvi:match-moment";
const STORAGE_KEY = "fvi-match-moments";
const SHOW_MS = 3200;

declare global {
  interface Window {
    __fviPendingMoment?: Moment;
  }
}

function isOff(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "off";
  } catch {
    return false;
  }
}

function setOff(off: boolean) {
  try {
    if (off) localStorage.setItem(STORAGE_KEY, "off");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage blocked: the setting just won't persist */
  }
  window.dispatchEvent(new Event(`${EVENT}-setting`));
}

/** Pages render this to request a scene. Fires once per distinct scene + caption. */
export function PlayScene({ scene, caption }: Moment) {
  useEffect(() => {
    const m = { scene, caption };
    // The layout's listener may mount after this effect (children run first), so
    // leave the request where it can pick it up, then announce it.
    window.__fviPendingMoment = m;
    window.dispatchEvent(new CustomEvent<Moment>(EVENT, { detail: m }));
  }, [scene, caption]);
  return null;
}

export function MatchMoment() {
  const [moment, setMoment] = useState<(Moment & { id: number }) | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const play = (m: Moment) => {
      window.__fviPendingMoment = undefined;
      if (isOff()) return;
      clearTimeout(timer);
      setMoment({ ...m, id: Date.now() });
      timer = setTimeout(() => setMoment(null), SHOW_MS);
    };
    const onEvent = (e: Event) => play((e as CustomEvent<Moment>).detail);
    window.addEventListener(EVENT, onEvent);
    if (window.__fviPendingMoment) play(window.__fviPendingMoment);
    return () => {
      window.removeEventListener(EVENT, onEvent);
      clearTimeout(timer);
    };
  }, []);

  return (
    <>
      {/* Announce the caption politely for screen readers; the drawing is decorative. */}
      <p className="sr-only" aria-live="polite">
        {moment?.caption ?? ""}
      </p>
      {moment && (
        <div
          key={moment.id}
          className="match-card pointer-events-none fixed right-3 bottom-3 z-50 w-40 overflow-hidden rounded-xl border-2 border-[var(--chalk-line)]/70 bg-[var(--turf)] shadow-lg sm:right-5 sm:bottom-5 sm:w-60"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          <Scene name={moment.scene} />
          <div className="flex items-start justify-between gap-2 px-3 py-2">
            <p aria-hidden className="text-xs leading-snug font-medium text-[var(--chalk-line)] sm:text-sm">
              {moment.caption}
            </p>
            <button
              type="button"
              onClick={() => {
                setOff(true);
                setMoment(null);
              }}
              className="pointer-events-auto -mt-0.5 -mr-1 shrink-0 rounded px-1.5 text-base leading-none text-[var(--chalk-line)]/80 hover:text-[var(--chalk-line)]"
              aria-label="Turn off match animations"
              title="Turn off match animations"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Footer switch so a visitor who turned the animations off can bring them back. */
export function MomentsToggle() {
  const [off, setOffState] = useState(false);
  useEffect(() => {
    const sync = () => setOffState(isOff());
    sync();
    window.addEventListener(`${EVENT}-setting`, sync);
    return () => window.removeEventListener(`${EVENT}-setting`, sync);
  }, []);
  return (
    <button
      type="button"
      onClick={() => setOff(!off)}
      className="text-sm text-muted underline underline-offset-2 hover:text-ink"
      aria-pressed={!off}
    >
      Match animations: {off ? "off" : "on"}
    </button>
  );
}
