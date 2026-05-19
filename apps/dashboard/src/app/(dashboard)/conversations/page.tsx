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
  open: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
  archived: 'bg-yellow-100 text-yellow-700',
  waiting: 'bg-blue-100 text-blue-700',
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
    } catch {
      // silently fail
    } finally {
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

    if (diffHours < 24) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffHours < 48) {
      return 'Ontem';
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  function formatFullDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Conversas</h1>
        <div className="flex gap-2">
          {['', 'open', 'closed', 'archived'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === '' ? 'Todas' : STATUS_LABELS[s] || s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Lista de conversas */}
        <div className="w-96 flex flex-col border border-gray-200 rounded-lg bg-white overflow-hidden">
          <form onSubmit={handleSearch} className="p-3 border-b border-gray-100">
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhuma conversa encontrada</p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {conv.contact_push_name || conv.contact_phone}
                    </span>
                    <span className="text-xs text-gray-400">
                      {conv.last_message_at ? formatTime(conv.last_message_at) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500 truncate">
                      {conv.agents?.name || 'Sem agente'}
                    </span>
                    <span className={`px-1.5 py-0.5 text-[10px] rounded ${STATUS_COLORS[conv.status] || STATUS_COLORS.open}`}>
                      {STATUS_LABELS[conv.status] || conv.status}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Painel de mensagens */}
        <div className="flex-1 flex flex-col border border-gray-200 rounded-lg bg-white overflow-hidden">
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-lg">Selecione uma conversa</p>
                <p className="text-sm mt-1">Clique em uma conversa à esquerda para ver o histórico</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header da conversa */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">
                      {selectedConversation.contact_push_name || selectedConversation.contact_phone}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {selectedConversation.contact_phone} · {selectedConversation.agents?.name || 'Sem agente'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {attachments.length > 0 && (
                      <button
                        onClick={() => setShowAttachments(!showAttachments)}
                        className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors ${
                          showAttachments ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        📎 {attachments.length} {attachments.length === 1 ? 'anexo' : 'anexos'}
                      </button>
                    )}
                    <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[selectedConversation.status] || STATUS_COLORS.open}`}>
                      {STATUS_LABELS[selectedConversation.status] || selectedConversation.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Painel de anexos */}
              {showAttachments && (
                <div className="px-4 py-3 border-b border-gray-200 bg-white max-h-48 overflow-y-auto">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Documentos e Imagens</p>
                  <div className="space-y-2">
                    {attachments.map((att) => (
                      <div key={att.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {att.file_type === 'image' ? '🖼️' : '📄'}
                          </span>
                          <div>
                            <p className="text-sm text-gray-700 truncate max-w-[200px]">{att.file_name}</p>
                            <p className="text-[10px] text-gray-400">
                              {att.file_size ? `${(att.file_size / 1024).toFixed(1)} KB` : ''} · {new Date(att.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        {att.public_url && (
                          <a
                            href={att.public_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            Abrir
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
                {loadingMessages ? (
                  <p className="text-sm text-gray-400 text-center py-8">Carregando mensagens...</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Nenhuma mensagem</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${
                          msg.role === 'user'
                            ? 'bg-white border border-gray-200 text-gray-800'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {msg.type === 'audio' && msg.role === 'user' && (
                          <span className="text-xs opacity-70 block mb-1">🎙️ Áudio transcrito:</span>
                        )}
                        {msg.type === 'document' && msg.role === 'user' && (
                          <span className="text-xs opacity-70 block mb-1">📄 Documento:</span>
                        )}
                        {msg.type === 'image' && msg.role === 'user' && (
                          <span className="text-xs opacity-70 block mb-1">🖼️ Imagem:</span>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-gray-400' : 'text-blue-200'}`}>
                          {formatFullDate(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input de resposta */}
              <form onSubmit={handleSendReply} className="px-4 py-3 border-t border-gray-200 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Digite uma mensagem..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button type="submit" disabled={sending || !replyContent.trim()}>
                    {sending ? '...' : 'Enviar'}
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
