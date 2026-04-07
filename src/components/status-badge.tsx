import { Badge } from "@/components/ui/badge";

type StatusValue =
  | "Draft" | "Pending" | "Approved" | "Rejected" | "Sent" | "Paid"
  | "Partial" | "Overdue" | "Voided" | "Active" | "Inactive" | "Posted"
  | "Unposted" | "Matched" | "Unmatched" | "Open" | "Closed";

const statusVariant: Record<StatusValue, "default" | "success" | "warning" | "destructive" | "outline"> = {
  Draft: "outline",
  Pending: "warning",
  Approved: "success",
  Rejected: "destructive",
  Sent: "default",
  Paid: "success",
  Partial: "warning",
  Overdue: "destructive",
  Voided: "outline",
  Active: "success",
  Inactive: "outline",
  Posted: "success",
  Unposted: "outline",
  Matched: "success",
  Unmatched: "warning",
  Open: "default",
  Closed: "outline",
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variant = statusVariant[status as StatusValue] ?? "outline";
  return <Badge variant={variant}>{status}</Badge>;
}
