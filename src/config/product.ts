/**
 * Product constants. Everything a non-developer may want to change lives here.
 * The real AI, billing and storage are placeholders during the UI phase.
 */

export const BRAND = {
  name: "Deyte",
  tagline: "Know where you stand.",
  description:
    "Deyte is a private AI dating and relationship coach. Share the conversation, add the context, get a clear read and the next move.",
};

export const PRICE_MIN = 29.99;
export const PRICE_MAX = 39.99;
const DEFAULT_PRICE = 34.99;

function resolvePrice(): number {
  const raw = Number(process.env.NEXT_PUBLIC_PRICE_MONTHLY);
  const value = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_PRICE;
  return Math.min(PRICE_MAX, Math.max(PRICE_MIN, value));
}

/** Monthly price, configurable through NEXT_PUBLIC_PRICE_MONTHLY and clamped to 29.99–39.99. */
export const PRICE_MONTHLY = resolvePrice();

export function formatPrice(value: number = PRICE_MONTHLY) {
  return `$${value.toFixed(2)}`;
}

/** Upload bounds, enforced quietly in the composer before anything is sent. */
export const LIMITS = {
  screenshotsPerReview: 8,
  screenshotMaxMB: 10,
  messageChars: 4000,
  pastedLines: 80,
};

/** Pause options offered in the subscription flow, in months. */
export const PAUSE_OPTIONS = [1, 2, 3] as const;
