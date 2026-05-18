'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

const topics = [
  {
    id: 'visao-geral',
    title: 'Visão Geral da Plataforma',
    icon: '🏠',
  },
  {
    id: 'criar-agentes',
    title: 'Criar e Gerenciar Agentes',
    icon: '🤖',
  },
  {
    id: 'editor-fluxos',
    title: 'Editor Visual de Fluxos',
    icon: '🔀',
  },
  {
    id: 'prompt-sistema',
    title: 'Personalizar o Prompt do Sistema',
    icon: '📝',
  },
  {
    id: 'testar-agente',
    title: 'Testar o Agente',
    icon: '🧪',
  },
  {
    id: 'templates',
    title: 'Templates de Fluxo',
    icon: '📋',
  },
  {
    id: 'rag',
    title: 'Base de Conhecimento (RAG)',
    icon: '📚',
  },
  {
    id: 'configuracoes',
    title: 'Configurações e Deploy',
    icon: '⚙️',
  },
  {
    id: 'problemas',
    title: 'Solução de Problemas',
    icon: '🔧',
  },
];

function TopicContent({ id }: { id: string }) {
  switch (id) {
    case 'visao-geral':
      return <VisaoGeral />;
    case 'criar-agentes':
      return <CriarAgentes />;
    case 'editor-fluxos':
      return <EditorFluxos />;
    case 'prompt-sistema':
      return <PromptSistema />;
    case 'testar-agente':
      return <TestarAgente />;
    case 'templates':
      return <Templates />;
    case 'rag':
      return <RAG />;
    case 'configuracoes':
      return <Configuracoes />;
    case 'problemas':
      return <Problemas />;
    default:
      return null;
  }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-600 leading-relaxed mb-2">{children}</p>;
}

function UL({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 mb-3 ml-2">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-gray-900 text-green-300 text-xs p-3 rounded-lg overflow-x-auto mb-3 whitespace-pre-wrap">
      {children}
    </pre>
  );
}

function VisaoGeral() {
  return (
    <div>
      <SectionTitle>O que é o LeadPilot?</SectionTitle>
      <P>
        O LeadPilot é uma plataforma completa de automação de atendimento via WhatsApp com Inteligência Artificial.
        Ele permite criar agentes inteligentes que conversam com seus clientes de forma natural, seguindo fluxos
        personalizados, respondendo dúvidas, qualificando leads e transferindo para atendentes humanos quando necessário.
      </P>

      <SectionTitle>Como funciona?</SectionTitle>
      <P>
        O sistema recebe mensagens do WhatsApp através da Evolution API, processa com IA (OpenAI, Anthropic ou outros
        provedores) seguindo o fluxo configurado, e responde automaticamente. Todo o processo é gerenciado por um
        Worker que executa os fluxos em tempo real.
      </P>

      <SectionTitle>Componentes da Arquitetura</SectionTitle>
      <UL items={[
        'Dashboard (este painel) — Interface web para gerenciar agentes, fluxos, bases de conhecimento e configurações',
        'API (Backend) — Servidor que processa requisições, gerencia dados e orquestra a comunicação entre serviços',
        'Worker — Serviço que executa os fluxos de conversa em tempo real, processando mensagens recebidas',
        'Evolution API — Gateway de conexão com o WhatsApp, responsável por enviar e receber mensagens',
        'Redis — Cache e fila de mensagens para comunicação entre serviços e armazenamento de sessões',
        'Supabase (PostgreSQL) — Banco de dados principal onde ficam agentes, fluxos, conversas e configurações',
      ]} />

      <SectionTitle>Fluxo de uma mensagem</SectionTitle>
      <UL items={[
        '1. Cliente envia mensagem no WhatsApp',
        '2. Evolution API recebe e envia webhook para a API',
        '3. API identifica o agente responsável e publica na fila Redis',
        '4. Worker consome a mensagem, carrega o fluxo e o contexto da conversa',
        '5. Worker executa o bloco atual do fluxo (pode chamar IA, salvar dados, verificar condições)',
        '6. Resposta é enviada de volta pela Evolution API ao WhatsApp do cliente',
      ]} />
    </div>
  );
}

