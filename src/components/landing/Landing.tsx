"use client";

import { interpolate, motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { ArrowRight, Brain, Check, ClipboardCheck, Eye, ImagePlus, Lock, MessageSquareText, PauseCircle, PenLine, Plus, ShieldCheck, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BRAND, formatPrice } from "@/config/product";
import { cn } from "@/lib/util";
import { Wordmark } from "@/components/ui/Wordmark";
import { BarScene, Rose, Sparks, StageArt } from "./Scenes";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Scroll-linked value computed on the main thread. (Framer's accelerated scroll
 * timelines can desync opacity from scroll position on some browsers.)
 */
function useRange(progress: MotionValue<number>, input: number[], output: number[]) {
  const map = interpolate(input, output, { clamp: true });
  return useTransform(progress, (v: number) => map(v));
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return desktop;
}

export function Landing() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-black text-fg">
      <Nav />
      <Hero />
      <Moment />
      <Product />
      <Steps />
      <Stages />
      <Toast />
      <Features />
      <Pricing />
      <Faq />
      <Footer />
    </div>
  );
}

/* ── Shared bits ────────────────────────────────────────────── */

function Cta({ href = "/signup", children, variant = "primary", className }: { href?: string; children: React.ReactNode; variant?: "primary" | "ghost"; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-[12px] px-5 text-[15px] font-medium transition-colors duration-150 active:scale-[0.98]",
        variant === "primary" ? "bg-white text-black hover:bg-white/90" : "border border-white/15 bg-white/[0.04] text-fg backdrop-blur-md hover:bg-white/[0.08]",
        className,
      )}
    >
      {children}
    </Link>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("mono inline-flex items-center gap-2 text-[11.5px] uppercase tracking-[0.14em] text-fg-subtle", className)}>
      <span className="h-1 w-1 rounded-full bg-bronze-400" />
      {children}
    </p>
  );
}

function H2({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("text-[clamp(34px,8.5vw,64px)] font-semibold leading-[0.98] tracking-[-0.05em] text-white", className)}>{children}</h2>;
}

