export type Lifecycle = "NEW · NOW" | "NEW · WATCH" | "ACTIVE · NOW" | "ACTIVE · WATCH" | "FADING · WATCH" | "FADING";
export type StateChange = "NEW" | "ESCALATED" | "CONFIRMED" | "UNCHANGED" | "FADING" | "DOWNGRADED";

export type RawStory = {
  title: string;
  source: string;
  link: string;
  publishedAt: string;
  impact: number;
  priority?: number;
  tag: string;
  direction: "Risk-on" | "Risk-off" | "Neutral";
  urgency?: "NOW" | "WATCH" | "FADING";
  window: string;
  confidence: number;
  affected: string[];
  why: string[];
  whatToDo: string;
  avoid: string;
  whatToWatch: string[];
  invalidation: string;
  regime: string;
  bias: string;
  sharpHeadline: string;
  narrative: string;
  tradableSetup: string;
  finalAction: string;
  triggerRows: { watch: string; trigger: string; invalidation: string }[];
  bullCase: string;
  bearCase: string;
  ageHours?: number;
};

export type IntelligenceEvent = RawStory & {
  eventId: string;
  lifecycle: Lifecycle;
  stateChange: StateChange;
  firstSeenAt: string;
  lastSeenAt: string;
  corroboration: number;
  sourceCount: number;
  sources: string[];
  confirmation: number;
  impact: number;
  priority: number;
  ageHours: number;
  related: { title: string; source: string; publishedAt: string; link: string }[];
};

export type EventState = {
  eventId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  lifecycle: Lifecycle;
  impact: number;
  corroboration: number;
  sourceCount: number;
};

export type IntelligenceSnapshot = {
  ok: true;
  generatedAt: string;
  engine: "REVEDGE Event Intelligence v1";
  methodology: "impact × freshness × urgency + corroboration";
  activeCount: number;
  watchCount: number;
  escalations: number;
  events: IntelligenceEvent[];
  stories: IntelligenceEvent[];
};

const STOPWORDS = new Set([
  "the", "a", "an", "to", "of", "for", "and", "in", "on", "with", "as", "is", "are", "by", "from", "at", "into", "after", "before", "over", "under", "this", "that", "its", "their", "will", "can", "may", "new", "says", "said", "amid", "while", "crypto", "market",
]);

