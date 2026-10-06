"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/client-api";

export function PlanSelect({ workspaceId, plan, label }: { workspaceId: string; plan: string; label: string }) {
  const router = useRouter();
  return (
    <select
      aria-label={`Plan de ${label}`}
      className="input h-8 w-32 py-0 text-xs"
      defaultValue={plan}
      onChange={async (e) => {
        try {
          await api("/api/admin/plan", { body: { workspaceId, plan: e.target.value } });
          toast.success(`Plan de ${label}: ${e.target.value}`);
          router.refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "No se pudo cambiar");
        }
      }}
    >
      <option value="free">Free</option>
      <option value="pro">Pro</option>
      <option value="business">Business</option>
    </select>
  );
}
