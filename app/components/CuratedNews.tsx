"use client";

import { useEffect, useState } from "react";

type Story = {
  title: string;
  source: string;
  link: string;
  publishedAt: string;
  impact: number;
  tag: string;
  direction: "Risk-on" | "Risk-off" | "Neutral";
};

function ageLabel(iso: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function CuratedNews() {
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await fetch("/api/news", { cache: "no-store" });
        if (!response.ok) throw new Error("news unavailable");
        const data = await response.json();
        if (mounted) setStories(data.stories ?? []);
      } catch {
        // Keep the UI quiet rather than inventing headlines.
      }
    };
    load();
    const timer = setInterval(load, 60000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  return (
    <section className="shell section" id="news">
      <div className="sectiontitle"><div><div className="label">Live filtered feed</div><h2>Curated News</h2></div><span className="sub">RSS sources · refreshed 60s</span></div>
      <div className="card news">
        {stories.length === 0 ? (
          <div className="newsempty">Loading live news…</div>
        ) : stories.map((item) => (
          <a className="newsitem" href={item.link} target="_blank" rel="noreferrer" key={`${item.source}-${item.link}`}>
            <div className="newsmeta"><span className="time">{ageLabel(item.publishedAt)} ago</span><span className={`impactmini impact-${item.impact >= 8 ? "high" : item.impact >= 6 ? "mid" : "low"}`}>{item.impact}/10</span></div>
            <h4>{item.title}</h4>
            <p>{item.source} · {item.tag} · {item.direction}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
