"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveMessage, type MessageState } from "@/app/dashboard/actions";

// defaultValue: 서버에서 읽어온 현재 저장된 한 줄. 수정해서 다시 제출할 수 있다.
export function MessageForm({ defaultValue }: { defaultValue: string }) {
  const [state, formAction, isPending] = useActionState<MessageState, FormData>(
    saveMessage,
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      <Input
        name="content"
        defaultValue={defaultValue}
        required
        maxLength={200}
        placeholder="_____"
        aria-label="한 줄 남기기"
        className="h-11"
      />

      {state?.error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 bg-emerald-600 text-white hover:bg-emerald-500"
      >
        {isPending ? "저장 중…" : "저장"}
      </Button>
    </form>
  );
}
