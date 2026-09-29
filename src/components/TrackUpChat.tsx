import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageCircle, Send, Trash2, X } from "lucide-react";

const CHAT_ENDPOINT =
  "https://xahydzcmpikbioeyvwst.supabase.co/functions/v1/trackup-chat";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  dashboardKey: string;
  selectedDate: string;
};

const WELCOME =
  "Sou o assistente do TrackUp. Posso analisar as vendas, o funil, os criativos e comparar a data selecionada com o dia anterior.";

export function TrackUpChat({ dashboardKey, selectedDate }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: WELCOME },
  ]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: `Data ativa: ${selectedDate.split("-").reverse().join("/")}. ${WELCOME}`,
      },
    ]);
  }, [selectedDate]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages, sending, open]);

  function clearChat() {
    setMessages([{ role: "assistant", content: WELCOME }]);
  }

  async function sendMessage() {
    const content = input.trim();
    if (!content || sending) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content },
    ];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const response = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-dashboard-key": dashboardKey,
        },
        body: JSON.stringify({
          date: selectedDate,
          messages: nextMessages.slice(-12),
        }),
      });

      const body = await response.json();

      if (!response.ok || !body?.ok) {
        const message =
          body?.error === "openai_not_configured"
            ? "O chat já está instalado, mas falta configurar a chave OPENAI_API_KEY no Supabase."
            : body?.detail ||
              "Não consegui responder agora. Tente novamente em alguns segundos.";
        setMessages((current) => [
          ...current,
          { role: "assistant", content: message },
        ]);
        return;
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: String(body.answer) },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Não consegui conectar ao assistente agora. O restante do TrackUp continua funcionando normalmente.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex h-14 items-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white shadow-2xl shadow-slate-950/25 transition hover:bg-slate-800"
        aria-label="Abrir assistente do TrackUp"
      >
        <MessageCircle className="h-5 w-5 text-emerald-400" />
        <span className="hidden sm:inline">GPT TrackUp</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-[2px] sm:flex sm:items-end sm:justify-end sm:p-5">
          <section className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[min(760px,calc(100vh-40px))] sm:w-[440px] sm:rounded-3xl sm:border sm:border-slate-200">
            <header className="flex items-center justify-between border-b border-slate-200 bg-slate-950 px-4 py-3.5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400 text-slate-950">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold">GPT TrackUp</h2>
                  <p className="text-[11px] text-slate-400">
                    Leitura do painel · {selectedDate.split("-").reverse().join("/")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={clearChat}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                  aria-label="Limpar conversa"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                  aria-label="Fechar chat"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-5"
            >
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                      message.role === "user"
                        ? "rounded-br-md bg-slate-950 text-white"
                        : "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    Analisando o TrackUp...
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-white p-3">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {[
                  "Como está o funil hoje?",
                  "Compare com ontem",
                  "Qual criativo está melhor?",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-slate-400">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder="Pergunte sobre vendas, funil, PIX, criativos..."
                  className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={sending || !input.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Enviar mensagem"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-slate-400">
                Somente leitura. Não altera campanhas nem pagamentos.
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
