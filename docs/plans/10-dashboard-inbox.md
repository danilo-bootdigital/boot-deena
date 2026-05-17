# Plano 10 — Dashboard: Inbox

## Objetivo
Implementar a tela de Inbox do dashboard com lista de conversas em tempo real, visualização de mensagens, indicadores de status, busca, filtros, e capacidade de enviar mensagens manuais (intervenção humana).

## Pré-requisitos
- Plano 09 concluído (dashboard com auth e layout)
- Plano 04 concluído (API com endpoints de conversations/messages)
- Supabase Realtime habilitado nas tabelas conversations e messages

## Estrutura de Arquivos Criados

```
apps/dashboard/src/
├── app/(dashboard)/inbox/
│   ├── page.tsx
│   └── [conversationId]/
│       └── page.tsx
├── components/inbox/
│   ├── conversation-list.tsx
│   ├── conversation-item.tsx
│   ├── conversation-filters.tsx
│   ├── message-panel.tsx
│   ├── message-bubble.tsx
│   ├── message-input.tsx
│   ├── contact-info.tsx
│   └── empty-state.tsx
├── hooks/
│   ├── use-conversations.ts
│   ├── use-messages.ts
│   └── use-realtime.ts
└── lib/
    └── format-date.ts
```

## Steps

### 1. Criar hook de Realtime

**hooks/use-realtime.ts:**
```typescript
'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeOptions {
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
}

export function useRealtime(options: UseRealtimeOptions) {
  const { table, filter, event = '*', onInsert, onUpdate, onDelete } = options;
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          filter,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(payload.new);
              break;
            case 'UPDATE':
              onUpdate?.(payload.new);
              break;
            case 'DELETE':
              onDelete?.(payload.old);
              break;
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, event, supabase, onInsert, onUpdate, onDelete]);
}
```

### 2. Criar hook de conversations

**hooks/use-conversations.ts:**
```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useOrganization } from '@/providers/organization-provider';
import { useRealtime } from './use-realtime';

interface Conversation {
  id: string;
  contact_phone: string;
  contact_name: string | null;
  contact_push_name: string | null;
  channel: string;
  status: string;
  last_message_at: string | null;
  agent: { id: string; name: string } | null;
  last_message?: { content: string; role: string };
  unread_count?: number;
}

interface UseConversationsOptions {
  status?: string;
  search?: string;
}

export function useConversations(options: UseConversationsOptions = {}) {
  const { currentOrg } = useOrganization();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!currentOrg) return;

    try {
      const params = new URLSearchParams();
      if (options.status) params.set('status', options.status);
      if (options.search) params.set('search', options.search);

      const data = await api<Conversation[]>(
        `/conversations?${params.toString()}`,
        { orgId: currentOrg.id },
      );
      setConversations(data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [currentOrg, options.status, options.search]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Realtime: novas conversas e atualizações
  useRealtime({
    table: 'conversations',
    filter: currentOrg ? `organization_id=eq.${currentOrg.id}` : undefined,
    onInsert: (newConv) => {
      setConversations((prev) => [newConv, ...prev]);
    },
    onUpdate: (updatedConv) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === updatedConv.id ? { ...c, ...updatedConv } : c)),
      );
    },
  });

  return { conversations, loading, refetch: fetchConversations };
}
```

### 3. Criar hook de messages

**hooks/use-messages.ts:**
```typescript
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useOrganization } from '@/providers/organization-provider';
import { useRealtime } from './use-realtime';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  type: string;
  content: string | null;
  media_url: string | null;
  tool_calls: any;
  created_at: string;
}

export function useMessages(conversationId: string | null) {
  const { currentOrg } = useOrganization();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !currentOrg) return;

    try {
      const data = await api<Message[]>(
        `/conversations/${conversationId}/messages`,
        { orgId: currentOrg.id },
      );
      setMessages(data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, currentOrg]);

  useEffect(() => {
    setMessages([]);
    setLoading(true);
    fetchMessages();
  }, [fetchMessages]);

  // Realtime: novas mensagens
  useRealtime({
    table: 'messages',
    filter: conversationId ? `conversation_id=eq.${conversationId}` : undefined,
    onInsert: (newMsg) => {
      setMessages((prev) => [...prev, newMsg]);
      // Auto-scroll
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    },
  });

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId || !currentOrg) return;

    await api(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      orgId: currentOrg.id,
      body: JSON.stringify({ content, role: 'assistant' }),
    });
  }, [conversationId, currentOrg]);

  return { messages, loading, sendMessage, bottomRef };
}
```

### 4. Criar página principal do Inbox

