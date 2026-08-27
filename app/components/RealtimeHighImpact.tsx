"use client";

import { useCallback, useEffect, useState } from "react";
import HighImpact from "./HighImpact";

type IntelligenceEvent = {
  eventId?: string;
  lifecycle?: string;
  priority?: number;
  publishedAt?: string;
};

/**
 * Fast browser watcher over the cached intelligence snapshot.
 * The server ingests external feeds once per minute; the browser checks the
 * lightweight cached result every 15s so a new event appears quickly without
 * multiplying external RSS fetches or serverless compute.
 */
export default function RealtimeHighImpact() {
  const [tick, setTick] = useState(0);

  const poll = useCallback(async () => {
    try {
      const response = await fetch("/api/intelligence", { cache: "default" });
      if (!response.ok) return;
      const data = await response.json();
      const top: IntelligenceEvent | undefined = data.events?.[0];
      const signature = top
        ? `${top.eventId}|${top.lifecycle}|${top.priority}|${top.publishedAt}`
        : "none";
      const previous = window.sessionStorage.getItem("revedge:intelligence-signature");

      if (previous !== signature) {
        window.sessionStorage.setItem("revedge:intelligence-signature", signature);
        setTick((value) => value + 1);
      }
    } catch {
      // Never let the watcher break the homepage.
    }
  }, []);

  useEffect(() => {
    let timer: number | undefined;

    const schedule = () => {
      if (timer) window.clearTimeout(timer);
      const delay = document.visibilityState === "visible" ? 15000 : 60000;
      timer = window.setTimeout(async () => {
        await poll();
        schedule();
      }, delay);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void poll();
      schedule();
    };

    void poll();
    document.addEventListener("visibilitychange", onVisibility);
    schedule();

    const minuteRefresh = window.setInterval(() => setTick((value) => value + 1), 60000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (timer) window.clearTimeout(timer);
      window.clearInterval(minuteRefresh);
    };
  }, [poll]);

  return <HighImpact key={tick} />;
}
