import type { Metadata } from "next";
import { ChatPanel } from "@/components/manny/chat-panel";
import { PageHeader } from "@/components/ui";
import { listMessages } from "@/lib/manny/chat";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Hablar con Manny" };

export default async function ChatPage() {
  const s = await requireSession();
  const initial = listMessages(s.workspaceId).map((m) => ({ id: m.id, role: m.role, content: m.content }));
  return (
    <>
      <PageHeader title="Hablar con Manny" sub="Tu mánager conoce tu perfil, tus cifras, tus guiones y el radar. Pídele qué grabar, un gancho o una opinión." />
      <ChatPanel initial={initial} />
    </>
  );
}
