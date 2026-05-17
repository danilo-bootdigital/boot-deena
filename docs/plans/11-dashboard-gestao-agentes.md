# Plano 11 — Dashboard: Gestão de Agentes

## Objetivo
Implementar a interface completa de gestão de agentes no dashboard: listagem, criação, edição de configurações (prompt, modelo, temperatura), associação de tools e knowledge bases, teste de conversa inline, e ativação/desativação.

## Pré-requisitos
- Plano 09 concluído (dashboard base)
- Plano 04 concluído (API CRUD de agents)
- Plano 06 concluído (motor de IA — para teste inline)
- Plano 07 concluído (knowledge bases — para associação)

## Estrutura de Arquivos

```
apps/dashboard/src/
├── app/(dashboard)/agents/
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [agentId]/
│       ├── page.tsx
│       ├── tools/page.tsx
│       ├── knowledge/page.tsx
│       └── test/page.tsx
├── components/agents/
│   ├── agent-card.tsx
│   ├── agent-form.tsx
│   ├── agent-status-badge.tsx
│   ├── model-selector.tsx
│   ├── prompt-editor.tsx
│   ├── temperature-slider.tsx
│   ├── tool-config-form.tsx
│   ├── knowledge-base-picker.tsx
│   └── test-chat.tsx
└── hooks/
    ├── use-agents.ts
    └── use-agent.ts
```

## Steps

### 1. Criar hooks

**use-agents.ts:** Lista agentes da org, com funções deleteAgent e toggleStatus.
**use-agent.ts:** Busca agente individual por ID, com função updateAgent.

### 2. Página de listagem (/agents)

- Grid de AgentCards (nome, provider/model, status badge, descrição)
- Botão "Novo Agente" → /agents/new
- Empty state quando não há agentes
- Cada card tem ações: Editar, Testar, Ativar/Desativar, Deletar

### 3. Componente AgentCard

- Ícone + nome + provider/model
- Status badge (active=verde, inactive=cinza, draft=amarelo)
- Descrição truncada (2 linhas)
- Footer com botões de ação (links e handlers)

### 4. Componente AgentForm (criação e edição)

Formulário com seções:
- **Informações Básicas:** nome (required), descrição
- **Modelo de IA:** ModelSelector (provider + model), TemperatureSlider, max_tokens
- **System Prompt:** PromptEditor (textarea monospace, 12 rows)
- **Actions:** Salvar / Cancelar

Lógica:
- mode='create' → POST /agents
- mode='edit' → PUT /agents/:id
- Redirect para /agents após salvar

### 5. Componente ModelSelector

- Dois selects lado a lado: Provider e Model
- Ao trocar provider, atualiza lista de modelos e seleciona o primeiro
- Providers: OpenAI, Anthropic
- Models OpenAI: gpt-4o, gpt-4o-mini
- Models Anthropic: claude-sonnet-4-6, claude-haiku-4-5

### 6. Componente PromptEditor

- Textarea com font-mono, placeholder com exemplo
- Hint text abaixo explicando o propósito

### 7. Componente TemperatureSlider

- Input range 0-2, step 0.1
- Label "Temperatura" com valor atual à direita
- Labels "Preciso" e "Criativo" nas extremidades

### 8. Página de teste (/agents/[agentId]/test)

- Componente TestChat: chat simulado com o agente
- Envia POST /agents/:id/test com { message, history }
- Exibe mensagens em bubbles (reutiliza MessageBubble do inbox)
- Botão "Limpar" para resetar conversa
- Indicador "Pensando..." durante loading

### 9. Endpoint de teste na API

Adicionar ao AgentsController:
```
POST /agents/:id/test
Body: { message: string, history: Array<{role, content}> }
Response: { content: string }
```

Implementação no AgentsService:
- Busca config do agente
- Chama generate() do @agente-ia/ai com a config + history + message
- Retorna { content: result.content }

### 10. Página de tools (/agents/[agentId]/tools)

- Lista tools associadas ao agente
- Formulário para adicionar nova tool:
  - name, description, type (function/api_call/webhook)
  - parameters_schema (JSON editor simples)
  - endpoint_url (para api_call/webhook)
  - Toggle enabled/disabled
- Editar e remover tools existentes

### 11. Página de knowledge bases (/agents/[agentId]/knowledge)

- Lista KBs disponíveis na org com checkbox de associação
- Mostra quais estão associadas ao agente
- Toggle para associar/desassociar
- Link para criar nova KB se não existir nenhuma

### 12. Componente AgentStatusBadge

```typescript
// Mapeia status para cor:
// active → bg-green-100 text-green-700
// inactive → bg-gray-100 text-gray-700
// draft → bg-yellow-100 text-yellow-700
```

## Dependências
- Plano 09 (dashboard base)
- Plano 04 (API CRUD agents)
- Plano 06 (motor de IA para teste)
- Plano 07 (knowledge bases)

## Critérios de Conclusão
- [ ] Lista de agentes exibe cards com status e info
- [ ] Criar novo agente funciona (form completo)
- [ ] Editar agente existente funciona
- [ ] Seletor de provider/modelo funciona
- [ ] Slider de temperatura funciona
- [ ] Editor de system prompt funciona
- [ ] Ativar/desativar agente funciona
- [ ] Deletar agente funciona (com confirmação)
- [ ] Teste inline de conversa funciona
- [ ] Associar knowledge bases ao agente funciona
- [ ] Configurar tools do agente funciona
- [ ] Validação de campos obrigatórios (nome, system_prompt)