function CriarAgentes() {
  return (
    <div>
      <SectionTitle>Como criar um agente</SectionTitle>
      <P>
        Acesse o menu "Agentes" no painel lateral e clique em "Novo Agente". Preencha os campos obrigatórios
        e configure o comportamento desejado. Cada agente representa um assistente virtual independente que pode
        atender em um ou mais números de WhatsApp.
      </P>

      <SectionTitle>Campos configuráveis</SectionTitle>
      <UL items={[
        'Nome — Identificador do agente no painel. Use nomes descritivos como "Atendente Clínica SP" ou "Vendas Imóveis"',
        'Descrição — Texto livre para documentar o propósito do agente. Não afeta o comportamento, apenas organização',
        'Provider (Provedor de IA) — Qual serviço de IA será usado: "openai" para GPT-4/GPT-3.5, "anthropic" para Claude, "groq" para modelos open-source rápidos',
        'Model (Modelo) — Modelo específico do provedor. Ex: "gpt-4o", "gpt-4o-mini", "claude-3-5-sonnet-20241022", "llama-3.1-70b-versatile"',
        'Temperature (Temperatura) — Controla a criatividade das respostas. Valor entre 0 e 2. Use 0.1-0.3 para respostas precisas e consistentes, 0.7-1.0 para respostas mais variadas e criativas',
        'Max Tokens — Limite máximo de tokens (palavras/pedaços de palavras) na resposta. 500-1000 para respostas curtas, 2000-4000 para respostas detalhadas',
        'Status — "active" (ativo, processando mensagens) ou "inactive" (inativo, ignorando mensagens). Use para pausar um agente sem excluí-lo',
        'System Prompt — O prompt de sistema que define a personalidade, regras e comportamento do agente (veja tópico específico)',
      ]} />

      <SectionTitle>Boas práticas</SectionTitle>
      <UL items={[
        'Comece com temperature 0.3 e ajuste conforme necessário',
        'Use max_tokens de 1000 para a maioria dos casos — respostas muito longas cansam no WhatsApp',
        'Sempre teste o agente antes de ativá-lo em produção',
        'Crie agentes separados para funções diferentes (vendas, suporte, agendamento)',
        'Mantenha o nome do agente claro para facilitar a identificação nos relatórios',
      ]} />

      <SectionTitle>Gerenciamento</SectionTitle>
      <P>
        Na lista de agentes você pode editar qualquer campo, ativar/desativar, duplicar ou excluir um agente.
        Ao excluir, todas as conversas associadas são mantidas no histórico, mas o agente para de responder imediatamente.
      </P>
    </div>
  );
}

