export type MaishaPaymentOutcome = "success" | "pending" | "failed";

/**
 * MaishaPay callback classification (case-insensitive).
 * Success: Accepted | Approved | Success plus numeric success codes.
 * Pending: pending | processing | initiated
 * Else: failed
 */
export function classifyMaishaDescription(description: string | null | undefined): MaishaPaymentOutcome {
  const d = (description ?? "").trim().toLowerCase();
  if (
    d === "accepted" ||
    d === "approved" ||
    d === "success" ||
    d === "successful" ||
    d === "succeeded" ||
    d === "200" ||
    d === "202"
  ) {
    return "success";
  }
  if (d === "pending" || d === "processing" || d === "initiated") return "pending";
  return "failed";
}
