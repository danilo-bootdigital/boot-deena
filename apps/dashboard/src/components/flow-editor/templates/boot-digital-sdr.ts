import type { Node, Edge } from 'reactflow';

export const bootDigitalSDRFlow: { nodes: Node[]; edges: Edge[] } = {
  nodes: [
    // Saudação inicial
    { id: 'sdr_1', type: 'message', position: { x: 250, y: 0 }, data: { message: 'Olá, tudo bem? Seja bem-vindo à Boot Digital. Vou entender um pouco do seu cenário para direcionar a melhor solução para o seu negócio. Para começar, qual é o seu nome?' } },
    { id: 'sdr_2', type: 'wait', position: { x: 250, y: 100 }, data: { label: 'Aguardando nome' } },
    { id: 'sdr_3', type: 'set_variable', position: { x: 250, y: 200 }, data: { variable_name: 'nome', value: '{{user_message}}' } },

    // Identificação do negócio
    { id: 'sdr_4', type: 'message', position: { x: 250, y: 300 }, data: { message: 'Prazer, {{nome}}! Me conta: qual é o seu negócio e como você vende hoje?' } },
    { id: 'sdr_5', type: 'wait', position: { x: 250, y: 400 }, data: { label: 'Aguardando descrição do negócio' } },
    { id: 'sdr_6', type: 'set_variable', position: { x: 250, y: 500 }, data: { variable_name: 'negocio', value: '{{user_message}}' } },

    // Identificar presença digital
    { id: 'sdr_7', type: 'message', position: { x: 250, y: 600 }, data: { message: 'Entendi. E hoje vocês já possuem site, landing page ou alguma presença digital estruturada?' } },
    { id: 'sdr_8', type: 'wait', position: { x: 250, y: 700 }, data: { label: 'Aguardando resposta sobre presença digital' } },
    { id: 'sdr_9', type: 'set_variable', position: { x: 250, y: 800 }, data: { variable_name: 'presenca_digital', value: '{{user_message}}' } },

    // Identificar dor principal
    { id: 'sdr_10', type: 'message', position: { x: 250, y: 900 }, data: { message: 'E qual é a principal dificuldade que vocês enfrentam hoje no digital? Pode ser falta de leads, baixa conversão, site desatualizado, anúncios sem resultado...' } },
    { id: 'sdr_11', type: 'wait', position: { x: 250, y: 1000 }, data: { label: 'Aguardando dor principal' } },
    { id: 'sdr_12', type: 'set_variable', position: { x: 250, y: 1100 }, data: { variable_name: 'dor_principal', value: '{{user_message}}' } },

    // Objetivo
    { id: 'sdr_13', type: 'message', position: { x: 250, y: 1200 }, data: { message: 'O que você mais gostaria de melhorar hoje no digital da sua empresa?' } },
    { id: 'sdr_14', type: 'wait', position: { x: 250, y: 1300 }, data: { label: 'Aguardando objetivo' } },
    { id: 'sdr_15', type: 'set_variable', position: { x: 250, y: 1400 }, data: { variable_name: 'objetivo', value: '{{user_message}}' } },

    // Classificação e direcionamento
    { id: 'sdr_16', type: 'condition', position: { x: 250, y: 1500 }, data: { label: 'Lead demonstra urgência?', field: 'user_message', operator: 'contains', value: 'urgente|rápido|agora|preciso|orçamento|reunião|começar' } },

    // Lead quente → reunião
    { id: 'sdr_17', type: 'message', position: { x: 500, y: 1650 }, data: { message: 'Pelo cenário que você me explicou, acredito que faz sentido uma conversa mais estratégica para analisarmos a melhor estrutura para sua empresa. Posso agendar uma reunião com nosso time?' } },
    { id: 'sdr_18', type: 'wait', position: { x: 500, y: 1750 }, data: { label: 'Aguardando confirmação de reunião' } },
    { id: 'sdr_19', type: 'set_variable', position: { x: 500, y: 1850 }, data: { variable_name: 'estagio_lead', value: 'quente' } },
    { id: 'sdr_20', type: 'message', position: { x: 500, y: 1950 }, data: { message: 'Perfeito! Para eu organizar tudo, me passa:\n- Seu e-mail\n- Melhor horário para a reunião\n- Instagram ou site atual (se tiver)' } },
    { id: 'sdr_21', type: 'wait', position: { x: 500, y: 2050 }, data: { label: 'Aguardando dados para reunião' } },
    { id: 'sdr_22', type: 'set_variable', position: { x: 500, y: 2150 }, data: { variable_name: 'briefing', value: '{{user_message}}' } },
    { id: 'sdr_23', type: 'message', position: { x: 500, y: 2250 }, data: { message: 'Anotado! Vou organizar com o time e te retorno com a confirmação. Enquanto isso, se tiver qualquer dúvida, pode mandar aqui. Obrigado pela confiança, {{nome}}!' } },

    // Lead morno → nutrir
    { id: 'sdr_24', type: 'message', position: { x: 0, y: 1650 }, data: { message: 'Entendi seu cenário, {{nome}}. A Boot Digital trabalha justamente com estruturação digital completa — desde posicionamento até conversão. Posso te enviar um material sobre como empresas do seu segmento estão crescendo com estrutura digital?' } },
    { id: 'sdr_25', type: 'wait', position: { x: 0, y: 1750 }, data: { label: 'Aguardando interesse' } },
    { id: 'sdr_26', type: 'set_variable', position: { x: 0, y: 1850 }, data: { variable_name: 'estagio_lead', value: 'morno' } },

    // Follow-ups automáticos
    { id: 'sdr_27', type: 'schedule_message', position: { x: 0, y: 1950 }, data: { delay_minutes: 60, message_type: 'follow_up_1h', message: 'Passando para confirmar se ainda deseja seguir com a análise para sua empresa.' } },
    { id: 'sdr_28', type: 'schedule_message', position: { x: 0, y: 2050 }, data: { delay_minutes: 1440, message_type: 'follow_up_24h', message: 'Fico à disposição caso queira retomar a conversa e entender as possibilidades para o seu negócio.' } },
    { id: 'sdr_29', type: 'schedule_message', position: { x: 0, y: 2150 }, data: { delay_minutes: 4320, message_type: 'follow_up_3d', message: 'Vou encerrar o atendimento por enquanto, mas quando quiser retomar, será um prazer ajudar.' } },

    // Handoff humano
    { id: 'sdr_30', type: 'condition', position: { x: 250, y: 2400 }, data: { label: 'Quer falar com humano?', field: 'user_message', operator: 'contains', value: 'humano|pessoa|atendente|gerente' } },
    { id: 'sdr_31', type: 'handoff', position: { x: 500, y: 2550 }, data: { reason: 'Lead solicitou atendimento humano' } },
  ],
  edges: [
    { id: 'e1', source: 'sdr_1', target: 'sdr_2', animated: true },
    { id: 'e2', source: 'sdr_2', target: 'sdr_3', animated: true },
    { id: 'e3', source: 'sdr_3', target: 'sdr_4', animated: true },
    { id: 'e4', source: 'sdr_4', target: 'sdr_5', animated: true },
    { id: 'e5', source: 'sdr_5', target: 'sdr_6', animated: true },
    { id: 'e6', source: 'sdr_6', target: 'sdr_7', animated: true },
    { id: 'e7', source: 'sdr_7', target: 'sdr_8', animated: true },
    { id: 'e8', source: 'sdr_8', target: 'sdr_9', animated: true },
    { id: 'e9', source: 'sdr_9', target: 'sdr_10', animated: true },
    { id: 'e10', source: 'sdr_10', target: 'sdr_11', animated: true },
    { id: 'e11', source: 'sdr_11', target: 'sdr_12', animated: true },
    { id: 'e12', source: 'sdr_12', target: 'sdr_13', animated: true },
    { id: 'e13', source: 'sdr_13', target: 'sdr_14', animated: true },
    { id: 'e14', source: 'sdr_14', target: 'sdr_15', animated: true },
    { id: 'e15', source: 'sdr_15', target: 'sdr_16', animated: true },
    // Lead quente
    { id: 'e16', source: 'sdr_16', target: 'sdr_17', animated: true, label: 'Sim' },
    { id: 'e17', source: 'sdr_17', target: 'sdr_18', animated: true },
    { id: 'e18', source: 'sdr_18', target: 'sdr_19', animated: true },
    { id: 'e19', source: 'sdr_19', target: 'sdr_20', animated: true },
    { id: 'e20', source: 'sdr_20', target: 'sdr_21', animated: true },
    { id: 'e21', source: 'sdr_21', target: 'sdr_22', animated: true },
    { id: 'e22', source: 'sdr_22', target: 'sdr_23', animated: true },
    // Lead morno
    { id: 'e23', source: 'sdr_16', target: 'sdr_24', animated: true, label: 'Não' },
    { id: 'e24', source: 'sdr_24', target: 'sdr_25', animated: true },
    { id: 'e25', source: 'sdr_25', target: 'sdr_26', animated: true },
    { id: 'e26', source: 'sdr_26', target: 'sdr_27', animated: true },
    { id: 'e27', source: 'sdr_27', target: 'sdr_28', animated: true },
    { id: 'e28', source: 'sdr_28', target: 'sdr_29', animated: true },
    // Handoff
    { id: 'e29', source: 'sdr_23', target: 'sdr_30', animated: true },
    { id: 'e30', source: 'sdr_30', target: 'sdr_31', animated: true, label: 'Sim' },
  ],
};