function EditorFluxos() {
  return (
    <div>
      <SectionTitle>O que é o Editor Visual de Fluxos?</SectionTitle>
      <P>
        O editor visual permite criar a lógica de conversa do agente de forma gráfica, arrastando e conectando blocos.
        Cada bloco representa uma ação que o agente executa durante a conversa. Os blocos são processados em sequência,
        seguindo as conexões que você define.
      </P>

      <SectionTitle>Tipos de Blocos</SectionTitle>

      <h4 className="text-sm font-semibold text-blue-700 mt-3 mb-1">1. Message (Mensagem)</h4>
      <P>Envia uma mensagem ao cliente. Pode ser texto fixo ou gerado por IA.</P>
      <UL items={[
        'Texto fixo — Mensagem exata que será enviada (ex: "Olá! Como posso ajudar?")',
        'Gerado por IA — O agente usa o prompt do sistema e contexto da conversa para gerar uma resposta inteligente',
        'Suporta variáveis como {{nome}}, {{telefone}} que são substituídas por dados salvos',
      ]} />

      <h4 className="text-sm font-semibold text-blue-700 mt-3 mb-1">2. Condition (Condição)</h4>
      <P>Cria uma bifurcação no fluxo baseada em uma condição. Permite caminhos diferentes conforme a resposta do cliente.</P>
      <UL items={[
        'Condição por palavra-chave — Verifica se a mensagem contém determinadas palavras',
        'Condição por variável — Verifica o valor de um dado salvo (ex: cidade == "São Paulo")',
        'Condição por IA — A IA analisa a intenção da mensagem e decide o caminho (ex: "cliente quer agendar?" sim/não)',
        'Sempre tem duas saídas: "Verdadeiro" e "Falso"',
      ]} />

      <h4 className="text-sm font-semibold text-blue-700 mt-3 mb-1">3. Wait (Espera)</h4>
      <P>Pausa o fluxo e aguarda uma ação do cliente antes de continuar.</P>
      <UL items={[
        'Aguardar resposta — Espera o cliente enviar qualquer mensagem',
        'Aguardar tempo — Espera X minutos/horas antes de continuar (útil para follow-up)',
        'Timeout — Define tempo máximo de espera. Se expirar, segue por um caminho alternativo',
      ]} />

      <h4 className="text-sm font-semibold text-blue-700 mt-3 mb-1">4. Save Data (Salvar Dados)</h4>
      <P>Extrai e salva informações da conversa para uso posterior.</P>
      <UL items={[
        'Extração por IA — A IA identifica e extrai dados da mensagem (nome, email, telefone, interesse)',
        'Salvamento direto — Salva um valor fixo em uma variável',
        'Os dados salvos ficam disponíveis como variáveis em blocos seguintes e no CRM',
        'Exemplos: salvar nome do cliente, tipo de imóvel desejado, horário preferido',
      ]} />

      <h4 className="text-sm font-semibold text-blue-700 mt-3 mb-1">5. Action/API (Ação Externa)</h4>
      <P>Executa uma chamada a uma API externa ou ação do sistema.</P>
      <UL items={[
        'Webhook — Envia dados para uma URL externa (integração com CRM, ERP, planilhas)',
        'HTTP Request — Faz requisição GET/POST para buscar ou enviar dados',
        'Ações internas — Marcar conversa como resolvida, adicionar tag, atualizar status do lead',
        'Os dados retornados podem ser usados nos blocos seguintes',
      ]} />

      <h4 className="text-sm font-semibold text-blue-700 mt-3 mb-1">6. Handoff (Transferência)</h4>
      <P>Transfere a conversa para um atendente humano ou outro departamento.</P>
      <UL items={[
        'Transferir para fila — Envia para a fila geral de atendimento humano',
        'Transferir para departamento — Envia para um setor específico (vendas, suporte, financeiro)',
        'Mensagem de transferência — Texto enviado ao cliente informando a transferência',
        'Contexto — Resumo da conversa é passado ao atendente para continuidade',
      ]} />

      <SectionTitle>Como conectar blocos</SectionTitle>
      <UL items={[
        'Clique na saída (ponto inferior) de um bloco e arraste até a entrada (ponto superior) de outro',
        'Blocos de Condição têm duas saídas: verde (verdadeiro) e vermelho (falso)',
        'Um bloco pode ter múltiplas conexões de entrada (vários caminhos levam a ele)',
        'O primeiro bloco do fluxo é o ponto de entrada — é executado quando uma nova conversa começa',
      ]} />

      <SectionTitle>Dicas importantes</SectionTitle>
      <UL items={[
        'Sempre comece com um bloco de Mensagem de boas-vindas',
        'Use blocos de Espera após perguntas para aguardar a resposta do cliente',
        'Salve dados importantes logo após coletá-los',
        'Termine fluxos com Handoff ou uma mensagem de encerramento',
        'Teste o fluxo completo antes de ativar em produção',
        'Mantenha fluxos simples — divida fluxos complexos em sub-fluxos',
      ]} />
    </div>
  );
}

