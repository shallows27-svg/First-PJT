"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type LeadState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

const leadSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요.").max(100),
  email: z.email("올바른 이메일을 입력해주세요.").max(254),
});

export async function submitLead(
  _prev: LeadState,
  formData: FormData,
): Promise<LeadState> {
  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "입력을 확인해주세요.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .insert({ name: parsed.data.name, email: parsed.data.email });

  if (error) {
    console.error("[submitLead] insert failed", error);
    return {
      ok: false,
      error: "제출에 실패했어요. 잠시 후 다시 시도해주세요.",
    };
  }

  return { ok: true };
}
