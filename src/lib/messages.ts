/**
 * Typed message bus. All cross-process communication goes through here.
 *
 * Why: chrome.runtime.sendMessage is stringly-typed by default. Centralizing
 * the message shapes here means TypeScript catches schema mismatches at
 * build time rather than as silent runtime no-ops.
 */

import type { ExtractionResult, FitVerdict, Profile } from "./types";

export type Message =
  /** Content script -> background, after attempting to parse a PDP. */
  | { type: "PDP_PARSED"; result: ExtractionResult; tabUrl: string }
  /** Background -> side panel, with the computed verdict (or extraction failure). */
  | { type: "VERDICT"; verdict: FitVerdict | null; failure?: ExtractionResult }
  /** Side panel -> background, asking for the latest verdict for the active tab. */
  | { type: "REQUEST_VERDICT" }
  /** Side panel -> background, after the user saves their profile. */
  | { type: "PROFILE_SAVED"; profile: Profile }
  /** Side panel -> background, after the user manually overrides the recommendation. */
  | { type: "OVERRIDE"; chosenSize: string; recommendedSize: string };

export function send(msg: Message): Promise<unknown> {
  return chrome.runtime.sendMessage(msg);
}

export function onMessage<T extends Message["type"]>(
  type: T,
  handler: (
    msg: Extract<Message, { type: T }>,
    sender: chrome.runtime.MessageSender,
  ) => void | Promise<unknown>,
): () => void {
  const listener = (
    msg: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ): boolean => {
    if (!isMessage(msg) || msg.type !== type) return false;
    const result = handler(msg as Extract<Message, { type: T }>, sender);
    if (result instanceof Promise) {
      result.then((r) => sendResponse(r));
      return true; // keep channel open for async response
    }
    return false;
  };
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}

function isMessage(x: unknown): x is Message {
  return typeof x === "object" && x !== null && "type" in x;
}