function PromptSistema() {
  return (
    <div>
      <SectionTitle>O que é o Prompt do Sistema?</SectionTitle>
      <P>
        O prompt do sistema é a instrução principal que define quem o agente é, como ele deve se comportar,
        quais regras seguir e como responder. É o "DNA" do seu agente. Um bom prompt faz toda a diferença
        entre um atendimento genérico e um atendimento excelente.
      </P>

      <SectionTitle>O que incluir no prompt</SectionTitle>
      <UL items={[
        'Identidade — Quem é o agente, nome, empresa, função',
        'Tom de voz — Formal, informal, técnico, amigável',
        'Regras de comportamento — O que pode e não pode fazer, limites',
        'Capacidades — O que o agente sabe fazer (agendar, informar preços, qualificar)',
        'Limitações — O que NÃO deve fazer (dar descontos, confirmar sem verificar)',
        'Passos do atendimento — Sequência ideal de perguntas/ações',
        'Regras de transferência — Quando transferir para humano',
        'Informações da empresa — Horários, endereço, serviços, preços',
      ]} />

      <SectionTitle>Exemplo: Clínica Odontológica</SectionTitle>
      <CodeBlock>{`Você é a Ana, assistente virtual da Clínica Sorriso.

IDENTIDADE:
- Nome: Ana
- Função: Recepcionista virtual
- Tom: Simpático, profissional, acolhedor

CAPACIDADES:
- Informar sobre tratamentos disponíveis
- Agendar consultas de avaliação
- Informar horários de funcionamento
- Coletar dados do paciente (nome, telefone, convênio)

REGRAS:
- Nunca dê diagnósticos ou recomendações médicas
- Sempre pergunte se é a primeira consulta
- Colete: nome completo, telefone, convênio (se tiver)
- Horários disponíveis: Seg-Sex 8h-18h, Sáb 8h-12h
- Se o paciente relatar dor aguda, transfira imediatamente

TRATAMENTOS:
- Limpeza: R$ 150-250
- Clareamento: R$ 800-1.500
- Implante: a partir de R$ 2.500 (necessita avaliação)
- Ortodontia: a partir de R$ 250/mês

PASSOS DO ATENDIMENTO:
1. Cumprimentar e perguntar como pode ajudar
2. Identificar o interesse (tratamento específico ou avaliação geral)
3. Informar sobre o tratamento se perguntado
4. Coletar dados para agendamento
5. Confirmar data/horário
6. Despedir-se cordialmente

TRANSFERIR PARA HUMANO QUANDO:
- Paciente insatisfeito ou reclamando
- Dúvidas sobre valores de tratamentos complexos
- Emergências ou dor aguda
- Pedido explícito de falar com humano`}</CodeBlock>

      <SectionTitle>Exemplo: Imobiliária</SectionTitle>
      <CodeBlock>{`Você é o Carlos, consultor virtual da Imobiliária Premium.

IDENTIDADE:
- Nome: Carlos
- Função: Consultor de imóveis virtual
- Tom: Profissional, consultivo, entusiasmado com os imóveis

CAPACIDADES:
- Qualificar o interesse do cliente (compra/aluguel, tipo, região, faixa de preço)
- Informar sobre imóveis disponíveis
- Agendar visitas
- Coletar dados do lead

REGRAS:
- Sempre qualifique: compra ou aluguel? Qual região? Quantos quartos? Faixa de preço?
- Nunca invente imóveis que não existem
- Não negocie valores — apenas informe os anunciados
- Agende visitas apenas em horário comercial (Seg-Sáb 9h-18h)

PASSOS:
1. Cumprimentar e perguntar se busca compra ou aluguel
2. Perguntar região de interesse
3. Perguntar tipo (apartamento, casa, comercial) e quartos
4. Perguntar faixa de preço
5. Apresentar opções compatíveis (se houver na base)
6. Oferecer agendamento de visita
7. Coletar: nome, telefone, email

TRANSFERIR QUANDO:
- Cliente quer negociar valores
- Dúvidas jurídicas ou sobre financiamento
- Cliente já visitou e quer fazer proposta`}</CodeBlock>

      <SectionTitle>Exemplo: E-commerce</SectionTitle>
      <CodeBlock>{`Você é a Lia, assistente da Loja TechStore.

IDENTIDADE:
- Nome: Lia
- Função: Atendente de suporte e vendas
- Tom: Jovem, descontraído mas profissional

CAPACIDADES:
- Informar status de pedidos
- Ajudar com trocas e devoluções
- Recomendar produtos
- Informar sobre promoções ativas
- Resolver dúvidas sobre produtos

REGRAS:
- Para consultar pedido, peça o número do pedido ou CPF
- Trocas aceitas em até 7 dias após recebimento
- Frete grátis acima de R$ 199
- Parcelamento em até 12x sem juros
- Não ofereça descontos além dos já publicados

TRANSFERIR QUANDO:
- Problema com pagamento/cobrança indevida
- Produto com defeito (acionar garantia)
- Reclamação não resolvida
- Pedido atrasado há mais de 10 dias úteis`}</CodeBlock>

      <SectionTitle>Dicas para um bom prompt</SectionTitle>
      <UL items={[
        'Seja específico — quanto mais detalhes, melhor o agente se comporta',
        'Use exemplos — mostre como responder em situações comuns',
        'Defina limites claros — o que o agente NÃO deve fazer é tão importante quanto o que deve',
        'Inclua informações reais — preços, horários, endereços atualizados',
        'Teste e itere — ajuste o prompt baseado nas conversas reais',
        'Mantenha organizado — use seções com títulos em MAIÚSCULAS para facilitar a leitura pela IA',
      ]} />
    </div>
  );
}

