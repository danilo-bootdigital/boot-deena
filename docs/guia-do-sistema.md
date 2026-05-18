# Guia Completo do Sistema — LeadPilot (Agente IA)

## O que é

O LeadPilot é uma plataforma de atendimento automatizado via WhatsApp usando Inteligência Artificial. Ele permite criar agentes de IA que atendem clientes automaticamente, seguindo fluxos personalizados ou respondendo de forma inteligente com base em instruções (prompts).

---

## Como funciona (visão geral)

```
Paciente envia mensagem no WhatsApp
        ↓
Evolution API recebe a mensagem
        ↓
Worker processa a mensagem
        ↓
    Tem fluxo visual? ──→ Sim → Executa o fluxo (etapas definidas no editor)
        ↓ Não
    Usa IA com System Prompt (GPT-4o Mini)
        ↓
Resposta enviada de volta pelo WhatsApp
```

---

## Funcionalidades disponíveis

### 1. Criar Agentes de IA

Cada agente é um "atendente virtual" com personalidade e comportamento próprios.

**Como criar:**
1. Acesse o Dashboard → Agentes → "Novo Agente"
2. Preencha nome, descrição, provedor (OpenAI) e modelo (GPT-4o Mini)
3. O agente é criado em status "Rascunho"

**Configurações do agente:**
- **Nome** — identificação do agente
- **Descrição** — para que serve
- **Provedor** — OpenAI ou Anthropic
- **Modelo** — GPT-4o Mini (rápido e barato) ou GPT-4o (mais inteligente)
- **Temperatura** — 0 = respostas precisas, 2 = respostas criativas (recomendado: 0.7)
- **Max Tokens** — tamanho máximo da resposta (recomendado: 1024)
- **Status** — Ativo, Inativo ou Rascunho

---

### 2. Editor Visual de Fluxos

O editor visual permite montar o comportamento do agente arrastando blocos, sem precisar escrever código.

**Tipos de blocos disponíveis:**

| Bloco | Função |
|-------|--------|
| 💬 Mensagem | Envia uma mensagem para o cliente |
| ⚡ Condição | Bifurca o fluxo (se X, faça Y, senão faça Z) |
| ⏳ Aguardar | Espera a resposta do cliente antes de continuar |
| 📝 Salvar Dado | Captura informação (nome, telefone, etc.) |
| 🔧 Ação / API | Chama um endpoint externo |
| 🙋 Transferir | Encaminha para atendente humano |

**Como usar:**
1. Acesse Agentes → clique em "Editar" → aba "Fluxo"
2. Clique nos blocos na barra superior para adicioná-los
3. Arraste as conexões entre os blocos (de baixo para cima)
4. Clique em um bloco para editar suas propriedades no painel lateral
5. Clique em "Salvar Fluxo"

**Templates prontos:**
Clique em "📋 Templates" para carregar um fluxo pronto:
- **Clínica Médica** — saudação, identificação, agendamento, transferência
- **Imobiliária** — qualificação, tipo de imóvel, agendamento de visita
- **E-commerce** — rastreio, trocas, dúvidas, suporte

---

### 3. Prompt do Sistema

O prompt é um texto de instruções que define como o agente se comporta. É usado quando não há fluxo visual ou como complemento.

**Onde editar:** Agentes → Editar → aba "Prompt do Sistema"

O prompt deve conter:
- Quem o agente é
- O que ele pode e não pode fazer
- Etapas do atendimento
- Regras de segurança
- Tom de voz

---

### 4. Testar o Agente

Antes de colocar em produção, você pode testar o agente direto no dashboard.

**Como testar:**
1. Agentes → Editar → aba "Testar"
2. Digite mensagens como se fosse um cliente
3. O agente responde em tempo real
4. Use "Limpar conversa" para recomeçar

O teste usa a mesma IA que será usada no WhatsApp.

---

### 5. Status do Agente

| Status | Comportamento |
|--------|--------------|
| **Ativo** | Responde mensagens automaticamente no WhatsApp |
| **Inativo** | Pausado, não responde nenhuma mensagem |
| **Rascunho** | Em configuração, não disponível para atendimento |

**Como alterar:** Agentes → Editar → aba "Status"

---

### 6. Excluir Agente

1. Na listagem de agentes, clique em "Excluir"
2. Confirme a exclusão
3. O agente e todas as suas configurações são removidos permanentemente

---

## Arquitetura do Sistema

### Componentes

| Serviço | Função |
|---------|--------|
| **Dashboard** | Interface web para gerenciar agentes, fluxos e conversas |
| **API** | Backend que processa requisições do dashboard |
| **Worker** | Processa mensagens recebidas do WhatsApp |
| **Evolution API** | Conecta com o WhatsApp (envio/recebimento) |
| **Redis** | Fila de mensagens entre Evolution API e Worker |
| **Supabase** | Banco de dados e autenticação |

### Fluxo de uma mensagem

