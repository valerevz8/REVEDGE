"use client";

import { useEffect, useState } from "react";
import HighImpact from "./HighImpact";

/**
 * Realtime decision feed.
 *
 * Visible tab: poll aggressively so a fresh catalyst can surface quickly.
 * Hidden tab: back off to reduce unnecessary requests.
 * Returning to the tab triggers an immediate refresh instead of waiting
 * for the next interval.
 */
export default function RealtimeHighImpact() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let timer: number | undefined;

    const schedule = () => {
      if (timer) window.clearTimeout(timer);
      const delay = document.visibilityState === "visible" ? 10000 : 30000;
      timer = window.setTimeout(() => {
        setTick((value) => value + 1);
        schedule();
      }, delay);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        setTick((value) => value + 1);
      }
      schedule();
    };

    document.addEventListener("visibilitychange", onVisibility);
    schedule();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return <HighImpact key={tick} />;
}
