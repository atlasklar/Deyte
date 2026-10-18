import type { Metadata } from "next";
import { Gate } from "@/components/shell/Gate";

export const metadata: Metadata = { title: "Set up your coach", robots: { index: false, follow: false } };

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <Gate>{children}</Gate>;
}