1. Cliente envia mensagem no WhatsApp
2. Evolution API recebe e envia para a fila Redis
3. Worker pega da fila e processa:
   - Identifica o agente vinculado ao número
   - Busca/cria a conversa
   - Salva a mensagem do cliente
   - Se tem fluxo visual → executa o fluxo
   - Se não → chama a IA com o system prompt + histórico
   - Salva a resposta
   - Envia de volta pelo WhatsApp

---

## Variáveis de Ambiente Necessárias

### API e Worker
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
REDIS_HOST=boot-deena_redis
REDIS_PORT=6379
REDIS_PASSWORD=...
EVOLUTION_API_URL=http://boot-deena_evolution-api:8080
EVOLUTION_API_KEY=...
```

### Dashboard
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=https://api.seudominio.com/api/v1
```

---

## Perguntas Frequentes

**O agente pode diagnosticar doenças?**
Não. O agente nunca deve diagnosticar, prescrever ou interpretar exames. Isso está configurado nas regras de segurança do prompt.

**Posso ter mais de um agente?**
Sim. Cada agente pode ter comportamento diferente e ser vinculado a um número de WhatsApp diferente.

**O que acontece se o agente não souber responder?**
Ele transfere para um atendente humano automaticamente (se configurado no fluxo ou no prompt).

**Quanto custa por mensagem?**
Com GPT-4o Mini: aproximadamente R$0,001 por mensagem (muito barato). O custo depende do tamanho das mensagens.

**Posso usar sem WhatsApp?**
Sim. O chat de teste no dashboard funciona sem WhatsApp. Para atendimento real, precisa conectar um número.

**Como conecto o WhatsApp?**
É necessário vincular uma instância do Evolution API ao agente. Essa funcionalidade será adicionada em breve no dashboard.

---

## Gerenciamento de Perfil de Usuário

Cada usuário possui um perfil com dados complementares que é criado automaticamente ao se registrar.

**Dados do perfil:**
- Nome completo
- Nome de exibição (como deseja ser chamado)
- Telefone
- Cargo
- Bio (descrição breve)
- Preferências (JSONB configurável)

**Como acessar:** Configurações → Meu Perfil

---

## Níveis de Acesso (Permissões)

O sistema possui 3 níveis de acesso para membros da organização:

| Nível | Descrição |
|-------|-----------|
| **Administrador** | Acesso total. Visualiza todos os agentes, membros e configurações. Pode criar, editar e excluir agentes. |
| **Gerente de Conta** | Acesso apenas aos agentes vinculados. Pode editar agentes da sua carteira e gerenciar atendentes vinculados. |
| **Operador/Atendente** | Acesso limitado. Responde atendimentos e visualiza conversas apenas dos agentes autorizados. |

### Regras de Permissão

**Administrador:**
- Visualizar todos os usuários cadastrados
- Visualizar todos os agentes de IA
- Criar, editar e excluir agentes
- Gerenciar permissões e níveis de acesso
- Acessar todos os setores e configurações do sistema

**Gerente de Conta:**
- Visualizar somente os agentes atribuídos ao seu usuário
- Editar os agentes que pertencem à sua carteira
- Gerenciar atendentes vinculados aos seus agentes
- Visualizar conversas, leads e relatórios apenas dos agentes permitidos
- NÃO pode visualizar agentes de outros gerentes
- NÃO pode acessar configurações globais da plataforma

**Operador/Atendente:**
- Acessar apenas os agentes autorizados
- Responder atendimentos e visualizar conversas
- Atualizar status de leads e pipeline
- NÃO pode editar agentes
- NÃO pode acessar configurações administrativas
- NÃO pode visualizar outros usuários da plataforma

### Controle de Visibilidade dos Agentes

Ao convidar um membro, o administrador define:
- Se o usuário terá acesso a **TODOS** os agentes, OU
- Se terá acesso apenas a **agentes específicos** (selecionados manualmente)

### Estrutura da Equipe do Agente

Cada agente possui:
- **Responsável Principal** — dono do agente, controle total
- **Gerente Vinculado** — gerencia o agente e seus atendentes
- **Equipe Autorizada** — opera/visualiza conforme permissão definida

**Permissões configuráveis por seção:**

| Seção | Permissões disponíveis |
|-------|----------------------|
| Agentes | Criar, Editar, Excluir, Visualizar |
| Conversas | Visualizar, Intervir, Exportar |
| Base de Conhecimento | Criar, Editar, Excluir, Visualizar |
| Membros | Convidar, Remover, Alterar Nível |
| Configurações | Editar, Visualizar |
| Faturamento | Visualizar, Gerenciar |

**Como configurar:** Configurações → Níveis de Acesso → selecione o nível → marque/desmarque permissões → Salvar

**Permissões padrão:** Ao criar uma organização, clique em "Aplicar Permissões Padrão" para carregar o template recomendado.

---

## Gerenciamento de Membros

Gerencie quem faz parte da sua organização.

**Funcionalidades:**
- Convidar novos membros por e-mail com nível de acesso definido
- Definir acesso a todos os agentes ou agentes específicos
- Visualizar todos os membros com seus respectivos níveis
- Remover membros (exceto o proprietário)

**Como acessar:** Configurações → Membros