function tokens(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function tokenSet(text: string) {
  return new Set(tokens(text));
}

function similarity(a: RawStory, b: RawStory) {
  const aa = tokenSet(a.title);
  const bb = tokenSet(b.title);
  if (!aa.size || !bb.size) return 0;

  let common = 0;
  aa.forEach((token) => {
    if (bb.has(token)) common += 1;
  });

  const union = new Set([...aa, ...bb]).size;
  const jaccard = common / Math.max(1, union);
  const containment = common / Math.max(1, Math.min(aa.size, bb.size));
  const sameAsset = a.tag === b.tag || a.affected.some((asset) => b.affected.includes(asset));

  return jaccard * 0.55 + containment * 0.35 + (sameAsset ? 0.1 : 0);
}

function eventKey(story: RawStory) {
  const meaningful = tokens(story.title).slice(0, 8);
  return `${story.tag}:${meaningful.join("-") || "event"}`.slice(0, 120);
}

function ageHours(story: RawStory) {
  return Math.max(0, (Date.now() - new Date(story.publishedAt).getTime()) / 3600000);
}

function freshnessScore(hours: number) {
  if (hours <= 1) return 3;
  if (hours <= 3) return 2.2;
  if (hours <= 6) return 1.2;
  if (hours <= 12) return 0.2;
  if (hours <= 24) return -0.8;
  return -2;
}

function lifecycleFor(impact: number, hours: number, isNew: boolean): Lifecycle {
  if (isNew && hours <= 1 && impact >= 7.5) return "NEW · NOW";
  if (isNew && hours <= 6 && impact >= 7) return "NEW · WATCH";
  if (hours <= 3 && impact >= 7.5) return "ACTIVE · NOW";
  if (hours <= 12 && impact >= 7) return "ACTIVE · WATCH";
  if (hours <= 24 && impact >= 6.5) return "FADING · WATCH";
  return "FADING";
}

function priorityFor(impact: number, hours: number, sourceCount: number, confirmation: number) {
  const freshness = freshnessScore(hours);
  const corroborationBonus = Math.min(2, Math.max(0, sourceCount - 1) * 0.55);
  const confirmationBonus = Math.min(1.5, confirmation * 0.15);
  return Math.max(1, Math.min(20, impact + freshness + corroborationBonus + confirmationBonus));
}

function confirmationFor(sourceCount: number, corroboration: number) {
  return Math.min(100, Math.round(58 + Math.min(4, sourceCount) * 7 + Math.min(4, corroboration - 1) * 3));
}

function stateChangeFor(previous: EventState | undefined, current: IntelligenceEvent): StateChange {
  if (!previous) return "NEW";
  const impactDelta = current.impact - previous.impact;
  const corroborationDelta = current.corroboration - previous.corroboration;
  const wasFading = previous.lifecycle === "FADING" || previous.lifecycle === "FADING · WATCH";
  const nowActive = current.lifecycle === "ACTIVE · NOW" || current.lifecycle === "ACTIVE · WATCH" || current.lifecycle === "NEW · NOW";

  if (impactDelta >= 0.6 || corroborationDelta >= 1 || (wasFading && nowActive)) return "ESCALATED";
  if (current.corroboration >= 2 && previous.corroboration < 2) return "CONFIRMED";
  if (current.lifecycle === "FADING" || current.lifecycle === "FADING · WATCH") return impactDelta <= -0.5 ? "DOWNGRADED" : "FADING";
  return "UNCHANGED";
}

function mergeGroup(group: RawStory[]) {
  const sorted = [...group].sort((a, b) => {
    const priorityA = Number(a.priority ?? a.impact ?? 0);
    const priorityB = Number(b.priority ?? b.impact ?? 0);
    return priorityB - priorityA || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
  const primary = sorted[0];
  const sources = [...new Set(group.map((item) => item.source))];
  const hours = ageHours(primary);
  const maxImpact = Math.max(...group.map((item) => Number(item.impact ?? 0)));
  const corroboration = group.length;
  const confirmation = confirmationFor(sources.length, corroboration);
  const impact = Math.min(10, Math.round((maxImpact + Math.min(1, (sources.length - 1) * 0.35)) * 10) / 10);
  return { primary, sources, hours, corroboration, confirmation, impact, related: sorted.slice(0, 6) };
}

export function buildIntelligence(rawStories: RawStory[], previous: EventState[] = []): { snapshot: IntelligenceSnapshot; state: EventState[] } {
  const groups: RawStory[][] = [];

  for (const story of rawStories) {
    const match = groups.find((group) => similarity(group[0], story) >= 0.52);
    if (match) match.push(story);
    else groups.push([story]);
  }

  const previousById = new Map(previous.map((item) => [item.eventId, item]));
  const now = new Date().toISOString();

  const events = groups.map((group) => {
    const merged = mergeGroup(group);
    const id = eventKey(merged.primary);
    const previousEvent = previousById.get(id);
    const firstSeenAt = previousEvent?.firstSeenAt ?? now;
    const lifecycle = lifecycleFor(merged.impact, merged.hours, !previousEvent);
    const priority = priorityFor(merged.impact, merged.hours, merged.sources.length, merged.confirmation);

    const event: IntelligenceEvent = {
      ...merged.primary,
      eventId: id,
      lifecycle,
      stateChange: "UNCHANGED",
      firstSeenAt,
      lastSeenAt: now,
      corroboration: merged.corroboration,
      sourceCount: merged.sources.length,
      sources: merged.sources,
      confirmation: merged.confirmation,
      impact: merged.impact,
      priority,
      ageHours: Math.round(merged.hours * 10) / 10,
      related: merged.related.map((item) => ({
        title: item.title,
        source: item.source,
        publishedAt: item.publishedAt,
        link: item.link,
      })),
    };

    event.stateChange = stateChangeFor(previousEvent, event);
    return event;
  })
    .filter((event) => event.ageHours < 36 && event.impact >= 7)
    .sort((a, b) => b.priority - a.priority || b.impact - a.impact)
    .slice(0, 12);

  const activeCount = events.filter((event) => event.lifecycle.includes("NOW")).length;
  const watchCount = events.filter((event) => event.lifecycle.includes("WATCH")).length;
  const escalations = events.filter((event) => event.stateChange === "ESCALATED" || event.stateChange === "CONFIRMED" || event.stateChange === "NEW").length;

  const state = events.map((event) => ({
    eventId: event.eventId,
    firstSeenAt: event.firstSeenAt,
    lastSeenAt: event.lastSeenAt,
    lifecycle: event.lifecycle,
    impact: event.impact,
    corroboration: event.corroboration,
    sourceCount: event.sourceCount,
  }));

  return {
    snapshot: {
      ok: true,
      generatedAt: now,
      engine: "REVEDGE Event Intelligence v1",
      methodology: "impact × freshness × urgency + corroboration",
      activeCount,
      watchCount,
      escalations,
      events,
      stories: events,
    },
    state,
  };
}
