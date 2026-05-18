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

O sistema possui 4 níveis de acesso na organização, cada um com permissões granulares configuráveis:

| Nível | Descrição |
|-------|-----------|
| **Proprietário (owner)** | Acesso total, não pode ter permissões removidas |
| **Administrador (admin)** | Gerencia agentes, membros e configurações |
| **Membro (member)** | Opera agentes e conversas, sem poder criar/excluir |
| **Visualizador (viewer)** | Apenas visualiza, sem poder intervir |

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
- Visualizar todos os membros com seus respectivos níveis
- Remover membros (exceto o proprietário)

**Como acessar:** Configurações → Membros

**Como convidar:**
1. Acesse Configurações → Membros
2. Preencha o e-mail do usuário
3. Selecione o nível (Administrador, Membro ou Visualizador)
4. Clique em "Convidar"

---

## Vinculação de Usuários a Agentes (Equipe do Agente)

Cada agente pode ter uma equipe de usuários vinculados com permissões específicas:

| Permissão | O que pode fazer |
|-----------|-----------------|
| **Gerenciar** | Editar configurações, fluxo e prompt do agente |
| **Operar** | Intervir em conversas e ver métricas do agente |
| **Visualizar** | Apenas visualiza conversas e status do agente |

**Como vincular:**
1. Acesse Agentes → clique no agente → aba "Equipe"
2. Selecione um membro da organização
3. Escolha a permissão (Gerenciar, Operar ou Visualizar)
4. Clique em "Vincular"

**Como alterar permissão:** Na lista de membros do agente, altere o dropdown de permissão.

**Como remover:** Clique em "Remover" ao lado do membro.

---

## Próximas funcionalidades

- Suporte a áudio (transcrever e responder com voz)
- Histórico de conversas no dashboard
- Dashboard de métricas (atendimentos, tokens, tempo médio)
- Vincular WhatsApp ao agente pelo dashboard
