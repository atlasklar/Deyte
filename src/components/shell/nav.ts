import { Brain, MessagesSquare, Sparkles, UserRound, Users } from "lucide-react";

export const NAV = [
  { href: "/app", label: "Coach", icon: Sparkles, exact: true },
  { href: "/app/chats", label: "Chats", icon: MessagesSquare },
  { href: "/app/people", label: "People", icon: Users },
  { href: "/app/memory", label: "Memory", icon: Brain },
  { href: "/app/account", label: "Account", icon: UserRound },
] as const;

export function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}