function TestarAgente() {
  return (
    <div>
      <SectionTitle>Como usar o Chat de Teste</SectionTitle>
      <P>
        O chat de teste permite simular uma conversa com seu agente antes de colocá-lo em produção.
        Acesse a página do agente e clique em "Testar" para abrir o simulador. As mensagens de teste
        não são enviadas pelo WhatsApp — tudo acontece internamente.
      </P>

      <SectionTitle>O que testar</SectionTitle>
      <UL items={[
        'Mensagem inicial — O agente cumprimenta corretamente?',
        'Fluxo principal — O agente segue os passos definidos no prompt?',
        'Coleta de dados — O agente pede as informações necessárias?',
        'Respostas a perguntas — O agente responde com informações corretas?',
        'Limites — O agente recusa o que não deve fazer?',
        'Transferência — O agente transfere nos momentos certos?',
        'Casos extremos — Mensagens confusas, fora de contexto, em outro idioma',
        'Tom de voz — O agente mantém a personalidade definida?',
      ]} />

      <SectionTitle>Cenários de teste recomendados</SectionTitle>
      <UL items={[
        'Cliente novo que não sabe o que quer — testar qualificação',
        'Cliente que já sabe exatamente o que quer — testar objetividade',
        'Cliente irritado ou insatisfeito — testar empatia e transferência',
        'Cliente que faz perguntas fora do escopo — testar limites',
        'Cliente que envia áudio/imagem (simular com texto descritivo)',
        'Conversa longa com muitas trocas — testar consistência',
        'Cliente que volta depois de horas — testar retomada de contexto',
      ]} />

      <SectionTitle>Dicas</SectionTitle>
      <UL items={[
        'Teste como se fosse um cliente real — não facilite para o agente',
        'Anote os pontos onde o agente erra para ajustar o prompt',
        'Teste com diferentes "personas" de clientes',
        'Verifique se os dados estão sendo salvos corretamente',
        'Após ajustar o prompt, teste novamente os mesmos cenários',
        'Peça para outras pessoas testarem — elas pensarão em cenários diferentes',
      ]} />
    </div>
  );
}

