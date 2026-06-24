"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FeedbackState } from "@/components/repo-radar/ui";

export type FeedbackActionSuccess<T> = string | ((result: T) => FeedbackState);

export type FeedbackActionRunner = <T>(
  action: () => Promise<T>,
  success: FeedbackActionSuccess<T>,
  pending?: string,
  onSettled?: () => void
) => void;

export function useFeedbackAction() {
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isPending, startTransition] = useTransition();

  const runAction = useCallback<FeedbackActionRunner>(
    (action, success, pending = "Operacja w toku...", onSettled) => {
      setFeedback({ tone: "info", message: pending });
      startTransition(async () => {
        try {
          const result = await action();
          setFeedback(typeof success === "function" ? success(result) : { tone: "success", message: success });
          router.refresh();
        } catch (error) {
          setFeedback({ tone: "error", message: error instanceof Error ? error.message : "Operacja nie powiodla sie." });
        } finally {
          onSettled?.();
        }
      });
    },
    [router]
  );

  return {
    feedback,
    isPending,
    runAction,
    setFeedback,
    startTransition
  };
}
