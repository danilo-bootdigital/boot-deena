export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'location';
export type AgentStatus = 'active' | 'inactive' | 'draft';
export type ConversationStatus = 'active' | 'closed' | 'archived' | 'waiting_human';
export type AiProvider = 'openai' | 'anthropic';
export type AiModel = 'gpt-4o' | 'gpt-4o-mini' | 'claude-sonnet-4-20250514' | 'claude-haiku-4-20250514';

export type OrgRole = 'owner' | 'admin' | 'manager' | 'operator';
export type AgentPermission = 'manage' | 'operate' | 'view';
export type AgentRoleType = 'owner' | 'manager' | 'team';

export interface AccessPermissions {
  agents: { create: boolean; edit: boolean; delete: boolean; view: boolean };
  conversations: { view: boolean; intervene: boolean; export: boolean };
  knowledge_base: { create: boolean; edit: boolean; delete: boolean; view: boolean };
  members: { invite: boolean; remove: boolean; change_role: boolean };
  settings: { edit: boolean; view: boolean };
  billing: { view: boolean; manage: boolean };
}

export interface Profile {
  id: string;
  full_name: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  job_title: string | null;
  bio: string | null;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AgentMember {
  id: string;
  agent_id: string;
  user_id: string;
  permission: AgentPermission;
  assigned_by: string | null;
  created_at: string;
}

export interface AccessLevel {
  id: string;
  organization_id: string;
  role: OrgRole;
  permissions: AccessPermissions;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_PERMISSIONS: Record<OrgRole, AccessPermissions> = {
  owner: {
    agents: { create: true, edit: true, delete: true, view: true },
    conversations: { view: true, intervene: true, export: true },
    knowledge_base: { create: true, edit: true, delete: true, view: true },
    members: { invite: true, remove: true, change_role: true },
    settings: { edit: true, view: true },
    billing: { view: true, manage: true },
  },
  admin: {
    agents: { create: true, edit: true, delete: true, view: true },
    conversations: { view: true, intervene: true, export: true },
    knowledge_base: { create: true, edit: true, delete: true, view: true },
    members: { invite: true, remove: true, change_role: true },
    settings: { edit: true, view: true },
    billing: { view: true, manage: false },
  },
  manager: {
    agents: { create: false, edit: true, delete: false, view: true },
    conversations: { view: true, intervene: true, export: true },
    knowledge_base: { create: true, edit: true, delete: false, view: true },
    members: { invite: false, remove: false, change_role: false },
    settings: { edit: false, view: false },
    billing: { view: false, manage: false },
  },
  operator: {
    agents: { create: false, edit: false, delete: false, view: true },
    conversations: { view: true, intervene: true, export: false },
    knowledge_base: { create: false, edit: false, delete: false, view: true },
    members: { invite: false, remove: false, change_role: false },
    settings: { edit: false, view: false },
    billing: { view: false, manage: false },
  },
};