function Templates() {
  return (
    <div>
      <SectionTitle>O que são Templates?</SectionTitle>
      <P>
        Templates são fluxos pré-configurados para casos de uso comuns. Eles servem como ponto de partida
        que você pode personalizar para seu negócio. Ao usar um template, todo o fluxo é criado automaticamente
        com blocos, conexões e configurações prontas.
      </P>

      <SectionTitle>Template: Clínica / Consultório</SectionTitle>
      <P>Fluxo completo para agendamento de consultas em clínicas e consultórios.</P>
      <UL items={[
        'Boas-vindas e identificação do paciente',
        'Verificação se é primeira consulta ou retorno',
        'Coleta de dados: nome, telefone, convênio',
        'Apresentação de horários disponíveis',
        'Confirmação do agendamento',
        'Envio de lembrete com endereço e orientações',
        'Transferência para recepção em casos especiais',
      ]} />

      <SectionTitle>Template: Imobiliária</SectionTitle>
      <P>Fluxo para qualificação de leads e agendamento de visitas a imóveis.</P>
      <UL items={[
        'Boas-vindas e identificação do interesse (compra/aluguel)',
        'Qualificação: região, tipo, quartos, faixa de preço',
        'Apresentação de imóveis compatíveis',
        'Coleta de dados do lead',
        'Agendamento de visita',
        'Transferência para corretor responsável',
      ]} />

      <SectionTitle>Template: E-commerce</SectionTitle>
      <P>Fluxo para atendimento de loja virtual com suporte e vendas.</P>
      <UL items={[
        'Boas-vindas e menu de opções (pedido, troca, dúvida, promoções)',
        'Consulta de status de pedido (pede número ou CPF)',
        'Processo de troca/devolução com coleta de dados',
        'Recomendação de produtos baseada em interesse',
        'FAQ automático para dúvidas frequentes',
        'Transferência para suporte em casos complexos',
      ]} />

      <SectionTitle>Como personalizar um template</SectionTitle>
      <UL items={[
        '1. Selecione o template ao criar um novo fluxo',
        '2. O fluxo será criado com todos os blocos pré-configurados',
        '3. Edite os textos das mensagens com informações da sua empresa',
        '4. Ajuste as condições conforme suas regras de negócio',
        '5. Adicione ou remova blocos conforme necessário',
        '6. Atualize o prompt do sistema com dados reais (preços, horários, etc)',
        '7. Teste o fluxo completo antes de ativar',
      ]} />
    </div>
  );
}

function RAG() {
  return (
    <div>
      <SectionTitle>O que é RAG (Retrieval-Augmented Generation)?</SectionTitle>
      <P>
        RAG é uma técnica que permite ao agente consultar documentos específicos da sua empresa para responder
        perguntas. Em vez de depender apenas do conhecimento geral da IA, o agente busca informações relevantes
        nos seus documentos antes de responder, garantindo respostas precisas e atualizadas.
      </P>

      <SectionTitle>Como funciona</SectionTitle>
      <UL items={[
        '1. Você cria uma Base de Conhecimento e adiciona documentos (textos, FAQs, manuais)',
        '2. Os documentos são processados e divididos em trechos menores (chunks)',
        '3. Cada trecho é convertido em um vetor numérico (embedding) para busca semântica',
        '4. Quando o cliente faz uma pergunta, o sistema busca os trechos mais relevantes',
        '5. Os trechos encontrados são incluídos no contexto da IA para gerar a resposta',
        '6. A IA responde baseada nos seus documentos, não em conhecimento genérico',
      ]} />

      <SectionTitle>Como criar uma Base de Conhecimento</SectionTitle>
      <UL items={[
        'Acesse "Base de Conhecimento" no menu lateral',
        'Clique em "Nova Base" e dê um nome descritivo',
        'Adicione documentos com conteúdo relevante',
        'Aguarde o processamento (status muda para "Ativa")',
        'Vincule a base ao agente desejado nas configurações do agente',
      ]} />

      <SectionTitle>Tipos de documentos recomendados</SectionTitle>
      <UL items={[
        'FAQ — Perguntas e respostas frequentes dos clientes',
        'Catálogo de produtos/serviços — Descrições, preços, especificações',
        'Políticas — Troca, devolução, garantia, privacidade',
        'Informações operacionais — Horários, endereços, formas de pagamento',
        'Guias e tutoriais — Como usar produtos, passo a passo',
        'Tabelas de preço — Valores atualizados de serviços',
      ]} />

      <SectionTitle>Boas práticas</SectionTitle>
      <UL items={[
        'Mantenha documentos atualizados — informações desatualizadas geram respostas erradas',
        'Use linguagem clara e direta nos documentos',
        'Organize por temas — um documento por assunto facilita a busca',
        'Inclua variações de perguntas no FAQ para melhorar a busca',
        'Teste perguntando ao agente sobre os conteúdos adicionados',
        'Documentos muito longos são divididos automaticamente — mas prefira textos focados',
      ]} />
    </div>
  );
}

