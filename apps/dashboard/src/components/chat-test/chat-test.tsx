'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatTestProps {
  agentId: string;
  token: string;
  orgId: string;
}

export function ChatTest({ agentId, token, orgId }: ChatTestProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await api<{ content: string }>(`/agents/${agentId}/chat`, {
        method: 'POST',
        token,
        orgId,
        body: JSON.stringify({
          message: userMessage,
          history: newMessages.slice(-20),
        }),
      });
      setMessages([...newMessages, { role: 'assistant', content: response.content }]);
    } catch (err: any) {
      setMessages([...newMessages, { role: 'assistant', content: `Erro: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[500px] border border-dark-700/50 rounded-lg overflow-hidden bg-dark-800/50">
      <div className="px-4 py-3 bg-dark-900/40 border-b border-dark-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧪</span>
          <span className="text-sm font-medium text-dark-200">Testar Agente</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-xs text-dark-400 hover:text-dark-200"
          >
            Limpar conversa
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-dark-500 text-sm py-12">
            <p>Envie uma mensagem para testar o agente.</p>
            <p className="mt-1">Simule uma conversa como se fosse um paciente.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-brand-500 text-white'
                  : 'bg-dark-800 text-dark-100'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-dark-800 px-3 py-2 rounded-lg text-sm text-dark-400">
              Digitando...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-3 border-t border-dark-700/50 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite uma mensagem..."
          className="flex-1 px-3 py-2 border border-dark-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !input.trim()} size="sm">
          Enviar
        </Button>
      </form>
    </div>
  );
}
