import type { AppealStatus } from "@zerde/types";

/** Референсная «сегодня» для расчёта просрочки открытых исторических заявок. */
export const AS_OF = new Date("2026-09-09T00:00:00+05:00");

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function computeOverdue(
  deadlineAt: Date | null,
  closedAt: Date | null,
  status: AppealStatus,
): boolean {
  if (!deadlineAt) return false;
  if (closedAt) return closedAt.getTime() > deadlineAt.getTime();
  if (status === "done" || status === "cancelled") return false;
  return AS_OF.getTime() > deadlineAt.getTime();
}