function Configuracoes() {
  return (
    <div>
      <SectionTitle>Variáveis de Ambiente Necessárias</SectionTitle>
      <P>Configure estas variáveis no seu ambiente de deploy (EasyPanel, Docker, etc):</P>
      <CodeBlock>{`# Banco de dados (Supabase)
DATABASE_URL=postgresql://postgres:senha@host:5432/postgres
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Redis
REDIS_URL=redis://default:senha@host:6379

# Evolution API (WhatsApp)
EVOLUTION_API_URL=https://sua-evolution.com
EVOLUTION_API_KEY=sua-chave-aqui

# Provedores de IA
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Aplicação
NEXT_PUBLIC_APP_URL=https://seu-dashboard.com
API_URL=https://sua-api.com
JWT_SECRET=um-segredo-forte-aqui
NODE_ENV=production`}</CodeBlock>

      <SectionTitle>Deploy no EasyPanel</SectionTitle>
      <UL items={[
        '1. Crie um novo projeto no EasyPanel',
        '2. Adicione os serviços: Dashboard (Next.js), API (Node.js), Worker (Node.js)',
        '3. Configure Redis como serviço adicional ou use Redis externo',
        '4. Configure as variáveis de ambiente em cada serviço',
        '5. O Dashboard roda na porta 3000',
        '6. A API roda na porta 3001 (ou a porta configurada)',
        '7. O Worker não expõe porta — apenas consome a fila Redis',
        '8. Configure domínios personalizados para Dashboard e API',
      ]} />

      <SectionTitle>Serviços e suas funções</SectionTitle>
      <UL items={[
        'Dashboard — Interface web (Next.js). Precisa de NEXT_PUBLIC_APP_URL e SUPABASE_URL',
        'API — Backend REST (Node.js/Express). Precisa de DATABASE_URL, REDIS_URL, chaves de IA',
        'Worker — Processador de filas (Node.js). Precisa de DATABASE_URL, REDIS_URL, EVOLUTION_API_URL, chaves de IA',
        'Redis — Fila de mensagens e cache. Porta padrão 6379',
        'Evolution API — Gateway WhatsApp. Deploy separado, precisa de porta exposta e API key',
      ]} />

      <SectionTitle>Checklist de deploy</SectionTitle>
      <UL items={[
        'Todas as variáveis de ambiente configuradas',
        'Supabase com migrations aplicadas (tabelas criadas)',
        'Redis acessível por API e Worker',
        'Evolution API rodando e acessível',
        'Webhook da Evolution apontando para a URL da API',
        'Domínios com HTTPS configurado',
        'Testar envio de mensagem de ponta a ponta',
      ]} />
    </div>
  );
}

