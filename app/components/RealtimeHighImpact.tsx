"use client";

import { useEffect, useState } from "react";
import HighImpact from "./HighImpact";

/**
 * Re-mounts the intelligence feed on a short cadence so the client never
 * waits for the old 60s component timer when a new catalyst is available.
 * The API itself is now no-store, so each mount performs a fresh server fetch.
 */
export default function RealtimeHighImpact() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 20000);
    return () => window.clearInterval(timer);
  }, []);

  return <HighImpact key={tick} />;
}
