import type React from "react";
import { cn } from "@/lib/utils";

const clampClasses: Record<1 | 2 | 3 | 4, string> = {
  1: "line-clamp-1",
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4"
};

export function TextClamp({
  children,
  lines = 2,
  className
}: {
  children: React.ReactNode;
  lines?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  return <p className={cn("text-sm leading-6 text-muted-foreground", clampClasses[lines], className)}>{children}</p>;
}
