/**
 * Local-only event log. Writes to chrome.storage.local as a ring buffer.
 *
 * Why local-only for v1: avoids needing a server, an analytics vendor, or
 * a privacy policy review before we have any users. When we ship publicly,
 * swap the `record` implementation to Plausible/PostHog without changing
 * call sites.
 *
 * Events are intentionally low-cardinality. The fields here become the
 * dimensions in the metrics table in the PRD.
 */

const KEY = "events";
const MAX_EVENTS = 1000;

export type Event =
  | { kind: "extraction_attempted"; site: string; ok: boolean; reason?: string; ts: string }
  | { kind: "verdict_shown"; site: string; recommendedSize: string; status: string; ts: string }
  | { kind: "size_overridden"; site: string; recommendedSize: string; chosenSize: string; ts: string }
  | { kind: "profile_completed"; ts: string }
  | { kind: "fallback_action"; action: "open_chart" | "manual_entry" | "report_page"; ts: string }
  // User reporting back whether a size actually fit. Override tells us they
  // disagreed with the recommendation at purchase time; this is the cleaner
  // accuracy signal — did the verdict survive contact with reality?
  | {
      kind: "fit_outcome";
      site: string;
      size: string;
      outcome: "fit" | "too_tight" | "too_loose";
      recommendedSize?: string;
      ts: string;
    };

// Distribute Omit/Partial across the discriminated union so each arm keeps its own keys.
type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
export type EventInput = DistributiveOmit<Event, "ts"> & { ts?: string };

export async function record(event: EventInput): Promise<void> {
  const ts = event.ts ?? new Date().toISOString();
  const stored = await chrome.storage.local.get(KEY);
  const events: Event[] = (stored[KEY] as Event[] | undefined) ?? [];
  events.push({ ...event, ts } as Event);
  // Ring buffer — trim oldest if over capacity.
  const trimmed = events.length > MAX_EVENTS ? events.slice(events.length - MAX_EVENTS) : events;
  await chrome.storage.local.set({ [KEY]: trimmed });
}

export async function readEvents(): Promise<Event[]> {
  const stored = await chrome.storage.local.get(KEY);
  return (stored[KEY] as Event[] | undefined) ?? [];
}

export async function clearEvents(): Promise<void> {
  await chrome.storage.local.remove(KEY);
}
