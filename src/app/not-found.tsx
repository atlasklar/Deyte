import { ButtonLink } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="display text-[28px]">Nothing here</p>
      <p className="text-[14.5px] text-fg-subtle">The page you&apos;re looking for doesn&apos;t exist.</p>
      <ButtonLink href="/" variant="secondary">
        Go home
      </ButtonLink>
    </div>
  );
}
