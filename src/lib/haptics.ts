/*
 * Light haptic feedback for taps.
 * Android: the Vibration API. iPhone: Safari has no vibration API, but toggling
 * a native switch control (iOS 18+) plays the system "selection" tap, so we
 * flip a hidden one. Desktop: silently nothing.
 * Must be called from a tap handler (browsers only allow it during a gesture).
 */

type Kind = "selection" | "light" | "success";

const PATTERNS: Record<Kind, number | number[]> = {
  selection: 8,
  light: 12,
  success: [10, 60, 14],
};

let enabled = true;
let label: HTMLLabelElement | null = null;

export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

function iosSwitch() {
  if (!label) {
    label = document.createElement("label");
    label.setAttribute("aria-hidden", "true");
    label.style.cssText = "position:fixed;left:-100px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
  }
  // Keep the keyboard up if someone was typing.
  const active = document.activeElement as HTMLElement | null;
  label.click();
  if (active && active !== document.activeElement && /^(INPUT|TEXTAREA)$/.test(active.tagName)) active.focus({ preventScroll: true });
}

export function haptic(kind: Kind = "selection") {
  if (!enabled || typeof window === "undefined") return;
  try {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(PATTERNS[kind]);
      return;
    }
    // iPhone: one tap for a selection, two quick taps for success.
    iosSwitch();
    if (kind === "success") setTimeout(iosSwitch, 90);
  } catch {
    /* Haptics are a nicety; never let them break a tap. */
  }
}
