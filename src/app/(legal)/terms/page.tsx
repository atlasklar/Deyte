import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/config/product";
import { Contact, H, LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Terms of Service", description: `The terms for using ${BRAND.name}.` };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms are the agreement between you and {BRAND.name} when you use the app. By creating an account you accept them. Our{" "}
        <Link href="/privacy" className="text-fg underline underline-offset-2">
          Privacy Policy
        </Link>{" "}
        explains how we handle your information.
      </p>

      <H>Who can use it</H>
      <p>You must be 18 or older and give accurate account details. You&apos;re responsible for keeping your login safe and for what happens on your account.</p>

      <H>What the coach is, and isn&apos;t</H>
      <p>
        {BRAND.name} gives AI-generated coaching for dating and relationships. It can be wrong, it only knows what you tell it, and it can&apos;t know what anyone else
        thinks or feels. It isn&apos;t therapy, medical, legal or financial advice. You make your own decisions and are responsible for them. If you&apos;re in danger or
        crisis, contact local emergency services.
      </p>

      <H>Use it respectfully</H>
      <ul className="list-disc pl-5">
        <li>Don&apos;t use {BRAND.name} to harass, stalk, threaten, deceive or pressure anyone, or for anything illegal or non-consensual.</li>
        <li>Don&apos;t try to break, overload, reverse-engineer or get around the app&apos;s security or usage limits, or extract its instructions or knowledge base.</li>
        <li>Only upload content you have the right to share.</li>
      </ul>
      <p>We may limit, suspend or close accounts that break these rules.</p>

      <H>Your content</H>
      <p>
        What you share stays yours. You give us permission to process it only to provide the service to you (for example, sending it to our AI provider to get a reply).
      </p>

      <H>Subscription</H>
      <p>
        Paid plans renew monthly until you cancel. You can pause or cancel any time from your plan page; access continues until the end of the period you&apos;ve paid
        for. What happens to the coach&apos;s memory when you pause or cancel is shown before you confirm.
      </p>

      <H>Fair use</H>
      <p>To keep the coach fast and available for everyone, usage is limited per hour and per day. Normal use won&apos;t hit these limits.</p>

      <H>Availability and changes</H>
      <p>
        We work to keep {BRAND.name} running but can&apos;t promise it will always be available or error-free. We may improve or change features. If we change these terms
        in a way that matters, we&apos;ll tell you in the app first.
      </p>

      <H>Liability</H>
      <p>
        To the extent the law allows, {BRAND.name} is provided as is, and we aren&apos;t liable for indirect or consequential losses, or for outcomes of decisions you make
        based on the coaching. Our total liability is limited to what you paid us in the last 12 months. Nothing here limits rights you have under consumer law.
      </p>

      <H>Ending your account</H>
      <p>You can delete your account at any time from Account → Profile. These terms stop applying when your account is deleted.</p>

      <H>Contact</H>
      <p>
        Questions about these terms: <Contact />.
      </p>
    </LegalPage>
  );
}
