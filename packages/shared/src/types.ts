export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'location';
export type AgentStatus = 'active' | 'inactive' | 'draft';
export type ConversationStatus = 'active' | 'closed' | 'archived' | 'waiting_human';
export type AiProvider = 'openai' | 'anthropic';
export type AiModel = 'gpt-4o' | 'gpt-4o-mini' | 'claude-sonnet-4-20250514' | 'claude-haiku-4-20250514';