**app/(dashboard)/inbox/page.tsx:**
```typescript
'use client';

import { useState } from 'react';
import { ConversationList } from '@/components/inbox/conversation-list';
import { MessagePanel } from '@/components/inbox/message-panel';
import { EmptyState } from '@/components/inbox/empty-state';

export default function InboxPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 -m-6">
      {/* Lista de conversas */}
      <div className="w-80 border-r border-border flex-shrink-0">
        <ConversationList
          selectedId={selectedConversationId}
          onSelect={setSelectedConversationId}
        />
      </div>

      {/* Painel de mensagens */}
      <div className="flex-1">
        {selectedConversationId ? (
          <MessagePanel conversationId={selectedConversationId} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
```

### 5. Criar ConversationList

**components/inbox/conversation-list.tsx:**
```typescript
'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { useConversations } from '@/hooks/use-conversations';
import { ConversationItem } from './conversation-item';
import { ConversationFilters } from './conversation-filters';

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const { conversations, loading } = useConversations({ status: statusFilter, search });

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Filters */}
      <ConversationFilters value={statusFilter} onChange={setStatusFilter} />

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma conversa encontrada
          </p>
        ) : (
          conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isSelected={conv.id === selectedId}
              onClick={() => onSelect(conv.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

### 6. Criar ConversationItem

**components/inbox/conversation-item.tsx:**
```typescript
'use client';

import { cn } from '@/lib/utils';
import { formatRelativeDate } from '@/lib/format-date';

interface ConversationItemProps {
  conversation: any;
  isSelected: boolean;
  onClick: () => void;
}

export function ConversationItem({ conversation, isSelected, onClick }: ConversationItemProps) {
  const displayName = conversation.contact_push_name || conversation.contact_phone || 'Desconhecido';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent',
        isSelected && 'bg-accent',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground mt-0.5">
            {conversation.last_message?.content || 'Sem mensagens'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {conversation.last_message_at
              ? formatRelativeDate(conversation.last_message_at)
              : ''}
          </span>
          {conversation.status === 'waiting_human' && (
            <span className="inline-flex h-5 items-center rounded-full bg-orange-100 px-2 text-xs font-medium text-orange-700">
              Humano
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
```

### 7. Criar MessagePanel

**components/inbox/message-panel.tsx:**
```typescript
'use client';

import { useMessages } from '@/hooks/use-messages';
import { MessageBubble } from './message-bubble';
import { MessageInput } from './message-input';
import { ContactInfo } from './contact-info';

interface MessagePanelProps {
  conversationId: string;
}

export function MessagePanel({ conversationId }: MessagePanelProps) {
  const { messages, loading, sendMessage, bottomRef } = useMessages(conversationId);

  return (
    <div className="flex h-full flex-col">
      {/* Header com info do contato */}
      <ContactInfo conversationId={conversationId} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
```

### 8. Criar MessageBubble

**components/inbox/message-bubble.tsx:**
```typescript
import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';

interface MessageBubbleProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string | null;
    type: string;
    created_at: string;
  };
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}

      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p className={cn(
          'mt-1 text-xs',
          isUser ? 'text-primary-foreground/70' : 'text-muted-foreground',
        )}>
          {new Date(message.created_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      {isUser && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}
```

### 9. Criar MessageInput

**components/inbox/message-input.tsx:**
```typescript
'use client';

import { useState, useRef } from 'react';
import { Send } from 'lucide-react';

interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
}

export function MessageInput({ onSend }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      await onSend(trimmed);
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  return (
    <div className="border-t border-border p-4">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Digite uma mensagem... (Enter para enviar, Shift+Enter para nova linha)"
          rows={1}
          className="flex-1 resize-none rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring max-h-32"
        />
        <button
          onClick={handleSend}
          disabled={!content.trim() || sending}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```

### 10. Criar lib/format-date.ts

```typescript
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
```

### 11. Habilitar Realtime no Supabase

Adicionar migration:

```sql
-- 00012_enable_realtime.sql
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

## Dependências
- Plano 09 (dashboard base)
- Plano 04 (API endpoints)
- Plano 03 (schema)

## Critérios de Conclusão
- [ ] Lista de conversas carrega e exibe corretamente
- [ ] Filtro por status funciona (active, closed, waiting_human)
- [ ] Busca por nome/telefone funciona
- [ ] Clicar em conversa mostra mensagens
- [ ] Mensagens aparecem em tempo real (Supabase Realtime)
- [ ] Novas conversas aparecem na lista automaticamente
- [ ] Enviar mensagem manual funciona (intervenção humana)
- [ ] Auto-scroll ao receber nova mensagem
- [ ] Bubbles diferenciadas para user vs assistant
- [ ] Timestamps relativos (agora, 5min, 2h, 3d)
- [ ] Layout responsivo (mobile: lista ou mensagens, não ambos)
- [ ] Empty state quando nenhuma conversa selecionada
