"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { SourceDocLink } from "@/components/source-doc-link";

interface ApprovalCardProps {
  title: string;
  id: string;
  status: string;
  sourceDocUrl?: string | null;
  details: Array<{ label: string; value: React.ReactNode }>;
  onApprove?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
  loading?: boolean;
}

export function ApprovalCard({
  title,
  id,
  status,
  sourceDocUrl,
  details,
  onApprove,
  onReject,
  onEdit,
  loading,
}: ApprovalCardProps) {
  const isPending = status === "Pending" || status === "Draft";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <StatusBadge status={status} />
        </div>
        <p className="text-xs text-gray-400">{id}</p>
      </CardHeader>

      <CardContent>
        <dl className="grid grid-cols-2 gap-3">
          {details.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-gray-500">{label}</dt>
              <dd className="text-sm font-medium text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>

        {sourceDocUrl && (
          <div className="mt-4">
            <SourceDocLink url={sourceDocUrl} label="View Source Document" />
          </div>
        )}
      </CardContent>

      {isPending && (
        <CardFooter className="gap-2">
          {onApprove && (
            <Button
              onClick={onApprove}
              disabled={loading}
              loading={loading}
              variant="default"
              size="sm"
            >
              Approve
            </Button>
          )}
          {onReject && (
            <Button
              onClick={onReject}
              disabled={loading}
              variant="destructive"
              size="sm"
            >
              Reject
            </Button>
          )}
          {onEdit && (
            <Button
              onClick={onEdit}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              Edit
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
