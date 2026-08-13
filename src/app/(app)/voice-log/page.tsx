"use client";

import * as React from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/date";

interface VoiceLogEntry {
  id: string;
  timestamp: string;
  transcript: string;
  intent: string;
  confirmed: boolean;
  result?: string;
}

export default function VoiceLogPage() {
  const [entries, setEntries] = React.useState<VoiceLogEntry[]>([]);

  // Voice log is ephemeral — stored in session/localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("voice_log");
      if (stored) setEntries(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const clear = () => {
    localStorage.removeItem("voice_log");
    setEntries([]);
  };

  return (
    <PageWrapper
      title="Voice Log"
      description="History of voice command transcriptions"
      action={
        entries.length > 0 ? (
          <button onClick={clear} className="text-sm text-red-600 hover:underline">
            Clear Log
          </button>
        ) : undefined
      }
    >
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <svg className="mb-4 h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <p className="text-sm">No voice commands recorded yet.</p>
          <p className="mt-1 text-xs">Use the AI Chat voice feature to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">&ldquo;{entry.transcript}&rdquo;</p>
                    {entry.result && (
                      <p className="mt-1 text-xs text-gray-500">Result: {entry.result}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                      entry.confirmed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {entry.confirmed ? "Confirmed" : "Pending"}
                    </span>
                    <p className="mt-1 text-xs text-gray-400">{formatDate(entry.timestamp)}</p>
                    <p className="text-xs text-gray-400">{entry.intent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
