'use client';

import { useEffect, useRef, useState } from 'react';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface Props {
  productId: string;
  productName: string;
}

const FALLBACK_ERROR = "L'expert technique est momentanément indisponible, veuillez utiliser le formulaire de contact.";

export default function ProductExpertChat({ productId, productName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/chat/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          message: trimmed,
          history: messages,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || FALLBACK_ERROR);
      }

      setMessages([...nextMessages, { role: 'model', content: data.reply }]);
    } catch {
      setError(FALLBACK_ERROR);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-black/8 bg-[#f5f5f7] overflow-hidden">
      <div className="px-5 py-4 border-b border-black/8">
        <h2 className="text-[15px] font-bold text-[#1d1d1f]">Expert Produit</h2>
        <p className="text-[13px] text-[#6e6e73]">Une question technique sur le {productName} ? Demandez à notre assistant.</p>
      </div>

      <div ref={scrollRef} className="flex flex-col gap-3 px-5 py-4 max-h-80 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-[13px] text-[#86868b] italic">
            Ex. « Quelle est la puissance de cet équipement ? », « Est-il compatible avec... ? »
          </p>
        )}
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-snug whitespace-pre-wrap ${
              m.role === 'user'
                ? 'self-end bg-[#0071e3] text-white'
                : 'self-start bg-white text-[#1d1d1f] border border-black/6'
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="self-start rounded-2xl px-4 py-2.5 text-[14px] bg-white text-[#86868b] border border-black/6 italic">
            L&apos;expert rédige...
          </div>
        )}
      </div>

      {error && (
        <div className="mx-5 mb-3 rounded-xl bg-[#fdecea] px-4 py-2.5 text-[13px] text-[#b3261e]">
          {error}
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2 px-5 py-4 border-t border-black/8">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={1000}
          placeholder="Posez votre question..."
          disabled={loading}
          className="flex-1 rounded-full border border-black/10 bg-white px-4 py-2.5 text-[14px] outline-none focus:border-[#0071e3] disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-full bg-[#1d1d1f] px-5 py-2.5 text-[14px] font-semibold text-white disabled:opacity-40"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
