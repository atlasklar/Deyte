import { PRICE_MONTHLY } from "@/config/product";
import type { AccountData, Profile } from "./types";
import { daysFromNow } from "./util";

/** A brand-new, empty account. Used on first sign-in and after a memory reset. */
export function freshAccount(id: string, profile: Pick<Profile, "name" | "email" | "lastName" | "avatarUrl">, onboarded = false): AccountData {
  return {
    version: 1,
    id,
    onboarded,
    profile: { ...profile, situation: [], goals: [], style: [], emoji: "sometimes" },
    self: [],
    people: [],
    threads: [],
    subscription: { status: "active", price: PRICE_MONTHLY, periodStart: daysFromNow(0), periodEnd: daysFromNow(30) },
  };
}
