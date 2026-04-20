export type MaishaPaymentOutcome = "success" | "pending" | "failed";

/**
 * MaishaPay callback classification (case-insensitive).
 * Success: Accepted | APPROVED
 * Pending: pending | PENDING
 * Else: failed
 */
export function classifyMaishaDescription(description: string | null | undefined): MaishaPaymentOutcome {
  const d = (description ?? "").trim().toLowerCase();
  if (d === "accepted" || d === "approved") return "success";
  if (d === "pending") return "pending";
  return "failed";
}