function InView({ children, className, delay = 0, y = 18 }: { children: React.ReactNode; className?: string; delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 0.8, ease, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Nav ────────────────────────────────────────────────────── */

function Nav() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={cn("pt-safe fixed inset-x-0 top-0 z-50 transition-colors duration-300", solid ? "border-b border-white/[0.06] bg-black/70 backdrop-blur-xl" : "border-b border-transparent")}>
      <div className="mx-auto flex h-14 max-w-[1180px] items-center justify-between px-4 md:h-16 md:px-8">
        <Link href="/" aria-label={BRAND.name}>
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-7 text-[13.5px] text-fg-muted md:flex">
          <a href="#how" className="hover:text-fg">How it works</a>
          <a href="#product" className="hover:text-fg">Product</a>
          <a href="#pricing" className="hover:text-fg">Pricing</a>
          <a href="#faq" className="hover:text-fg">FAQ</a>
        </nav>
        <div className="flex items-center gap-1.5">
          <Link href="/login" className="rounded-[10px] px-3 py-2 text-[13.5px] text-fg-muted hover:text-fg">
            Sign in
          </Link>
          <Link href="/signup" className="rounded-[10px] bg-white px-3.5 py-2 text-[13.5px] font-medium text-black hover:bg-white/90">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ── Hero: the rose, scrubbed by scroll ─────────────────────── */

function Phase({ progress, range, children, className }: { progress: MotionValue<number>; range: [number, number, number, number]; children: React.ReactNode; className?: string }) {
  const opacity = useRange(progress, range, [0, 1, 1, 0]);
  const y = useRange(progress, range, [24, 0, 0, -24]);
  return (
    <motion.div style={{ opacity, y }} className={className}>
      {children}
    </motion.div>
  );
}

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const media = useRange(scrollYProgress, [0, 0.9], [0, 1]);
  const scale = useRange(scrollYProgress, [0, 1], [1, 1.12]);
  const introOpacity = useRange(scrollYProgress, [0, 0.14, 0.22], [1, 1, 0]);
  const introY = useRange(scrollYProgress, [0, 0.22], [0, -40]);
  const glow = useRange(scrollYProgress, [0, 0.5, 1], [0.35, 0.7, 0.45]);
  const scrim = useRange(scrollYProgress, [0.16, 0.28], [0, 1]);

  return (
    <section ref={ref} className="relative h-[360vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* Warm light behind the rose */}
        <motion.div style={{ opacity: glow }} className="pointer-events-none absolute left-1/2 top-1/2 h-[90vmin] w-[90vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(190,30,45,0.32),rgba(120,20,30,0.1)_45%,transparent_70%)]" />
        <motion.div
          style={{ scale }}
          className="absolute left-1/2 top-[63%] aspect-square w-[min(112vw,88svh)] -translate-x-1/2 -translate-y-1/2 md:top-[56%] md:w-[min(80vw,92svh)]"
        >
          <Rose progress={media} className="h-full w-full" />
        </motion.div>

        {/* Keeps the story text readable over the open rose on phones */}
        <motion.div style={{ opacity: scrim }} className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black via-black/75 to-transparent md:hidden" />

        {/* Intro */}
        <motion.div style={{ opacity: introOpacity, y: introY }} className="absolute inset-x-0 top-0 flex h-full flex-col px-5 pb-[calc(28px+var(--safe-bottom))] pt-[calc(92px+var(--safe-top))] md:items-center md:px-8 md:pt-32 md:text-center">
          <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[12px] text-fg-muted backdrop-blur-md">
            <Sparkles size={12} className="text-bronze-300" /> Private AI dating &amp; relationship coach
          </p>
          <h1 className="max-w-[900px] text-[clamp(50px,14vw,120px)] font-semibold leading-[0.9] tracking-[-0.06em] text-white">
            Know where
            <br />
            you stand.
          </h1>
          <p className="mt-5 max-w-[380px] text-[15.5px] leading-relaxed text-fg-muted md:max-w-[460px] md:text-[17px]">
            Share the conversation. Get an honest read on what&apos;s happening — and the one move worth making next.
          </p>
          <div className="mt-auto flex flex-col gap-2 sm:flex-row md:mt-10">
            <Cta>
              Start with Deyte <ArrowRight size={16} />
            </Cta>
            <Cta href="/login" variant="ghost">
              I have an account
            </Cta>
          </div>
        </motion.div>

        {/* Story beats over the bloom */}
        <Phase progress={scrollYProgress} range={[0.26, 0.34, 0.52, 0.6]} className="absolute inset-x-0 bottom-0 px-5 pb-[calc(40px+var(--safe-bottom))] md:bottom-auto md:left-[6%] md:top-1/2 md:max-w-[420px] md:-translate-y-1/2 md:px-0 md:pb-0">
          <Label>01 — The read</Label>
          <H2 className="mt-3">Every signal, read.</H2>
          <p className="mt-3 max-w-[360px] text-[15px] leading-relaxed text-fg-muted">Replies, delays, plans, silence. Deyte reads the pattern — not just the last message.</p>
        </Phase>
        <Phase progress={scrollYProgress} range={[0.62, 0.7, 0.97, 1]} className="absolute inset-x-0 bottom-0 px-5 pb-[calc(40px+var(--safe-bottom))] md:bottom-auto md:left-auto md:right-[6%] md:top-1/2 md:max-w-[420px] md:-translate-y-1/2 md:px-0 md:pb-0 md:text-right">
          <Label className="md:flex-row-reverse">02 — The move</Label>
          <H2 className="mt-3">One clear next move.</H2>
          <p className="mt-3 max-w-[360px] text-[15px] leading-relaxed text-fg-muted md:ml-auto">Not ten tactics. One recommendation, why it fits — and the words, if any are needed.</p>
        </Phase>
      </div>
    </section>
  );
}

/* ── The moment: she said maybe ─────────────────────────────── */

function Moment() {
  return (
    <section className="relative mx-auto max-w-[1180px] px-4 py-24 md:px-8 md:py-36">
      <div className="grid items-center gap-12 md:grid-cols-[1fr_0.9fr] md:gap-16">
        <div>
          <InView>
            <Label>The moment</Label>
            <H2 className="mt-4">
              She said &ldquo;maybe.&rdquo;
              <br />
              <span className="text-fg-subtle">Now what?</span>
            </H2>
          </InView>
          <InView delay={0.1}>
            <p className="mt-5 max-w-[460px] text-[16px] leading-relaxed text-fg-muted">
              Deyte looks at what she said, what she&apos;s done, and everything you&apos;ve told it before. Then it tells you plainly what&apos;s happening and what&apos;s worth doing — even when the answer is &ldquo;nothing yet.&rdquo;
            </p>
          </InView>
          <InView delay={0.2} className="mt-7 grid max-w-[460px] grid-cols-3 gap-2">
            {[
              ["Facts", "What actually happened"],
              ["Reads", "What it might mean"],
              ["Move", "What to do now"],
            ].map(([t, d]) => (
              <div key={t} className="rounded-[12px] border border-white/[0.07] bg-white/[0.02] px-3 py-3">
                <p className="text-[13.5px] font-medium text-white">{t}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-fg-subtle">{d}</p>
              </div>
            ))}
          </InView>
        </div>

        <InView className="relative mx-auto w-full max-w-[420px]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] border border-white/[0.08]">
            <BarScene />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease, delay: 0.4 }}
              className="absolute left-4 top-4 max-w-[78%] rounded-[16px] rounded-tl-[5px] bg-white/[0.12] px-3.5 py-2.5 text-[14px] text-white backdrop-blur-xl"
            >
              haha maybe! this week is chaos though
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease, delay: 1.1 }}
              className="absolute inset-x-3 bottom-3 rounded-[16px] border border-white/10 bg-black/70 p-3.5 backdrop-blur-xl"
            >
              <div className="flex items-center gap-2 text-[11.5px] text-fg-subtle">
                <Wordmark size="sm" className="scale-[0.8] origin-left" />
                <span className="ml-auto">just now</span>
              </div>
              <p className="mt-2 text-[12px] font-medium text-bronze-300">What to do next</p>
              <p className="text-[15px] font-semibold tracking-[-0.02em] text-white">Propose one specific night</p>
              <p className="mt-1 text-[13px] leading-snug text-fg-muted">A busy week isn&apos;t a no. Offer Thursday or Sunday, then let it breathe — her answer tells you more than guessing.</p>
            </motion.div>
          </div>
        </InView>
      </div>
    </section>
  );
}

