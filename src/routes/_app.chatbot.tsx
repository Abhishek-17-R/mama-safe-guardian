import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Send, Loader2, Heart, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { chatWithAI } from "@/lib/predict.functions";
import { loadPreferences } from "@/lib/preferences";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/chatbot")({
  head: () => ({ meta: [{ title: "Chat — MatriCare" }] }),
  component: ChatbotPage,
});

interface Msg { role: "user" | "assistant"; content: string }

const STARTERS = [
  "What foods should I avoid in the first trimester?",
  "Is my BP of 130/85 normal at 28 weeks?",
  "When should I worry about reduced fetal movement?",
  "Safe exercises for the third trimester?",
];

function ChatbotPage() {
  const chatFn = useServerFn(chatWithAI);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const { reply } = await chatFn({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to get reply");
      setMessages(next); // keep user msg
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-73px)] max-w-3xl flex-col px-4 sm:px-6">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6">
        {messages.length === 0 && (
          <div className="mx-auto max-w-xl py-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-soft)]">
              <Heart className="h-6 w-6 text-primary-foreground" fill="currentColor" />
            </div>
            <h1 className="font-display text-3xl font-semibold text-foreground">How can I help today?</h1>
            <p className="mt-2 text-muted-foreground">
              Ask anything about pregnancy, vitals, nutrition, or symptoms.
            </p>
            <div className="mt-8 grid gap-2 sm:grid-cols-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-2xl border border-border/60 bg-card p-4 text-left text-sm text-foreground transition-all hover:border-primary/40 hover:shadow-[var(--shadow-soft)]"
                >
                  <Sparkles className="mb-2 h-4 w-4 text-primary" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((m, i) => (
            <Bubble key={i} msg={m} />
          ))}
          {sending && (
            <div className="flex items-center gap-2 px-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Thinking...
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="sticky bottom-0 border-t border-border/60 bg-background/80 py-4 backdrop-blur">
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-soft)]"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask about pregnancy, symptoms, vitals..."
            rows={1}
            className="min-h-[44px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            disabled={sending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || !input.trim()}
            className="bg-[image:var(--gradient-primary)] shadow-[var(--shadow-soft)]"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          AI responses are informational, not medical advice.
        </p>
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-soft)]"
            : "border border-border/60 bg-card text-foreground"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:font-display prose-strong:text-foreground">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
