import type { Metadata } from "next";
import { BRAND } from "@/config/product";
import { Contact, H, LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy", description: `How ${BRAND.name} handles your information.` };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        {BRAND.name} is a private AI dating and relationship coach. What you share with it is personal, so we keep this simple: we collect what the coach needs to help you,
        we protect it, we never sell it, and you can take it or delete it at any time.
      </p>

      <H>What we collect</H>
      <ul className="list-disc pl-5">
        <li>Account details: your name, email, profile photo if you add one, and how you sign in (email, Google or Apple).</li>
        <li>What you tell the coach: your messages, the conversations you paste, and screenshots you upload. Screenshots are read to pull out the messages; we keep only small previews in your chat.</li>
        <li>What the coach remembers: your setup answers, saved memory, and the profiles you create for people you&apos;re dating.</li>
        <li>Basic usage counts (how many messages you send) so we can enforce fair-use limits, and standard technical logs needed to run and secure the service.</li>
      </ul>

      <H>How we use it</H>
      <p>
        Only to run the coach for you: to answer your questions, remember context between chats, keep your account secure and prevent abuse. We don&apos;t sell your
        information, we don&apos;t show ads, and we don&apos;t use your conversations to coach anyone else.
      </p>

      <H>Who processes it for us</H>
      <ul className="list-disc pl-5">
        <li>Supabase: account sign-in, database and photo storage (United States).</li>
        <li>Vercel: hosting the app.</li>
        <li>Anthropic: the AI that writes the coach&apos;s replies and reads screenshots. Under its commercial terms, what we send isn&apos;t used to train its models, and it&apos;s kept only for a limited time for safety and abuse checks.</li>
        <li>Google or Apple, only if you choose to sign in with them.</li>
      </ul>
      <p>Each of them handles data under its own security and privacy commitments and only on our behalf.</p>

      <H>Other people in your conversations</H>
      <p>
        Screenshots and pasted chats can include messages from someone else. Share only what you&apos;re comfortable sharing. We use it solely to coach you and never
        contact or profile that person.
      </p>

      <H>How it&apos;s protected</H>
      <p>
        Everything travels encrypted (HTTPS) and is stored encrypted. Each account&apos;s data is locked to that account at the database level, so one member can never
        read another&apos;s. Coach use is rate-limited to block abuse. No method is perfect, but we treat your information as sensitive by default.
      </p>

      <H>Your choices and rights</H>
      <ul className="list-disc pl-5">
        <li>See and download everything: Account → Download my data.</li>
        <li>Correct your details: Account → Profile.</li>
        <li>Delete chats or memory at any time, or delete your whole account (Account → Profile → Delete account), which erases your data, photo and login.</li>
      </ul>
      <p>
        Depending on where you live (for example the EU, UK or California) you may have additional rights, such as objecting to processing or asking what we hold.
        Contact <Contact /> and we&apos;ll respond within 30 days.
      </p>

      <H>How long we keep it</H>
      <p>
        For as long as your account is active. When you delete your account, your data is removed. If your subscription ends, the coach&apos;s memory resets as
        described on your plan page.
      </p>

      <H>Cookies</H>
      <p>We use only the cookies needed to keep you signed in. No tracking or advertising cookies.</p>

      <H>Age</H>
      <p>{BRAND.name} is for adults 18 and older. We don&apos;t knowingly collect information from anyone younger.</p>

      <H>Changes and contact</H>
      <p>
        If we change this policy in a way that matters, we&apos;ll tell you in the app before it takes effect. Questions or requests: <Contact />.
      </p>
    </LegalPage>
  );
}