**Como convidar:**
1. Acesse Configurações → Membros
2. Preencha o e-mail do usuário
3. Selecione o nível (Administrador, Gerente de Conta ou Operador/Atendente)
4. Defina o acesso: "Todos os agentes" ou selecione agentes específicos
5. Clique em "Convidar"

---

## Vinculação de Usuários a Agentes (Equipe do Agente)

Cada agente pode ter uma equipe de usuários vinculados com papéis e permissões específicas:

**Papéis na equipe:**

| Papel | Descrição |
|-------|-----------|
| **Responsável Principal** | Dono do agente. Controle total sobre configurações e equipe. |
| **Gerente Vinculado** | Gerencia o agente e seus atendentes. Pode editar configurações. |
| **Equipe Autorizada** | Pode operar/visualizar o agente conforme a permissão definida. |

**Permissões de acesso:**

| Permissão | O que pode fazer |
|-----------|-----------------|
| **Gerenciar** | Editar configurações, fluxo e prompt do agente |
| **Operar** | Intervir em conversas e ver métricas do agente |
| **Visualizar** | Apenas visualiza conversas e status do agente |

**Como vincular:**
1. Acesse Agentes → clique no agente → aba "Equipe"
2. Selecione um membro da organização
3. Escolha o papel (Responsável, Gerente ou Equipe)
4. Escolha a permissão (Gerenciar, Operar ou Visualizar)
5. Clique em "Vincular"

**Como alterar:** Na lista de membros do agente, altere os dropdowns de papel e permissão.

**Como remover:** Clique em "Remover" ao lado do membro.

---

## Mensagens Agendadas (Follow-up, Confirmação, Reativação)

O sistema permite agendar mensagens automáticas para envio futuro, garantindo acompanhamento do paciente/lead sem intervenção manual.

### Tipos de mensagem agendada

| Tipo | Quando é enviada | Exemplo |
|------|-----------------|---------|
| **Follow-up 1h** | 1 hora após paciente parar de responder | "Oi, passando só para confirmar se você ainda deseja seguir com o agendamento." |
| **Follow-up 24h** | 24 horas sem resposta | "Olá, tudo bem? Ainda posso te ajudar a encontrar um melhor horário para sua consulta?" |
| **Follow-up 3 dias** | 3 dias sem resposta (encerramento) | "Estamos encerrando este atendimento por enquanto, mas quando quiser retomar, é só nos chamar." |
| **Confirmação 24h** | 24 horas antes da consulta | "Olá, {{nome}}. Sua consulta está agendada para amanhã às {{horario}}. Podemos confirmar sua presença?" |
| **No-show** | Após paciente não comparecer | "Vimos que você não conseguiu comparecer à consulta. Deseja remarcar?" |
| **Pós-consulta** | Após atendimento realizado | "Esperamos que tenha sido bem atendido(a). Se precisar agendar retorno, posso ajudar." |
| **Reativação** | Período longo sem retorno | "Notamos que já faz um tempo desde seu último atendimento. Deseja verificar disponibilidade?" |
| **Personalizado** | Configurável pelo usuário | Qualquer mensagem com delay customizado |

### Como funciona

1. O **Flow Engine** do worker processa o fluxo visual do agente
2. Quando encontra um nó "⏰ Agendar Mensagem", cria um registro na tabela `scheduled_messages`
3. Um **job recorrente** (a cada 60 segundos) verifica mensagens pendentes cujo horário já passou
4. A mensagem é enviada via WhatsApp (Evolution API) e salva no histórico da conversa
5. Se o paciente responder antes do envio, os follow-ups pendentes são **cancelados automaticamente**

### Comportamento inteligente

- **Cancelamento automático**: Quando o paciente envia uma mensagem, todos os follow-ups pendentes daquela conversa são cancelados (evita spam)
- **Respeita status da conversa**: Se a conversa foi encerrada ou arquivada, mensagens agendadas são canceladas
- **Variáveis dinâmicas**: As mensagens suportam `{{nome}}`, `{{especialidade}}`, `{{horario}}`, etc.

### Como usar no Flow Editor

1. Acesse Agentes → clique no agente → aba "Fluxo"
2. Na barra superior, clique em **"⏰ Agendar Msg"**
3. Configure:
   - **Tipo**: Follow-up 1h, Confirmação 24h, Pós-consulta, etc.
   - **Atraso**: Tempo em minutos (60 = 1h, 1440 = 1 dia, 4320 = 3 dias)
   - **Mensagem**: Texto a enviar (suporta variáveis)
4. Conecte o nó ao fluxo e salve

### API de Mensagens Agendadas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/scheduled-messages` | Listar agendamentos (filtro por conversation_id, agent_id, status) |
| POST | `/scheduled-messages` | Criar agendamento manual |
| PUT | `/scheduled-messages/:id/cancel` | Cancelar agendamento pendente |
| DELETE | `/scheduled-messages/:id` | Remover agendamento |

---

## Próximas funcionalidades

- Suporte a áudio (transcrever e responder com voz)
- Histórico de conversas no dashboard
- Dashboard de métricas (atendimentos, tokens, tempo médio)
- Vincular WhatsApp ao agente pelo dashboard
