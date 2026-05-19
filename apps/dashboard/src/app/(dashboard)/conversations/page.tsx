'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useApiClient } from '@/hooks/use-api-client';

interface Conversation {
  id: string;
  contact_phone: string;
  contact_push_name: string | null;
  status: string;
  last_message_at: string | null;
  created_at: string;
  agents?: { id: string; name: string } | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type: string;
  created_at: string;
  tokens_input?: number;
  tokens_output?: number;
}

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  mimetype: string;
  file_size: number;
  public_url: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Aberta',
  closed: 'Encerrada',
  archived: 'Arquivada',
  waiting: 'Aguardando',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-accent-500/10 text-accent-500',
  closed: 'bg-dark-600 text-dark-300',
  archived: 'bg-yellow-500/10 text-yellow-400',
  waiting: 'bg-brand-500/10 text-brand-400',
};

export default function ConversationsPage() {
  const api = useApiClient();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showAttachments, setShowAttachments] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, [statusFilter]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  async function loadConversations() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await api.get<Conversation[]>(`/conversations${query}`);
      setConversations(data);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }

  async function selectConversation(conv: Conversation) {
    setSelectedConversation(conv);
    setLoadingMessages(true);
    setShowAttachments(false);
    try {
      const [msgs, atts] = await Promise.all([
        api.get<Message[]>(`/conversations/${conv.id}/messages`),
        api.get<Attachment[]>(`/conversations/${conv.id}/attachments`),
      ]);
      setMessages(msgs);
      setAttachments(atts);
    } catch {
      setMessages([]);
      setAttachments([]);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedConversation || !replyContent.trim()) return;
    setSending(true);
    try {
      const msg = await api.post<Message>(`/conversations/${selectedConversation.id}/messages`, {
        content: replyContent.trim(),
      });
      setMessages((prev) => [...prev, msg]);
      setReplyContent('');
    } catch {} finally {
      setSending(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadConversations();
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 24) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (diffHours < 48) return 'Ontem';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  function formatFullDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-dark-50 tracking-tight">Conversas</h1>
        <div className="flex gap-1.5">
          {['', 'open', 'closed', 'archived'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all cursor-pointer ${
                statusFilter === s
                  ? 'bg-brand-500 text-white'
                  : 'bg-dark-800 text-dark-300 hover:text-dark-100 border border-dark-700/50'
              }`}
            >
              {s === '' ? 'Todas' : STATUS_LABELS[s] || s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Conversation List */}
        <div className="w-80 flex flex-col border border-dark-700/40 rounded-xl bg-dark-900/50 overflow-hidden">
          <form onSubmit={handleSearch} className="p-3 border-b border-dark-700/30">
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </form>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-xs text-dark-500 text-center py-8">Carregando...</p>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-dark-500 text-center py-8">Nenhuma conversa</p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`w-full text-left px-4 py-3 border-b border-dark-700/20 hover:bg-dark-800/50 transition-colors cursor-pointer ${
                    selectedConversation?.id === conv.id ? 'bg-dark-800/70 border-l-2 border-l-brand-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-dark-100 truncate">
                      {conv.contact_push_name || conv.contact_phone}
                    </span>
                    <span className="text-[10px] text-dark-500">
                      {conv.last_message_at ? formatTime(conv.last_message_at) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-dark-400 truncate">{conv.agents?.name || 'Sem agente'}</span>
                    <span className={`px-1.5 py-0.5 text-[9px] rounded font-medium ${STATUS_COLORS[conv.status] || STATUS_COLORS.open}`}>
                      {STATUS_LABELS[conv.status] || conv.status}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Messages Panel */}
        <div className="flex-1 flex flex-col border border-dark-700/40 rounded-xl bg-dark-900/30 overflow-hidden">
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-dark-400">Selecione uma conversa</p>
                <p className="text-xs text-dark-500 mt-1">Clique à esquerda para ver o histórico</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-5 py-3 border-b border-dark-700/30 bg-dark-900/60">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-medium text-dark-50">
                      {selectedConversation.contact_push_name || selectedConversation.contact_phone}
                    </h2>
                    <p className="text-[11px] text-dark-400">
                      {selectedConversation.contact_phone} · {selectedConversation.agents?.name || 'Sem agente'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {attachments.length > 0 && (
                      <button
                        onClick={() => setShowAttachments(!showAttachments)}
                        className={`px-2 py-1 text-[10px] rounded-md font-medium transition-all cursor-pointer ${
                          showAttachments ? 'bg-brand-500 text-white' : 'bg-dark-700 text-dark-300 border border-dark-600'
                        }`}
                      >
                        {attachments.length} anexo{attachments.length > 1 ? 's' : ''}
                      </button>
                    )}
                    <span className={`px-2 py-1 text-[10px] rounded-md font-medium ${STATUS_COLORS[selectedConversation.status] || STATUS_COLORS.open}`}>
                      {STATUS_LABELS[selectedConversation.status] || selectedConversation.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Attachments panel */}
              {showAttachments && (
                <div className="px-5 py-3 border-b border-dark-700/30 bg-dark-800/40 max-h-40 overflow-y-auto">
                  <div className="space-y-2">
                    {attachments.map((att) => (
                      <div key={att.id} className="flex items-center justify-between p-2 bg-dark-800 rounded-lg border border-dark-700/50">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{att.file_type === 'image' ? '🖼' : '📄'}</span>
                          <div>
                            <p className="text-xs text-dark-100 truncate max-w-[180px]">{att.file_name}</p>
                            <p className="text-[9px] text-dark-500">{att.file_size ? `${(att.file_size / 1024).toFixed(1)} KB` : ''}</p>
                          </div>
                        </div>
                        {att.public_url && (
                          <a href={att.public_url} target="_blank" rel="noopener noreferrer"
                            className="px-2 py-0.5 text-[10px] bg-brand-500/10 text-brand-400 rounded hover:bg-brand-500/20 transition-colors">
                            Abrir
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {loadingMessages ? (
                  <p className="text-xs text-dark-500 text-center py-8">Carregando...</p>
                ) : messages.length === 0 ? (
                  <p className="text-xs text-dark-500 text-center py-8">Nenhuma mensagem</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[70%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-dark-800 border border-dark-700/50 text-dark-100'
                          : 'bg-brand-500/10 border border-brand-500/20 text-dark-100'
                      }`}>
                        {msg.type === 'audio' && msg.role === 'user' && (
                          <span className="text-[10px] text-dark-400 block mb-1">Áudio transcrito</span>
                        )}
                        {msg.type === 'document' && msg.role === 'user' && (
                          <span className="text-[10px] text-dark-400 block mb-1">Documento</span>
                        )}
                        {msg.type === 'image' && msg.role === 'user' && (
                          <span className="text-[10px] text-dark-400 block mb-1">Imagem</span>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className="text-[9px] text-dark-500 mt-1.5">{formatFullDate(msg.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply */}
              <form onSubmit={handleSendReply} className="px-4 py-3 border-t border-dark-700/30 bg-dark-900/60">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Digite uma mensagem..."
                    className="flex-1 px-3.5 py-2.5 bg-dark-800 border border-dark-700/50 rounded-lg text-sm text-dark-50 placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                  <Button type="submit" disabled={sending || !replyContent.trim()}>
                    Enviar
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