function Problemas() {
  return (
    <div>
      <SectionTitle>Erro 401 - Não autorizado</SectionTitle>
      <P>Este erro indica problema de autenticação. Possíveis causas e soluções:</P>
      <UL items={[
        'Chave de API inválida ou expirada — Verifique se OPENAI_API_KEY ou ANTHROPIC_API_KEY estão corretas',
        'Chave truncada — Ao copiar, certifique-se de copiar a chave COMPLETA (sk-... até o final)',
        'Token JWT expirado — Faça logout e login novamente no dashboard',
        'SUPABASE_SERVICE_ROLE_KEY incorreta — Verifique no painel do Supabase em Settings > API',
        'Evolution API key errada — Confira EVOLUTION_API_KEY no painel da Evolution',
      ]} />

      <SectionTitle>Agente não responde mensagens</SectionTitle>
      <P>O cliente envia mensagem mas não recebe resposta. Verifique:</P>
      <UL items={[
        'Status do agente — Deve estar "active". Verifique no painel de agentes',
        'Worker rodando — Verifique se o serviço Worker está ativo e sem erros nos logs',
        'Redis conectado — Worker e API precisam acessar o mesmo Redis',
        'Webhook configurado — A Evolution API deve enviar webhooks para a URL da API',
        'Instância conectada — Verifique se o WhatsApp está conectado na Evolution API',
        'Fila acumulada — Se o Worker reiniciou, pode haver mensagens na fila aguardando processamento',
      ]} />

      <SectionTitle>Agente não aparece na lista</SectionTitle>
      <P>Você criou um agente mas ele não aparece. Possíveis causas:</P>
      <UL items={[
        'Organização errada — Verifique se está na organização correta (seletor no topo)',
        'Filtro ativo — Remova filtros de busca ou status',
        'Erro na criação — Verifique se não houve erro ao salvar (mensagem vermelha)',
        'Cache do navegador — Tente recarregar a página (Ctrl+Shift+R)',
        'Permissão — Verifique se seu usuário tem permissão na organização',
      ]} />

      <SectionTitle>Respostas da IA truncadas ou incompletas</SectionTitle>
      <UL items={[
        'max_tokens muito baixo — Aumente para 1500-2000 nas configurações do agente',
        'Prompt muito longo — Se o prompt do sistema é muito extenso, sobra menos espaço para a resposta',
        'Modelo com limite baixo — Modelos "mini" têm limites menores. Use gpt-4o ou claude-3-5-sonnet para respostas longas',
      ]} />

      <SectionTitle>Evolution API - WhatsApp desconectado</SectionTitle>
      <UL items={[
        'QR Code expirado — Gere um novo QR Code no painel da Evolution API',
        'Sessão encerrada no celular — Reconecte pelo WhatsApp Web no celular',
        'Múltiplas sessões — O WhatsApp permite apenas uma conexão por vez',
        'Atualização do WhatsApp — Atualize o app no celular e reconecte',
        'Banimento — Se o número foi banido, será necessário usar outro número',
      ]} />

      <SectionTitle>Erro ao salvar fluxo</SectionTitle>
      <UL items={[
        'Blocos desconectados — Todos os blocos devem estar conectados ao fluxo principal',
        'Campos obrigatórios vazios — Verifique se todos os blocos têm seus campos preenchidos',
        'Fluxo muito grande — Divida em sub-fluxos se tiver mais de 50 blocos',
        'Erro de rede — Verifique sua conexão e tente novamente',
        'Sessão expirada — Faça login novamente se o erro persistir',
      ]} />

      <SectionTitle>Performance lenta</SectionTitle>
      <UL items={[
        'Redis sobrecarregado — Verifique uso de memória do Redis, considere limpar filas antigas',
        'Muitas conversas simultâneas — Escale o Worker (adicione mais instâncias)',
        'Modelo de IA lento — gpt-4o é mais lento que gpt-4o-mini. Use mini para respostas simples',
        'Base de conhecimento muito grande — Otimize documentos, remova conteúdo desnecessário',
        'Banco de dados — Verifique se as queries estão otimizadas e índices existem',
      ]} />
    </div>
  );
}

export default function KnowledgeBasePage() {
  const [openTopic, setOpenTopic] = useState<string | null>(null);

  function toggle(id: string) {
    setOpenTopic(openTopic === id ? null : id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Central de Ajuda</h1>
        <p className="text-sm text-gray-500 mt-1">
          Documentação completa da plataforma LeadPilot. Clique em um tópico para expandir.
        </p>
      </div>

      <div className="space-y-3">
        {topics.map((topic) => (
          <Card key={topic.id} className="overflow-hidden">
            <button
              onClick={() => toggle(topic.id)}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{topic.icon}</span>
                <span className="font-medium text-gray-900">{topic.title}</span>
              </div>
              <span className="text-gray-400 text-lg">
                {openTopic === topic.id ? '−' : '+'}
              </span>
            </button>
            {openTopic === topic.id && (
              <CardContent className="border-t border-gray-100 pt-4 pb-5 px-5">
                <TopicContent id={topic.id} />
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