/* ── Real product screenshots ───────────────────────────────── */

const SHOTS = [
  { src: "/shots/lobby.webp", title: "Ask anything", body: "One place for questions, screenshots and pasted chats." },
  { src: "/shots/review.webp", title: "Check what it read", body: "Fix any line and who sent it before anything is analysed." },
  { src: "/shots/read.webp", title: "Get the read", body: "Facts, possible explanations, one move and why." },
  { src: "/shots/person.webp", title: "It remembers her", body: "Every person has a private profile and timeline." },
];

function Phone({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={cn("relative rounded-[34px] border border-white/10 bg-[#0b0b0c] p-[7px] shadow-[0_40px_80px_-30px_rgba(0,0,0,1)]", className)}>
      <div className="relative overflow-hidden rounded-[28px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" className="block w-full" />
      </div>
    </div>
  );
}

function Product() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const desktop = useIsDesktop();
  const k = desktop ? 1 : 0;
  const offsets = [useRange(scrollYProgress, [0, 1], [60 * k, -60 * k]), useRange(scrollYProgress, [0, 1], [120 * k, -40 * k]), useRange(scrollYProgress, [0, 1], [40 * k, -80 * k]), useRange(scrollYProgress, [0, 1], [100 * k, -60 * k])];

  return (
    <section id="product" ref={ref} className="relative border-t border-white/[0.06] py-24 md:py-36">
      <div className="mx-auto max-w-[1180px] px-4 md:px-8">
        <InView className="max-w-[640px]">
          <Label>The product</Label>
          <H2 className="mt-4">Built like a tool, not a toy.</H2>
          <p className="mt-4 text-[16px] leading-relaxed text-fg-muted">Fast, private and made for your phone. These are real screens from the app.</p>
        </InView>
      </div>

      {/* Phone: swipe through. Desktop: a staggered row that drifts with scroll. */}
      <div className="no-scrollbar mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:mx-auto md:grid md:max-w-[1180px] md:snap-none md:grid-cols-4 md:gap-6 md:overflow-visible md:px-8">
        {SHOTS.map((s, i) => (
          <motion.figure key={s.src} style={{ y: offsets[i] }} className="w-[68vw] max-w-[280px] shrink-0 snap-center md:w-auto md:max-w-none">
            <Phone src={s.src} alt={s.title} />
            <figcaption className="mt-4 px-1">
              <p className="text-[14.5px] font-medium text-white">{s.title}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-fg-subtle">{s.body}</p>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}

/* ── How it works ───────────────────────────────────────────── */

const STEPS = [
  { icon: ImagePlus, title: "Share it", body: "Upload screenshots, paste the messages, or just describe what happened." },
  { icon: ClipboardCheck, title: "Check it", body: "See exactly what Deyte read. Correct any line, and who sent it." },
  { icon: PenLine, title: "Add context", body: "Past dates, plans, a disagreement — the details that change the advice." },
  { icon: Sparkles, title: "Get the move", body: "An honest read and one recommendation. A reply in your voice if one is needed." },
];

function Steps() {
  return (
    <section id="how" className="mx-auto max-w-[1180px] border-t border-white/[0.06] px-4 py-24 md:px-8 md:py-32">
      <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
        <InView>
          <Label>How it works</Label>
          <H2 className="mt-4">Four steps. Under a minute.</H2>
          <p className="mt-4 max-w-[380px] text-[16px] leading-relaxed text-fg-muted">Then come back with the next screenshot. It already knows the story.</p>
        </InView>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <InView key={s.title} delay={i * 0.08}>
              <div className="h-full rounded-[16px] border border-white/[0.07] bg-[#0d0d0e] p-5 transition-colors hover:border-white/[0.14]">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/[0.06] text-white">
                    <s.icon size={17} strokeWidth={1.75} />
                  </span>
                  <span className="mono text-[12px] text-fg-faint">0{i + 1}</span>
                </div>
                <p className="mt-6 text-[17px] font-semibold tracking-[-0.02em] text-white">{s.title}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-fg-subtle">{s.body}</p>
              </div>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Every stage ────────────────────────────────────────────── */

const STAGE_CARDS = [
  { stage: "before", tag: "Before", title: "Where to put your effort", body: "Flirting, invitations, reading intent — and knowing when interest isn't mutual." },
  { stage: "dating", tag: "Dating", title: "From good dates to something real", body: "Momentum, expectations and consistency, without guessing what she wants." },
  { stage: "together", tag: "Together", title: "Keep it strong", body: "Staying close, voicing needs, and handling disagreements like an adult." },
] as const;

function Stages() {
  return (
    <section className="border-t border-white/[0.06] py-24 md:py-32">
      <div className="mx-auto max-w-[1180px] px-4 md:px-8">
        <InView className="max-w-[640px]">
          <Label>Every stage</Label>
          <H2 className="mt-4">From the first text to years in.</H2>
        </InView>
      </div>
      <div className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-auto md:grid md:max-w-[1180px] md:grid-cols-3 md:gap-4 md:overflow-visible md:px-8">
        {STAGE_CARDS.map((c, i) => (
          <InView key={c.tag} delay={i * 0.1} className="w-[80vw] max-w-[360px] shrink-0 snap-center md:w-auto md:max-w-none">
            <div className="group relative aspect-[3/4] overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#0d0d0e]">
              <StageArt stage={c.stage} />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <span className="rounded-md bg-white/[0.12] px-2 py-1 text-[11.5px] font-medium text-white backdrop-blur-md">{c.tag}</span>
                <p className="mt-3 text-[20px] font-semibold leading-tight tracking-[-0.03em] text-white">{c.title}</p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/70">{c.body}</p>
              </div>
            </div>
          </InView>
        ))}
      </div>
    </section>
  );
}

/* ── The toast: make the move ───────────────────────────────── */

function Toast() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const media = useRange(scrollYProgress, [0, 0.85], [0, 1]);
  const textOpacity = useRange(scrollYProgress, [0.35, 0.55], [0, 1]);
  const textY = useRange(scrollYProgress, [0.35, 0.55], [30, 0]);

  return (
    <section ref={ref} className="relative h-[260vh] border-t border-white/[0.06]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-[42%] h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(230,170,70,0.16),transparent_65%)]" />
        <Sparks progress={media} className="absolute left-1/2 top-[40%] aspect-square w-[min(110vw,80svh)] -translate-x-1/2 -translate-y-1/2" />
        <motion.div style={{ opacity: textOpacity, y: textY }} className="absolute inset-x-0 bottom-0 flex flex-col items-center px-5 pb-[calc(48px+var(--safe-bottom))] text-center">
          <H2 className="text-[clamp(40px,11vw,96px)]">Then make the move.</H2>
          <p className="mt-4 max-w-[420px] text-[15.5px] leading-relaxed text-fg-muted">Better decisions, not better lines. That&apos;s the whole idea.</p>
          <Cta className="mt-7">
            Get started <ArrowRight size={16} />
          </Cta>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Features ───────────────────────────────────────────────── */

const FEATURES = [
  { icon: Users, title: "A profile for every person", body: "Stage, history, past reviews and updates — kept separate and private." },
  { icon: Eye, title: "Facts apart from guesses", body: "What happened is never mixed up with what it might mean." },
  { icon: MessageSquareText, title: "Replies in your voice", body: "Learns how you text from your edits. No scripts, no cringe." },
  { icon: Brain, title: "Memory you control", body: "Review, correct or delete anything it remembers, any time." },
  { icon: PauseCircle, title: "Pause without losing it", body: "Take a break. Your history is waiting when you're back." },
  { icon: ShieldCheck, title: "Honest by design", body: "It reads what you share. It never claims to know what she thinks." },
];

function Features() {
  return (
    <section className="mx-auto max-w-[1180px] border-t border-white/[0.06] px-4 py-24 md:px-8 md:py-32">
      <InView className="max-w-[640px]">
        <Label>Why it works</Label>
        <H2 className="mt-4">A coach that actually remembers.</H2>
      </InView>
      <div className="mt-10 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <InView key={f.title} delay={(i % 3) * 0.07}>
            <div className="h-full rounded-[16px] border border-white/[0.07] bg-[#0d0d0e] p-5">
              <f.icon size={18} strokeWidth={1.75} className="text-white" />
              <p className="mt-4 text-[15.5px] font-semibold tracking-[-0.02em] text-white">{f.title}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-fg-subtle">{f.body}</p>
            </div>
          </InView>
        ))}
      </div>
    </section>
  );
}

/* ── Pricing ────────────────────────────────────────────────── */

function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-[1180px] border-t border-white/[0.06] px-4 py-24 md:px-8 md:py-32">
      <div className="grid items-start gap-10 md:grid-cols-2 md:gap-16">
        <InView>
          <Label>Pricing</Label>
          <H2 className="mt-4">One plan. Everything in it.</H2>
          <p className="mt-4 max-w-[420px] text-[16px] leading-relaxed text-fg-muted">Pause any time and your memory waits for you. Cancel any time — you&apos;ll see exactly when your memory resets before you confirm.</p>
        </InView>
        <InView delay={0.1}>
          <div className="rounded-[20px] border border-white/[0.1] bg-[#0d0d0e] p-6">
            <div className="flex items-baseline justify-between">
              <p className="text-[15px] font-medium text-white">Deyte</p>
              <p className="text-[12.5px] text-fg-subtle">Monthly</p>
            </div>
            <p className="mt-4 text-[52px] font-semibold leading-none tracking-[-0.05em] text-white">
              {formatPrice()}
              <span className="ml-1.5 text-[15px] font-normal tracking-normal text-fg-subtle">/ month</span>
            </p>
            <ul className="mt-6 flex flex-col gap-2.5 text-[14.5px] text-fg-muted">
              {[
                "Coaching for any situation, any time",
                "Screenshots, pasted chats and follow-ups",
                "Private profiles for everyone you're seeing",
                "Personal memory that grows with you",
                "Replies written in your voice",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <Check size={16} className="mt-0.5 shrink-0 text-white" />
                  {t}
                </li>
              ))}
            </ul>
            <Cta className="mt-7 w-full">Get started</Cta>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-fg-subtle">
              <Lock size={12} /> Private to you. Delete everything with one tap.
            </p>
          </div>
        </InView>
      </div>
    </section>
  );
}

/* ── FAQ ────────────────────────────────────────────────────── */

const FAQ = [
  ["Is this a pickup-line generator?", "No. Deyte helps you judge what's happening and decide what's worth doing. Sometimes that's a message; sometimes it's sending nothing."],
  ["Does it know what she's thinking?", "No one does. Deyte separates what was actually said and done from possible explanations, and tells you how sure it is."],
  ["Who sees my conversations?", "Only you. Your memory is private to your account and never used to coach anyone else. You can delete any of it, any time."],
  ["What if I have a girlfriend?", "That's a big part of it — staying connected, communicating needs and handling disagreements well."],
  ["What happens if I pause or cancel?", "Pausing stops billing and keeps your memory. Canceling stops renewal; when your paid access ends, your memory resets. You'll see the date before confirming."],
];

function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-[860px] border-t border-white/[0.06] px-4 py-24 md:px-8 md:py-32">
      <InView>
        <Label>FAQ</Label>
        <H2 className="mt-4">Fair questions.</H2>
      </InView>
      <div className="mt-8 divide-y divide-white/[0.07] border-y border-white/[0.07]">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15.5px] font-medium text-white">
              {q}
              <Plus size={17} className="shrink-0 text-fg-subtle transition-transform duration-200 group-open:rotate-45" />
            </summary>
            <p className="mt-2.5 pr-8 text-[14.5px] leading-relaxed text-fg-muted">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ── Footer ─────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] px-4 pb-[calc(32px+var(--safe-bottom))] pt-16 md:px-8">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div>
          <Wordmark size="lg" />
          <p className="mt-3 max-w-[320px] text-[13.5px] leading-relaxed text-fg-subtle">Better judgment in dating and relationships, from the conversations you&apos;re actually having.</p>
        </div>
        <div className="flex flex-col gap-3 text-[13px] text-fg-subtle md:items-end">
          <Cta className="w-full md:w-auto">
            Start with Deyte <ArrowRight size={16} />
          </Cta>
          <p className="flex gap-4">
            <Link href="/privacy" className="hover:text-fg">Privacy</Link>
            <Link href="/terms" className="hover:text-fg">Terms</Link>
          </p>
          <p>© {new Date().getFullYear()} {BRAND.name} · No guarantees about anyone&apos;s feelings.</p>
        </div>
      </div>
    </footer>
  );
}
