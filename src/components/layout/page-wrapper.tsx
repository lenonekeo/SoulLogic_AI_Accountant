import { cn } from "@/lib/utils/cn";

interface PageWrapperProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageWrapper({ title, description, action, children, className }: PageWrapperProps) {
  return (
    <div className={cn("flex flex-col gap-6 p-6", className)}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}
