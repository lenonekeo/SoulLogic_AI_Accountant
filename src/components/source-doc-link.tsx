import { cn } from "@/lib/utils/cn";

interface SourceDocLinkProps {
  url: string | undefined | null;
  label?: string;
  className?: string;
}

export function SourceDocLink({ url, label = "View PDF", className }: SourceDocLinkProps) {
  if (!url) {
    return <span className="text-xs text-gray-400">No document</span>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline",
        className
      )}
    >
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
        />
      </svg>
      {label}
    </a>
  );
}
