import "server-only";
import { supabaseService } from "@/lib/supabase/server";

/** Append-only record of admin changes (who, what, when). Never blocks the action itself. */
export async function audit(actor: { id: string; email?: string | null }, action: string, target: string, detail?: Record<string, unknown>) {
  await supabaseService()
    ?.from("admin_audit")
    .insert({ actor: actor.id, actor_email: actor.email ?? null, action, target, detail: detail ?? null })
    .then(() => {}, () => {});
}
