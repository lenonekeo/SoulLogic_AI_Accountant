"use client";

import * as React from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  intent?: string;
  requiresConfirmation?: boolean;
  pendingConfirm?: { text: string };
}

export default function ChatPage() {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi! I'm your AI accountant. You can ask me to create clients, vendors, invoices, run reports, and more. Try: \"Create a client called Acme Corp\" or \"Show me the P&L report\".",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sessionId] = React.useState(() => Math.random().toString(36).slice(2));
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, userId: "web", platform: "web", sessionId }),
      });
      const data = await res.json();
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: data.data?.message ?? data.message ?? "Done.",
        intent: data.data?.intent,
        requiresConfirmation: data.data?.requiresConfirmation,
      };
      setMessages((m) => [...m, assistantMsg]);
    } catch {
      setMessages((m) => [
        ...m,
        { id: (Date.now() + 1).toString(), role: "assistant", text: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <PageWrapper title="AI Chat" description="Natural language commands for your accounts">
      <div className="mx-auto flex h-[calc(100vh-10rem)] max-w-3xl flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 text-gray-800 shadow-sm"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                {msg.intent && (
                  <p className={`mt-1 text-xs ${msg.role === "user" ? "text-blue-200" : "text-gray-400"}`}>
                    Intent: {msg.intent}
                  </p>
                )}
                {msg.requiresConfirmation && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => send("yes confirm")}
                      className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => send("cancel")}
                      className="rounded-md bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 bg-gray-50 pt-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Create a client called Acme Corp with Net 30 terms"
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              Send
            </Button>
          </form>
          <p className="mt-2 text-xs text-gray-400">
            Try: "Create client Acme Corp" · "New invoice for Acme $500" · "Show P&L report"
          </p>
        </div>
      </div>
    </PageWrapper>
  );
}
