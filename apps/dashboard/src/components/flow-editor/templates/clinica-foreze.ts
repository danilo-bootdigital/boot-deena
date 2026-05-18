import type { Node, Edge } from 'reactflow';

export const clinicaForezeFlow = {
  id: 'clinica-foreze',
  name: 'Clínica Foreze',
  description: 'Fluxo completo: saudação, identificação, qualificação, agendamento, remarcação, cancelamento, valores, segurança médica e transferência.',
  nodes: [
    // ETAPA 1 — SAUDAÇÃO
    { id: 'saudacao', type: 'message', position: { x: 400, y: 0 }, data: { message: 'Olá, tudo bem? Sou o assistente virtual da clínica. Vou te ajudar com o atendimento inicial e, se necessário, encaminho você para nossa equipe.\n\nPara começarmos, qual é o seu nome?' } },
    { id: 'wait_nome', type: 'wait', position: { x: 400, y: 120 }, data: { label: 'Aguardando nome do paciente' } },
    { id: 'salvar_nome', type: 'set_variable', position: { x: 400, y: 240 }, data: { variable_name: 'nome', value: '{{user_message}}' } },

    // ETAPA 2 — IDENTIFICAÇÃO
    { id: 'perguntar_paciente', type: 'message', position: { x: 400, y: 360 }, data: { message: 'Prazer, {{nome}}! Você já é paciente da clínica ou seria seu primeiro atendimento?' } },
    { id: 'wait_paciente', type: 'wait', position: { x: 400, y: 480 }, data: { label: 'Aguardando se é paciente' } },
    { id: 'salvar_tipo_paciente', type: 'set_variable', position: { x: 400, y: 600 }, data: { variable_name: 'tipo_paciente', value: '{{user_message}}' } },

    // ETAPA 3 — ENTENDER NECESSIDADE
    { id: 'menu_principal', type: 'message', position: { x: 400, y: 720 }, data: { message: 'Qual atendimento você está procurando hoje?\n\n1. Agendar consulta\n2. Remarcar consulta\n3. Cancelar consulta\n4. Tirar dúvida sobre especialidade\n5. Saber valores\n6. Falar com atendente\n7. Retorno médico\n8. Enviar exames ou documentos' } },
    { id: 'wait_menu', type: 'wait', position: { x: 400, y: 840 }, data: { label: 'Aguardando escolha do menu' } },
    { id: 'salvar_opcao', type: 'set_variable', position: { x: 400, y: 960 }, data: { variable_name: 'opcao_menu', value: '{{user_message}}' } },

    // ROTEAMENTO PRINCIPAL
    { id: 'check_agendar', type: 'condition', position: { x: 100, y: 1100 }, data: { label: 'Quer agendar?', field: 'user_message', operator: 'contains', value: 'agendar,1,consulta' } },
    { id: 'check_remarcar', type: 'condition', position: { x: 400, y: 1100 }, data: { label: 'Quer remarcar?', field: 'user_message', operator: 'contains', value: 'remarcar,2' } },
    { id: 'check_cancelar', type: 'condition', position: { x: 700, y: 1100 }, data: { label: 'Quer cancelar?', field: 'user_message', operator: 'contains', value: 'cancelar,3' } },
    { id: 'check_valores', type: 'condition', position: { x: 1000, y: 1100 }, data: { label: 'Quer valores?', field: 'user_message', operator: 'contains', value: 'valores,5,preço,valor' } },
    { id: 'check_atendente', type: 'condition', position: { x: 1300, y: 1100 }, data: { label: 'Quer atendente?', field: 'user_message', operator: 'contains', value: 'atendente,6,humano' } },

    // ETAPA 4 — QUALIFICAÇÃO (AGENDAR)
    { id: 'qualificacao_especialidade', type: 'message', position: { x: -100, y: 1300 }, data: { message: 'Qual especialidade você procura?' } },
    { id: 'wait_especialidade', type: 'wait', position: { x: -100, y: 1420 }, data: { label: 'Aguardando especialidade' } },
    { id: 'salvar_especialidade', type: 'set_variable', position: { x: -100, y: 1540 }, data: { variable_name: 'especialidade', value: '{{user_message}}' } },
    { id: 'qualificacao_motivo', type: 'message', position: { x: -100, y: 1660 }, data: { message: 'Qual é o principal motivo da consulta?' } },
    { id: 'wait_motivo', type: 'wait', position: { x: -100, y: 1780 }, data: { label: 'Aguardando motivo' } },
    { id: 'salvar_motivo', type: 'set_variable', position: { x: -100, y: 1900 }, data: { variable_name: 'motivo_consulta', value: '{{user_message}}' } },

    // ETAPA 5 — SEGURANÇA MÉDICA
    { id: 'check_urgencia', type: 'condition', position: { x: -100, y: 2020 }, data: { label: 'Sintoma grave?', field: 'motivo_consulta', operator: 'contains', value: 'dor no peito,falta de ar,desmaio,sangramento,convulsão,AVC,confusão mental' } },
    { id: 'msg_urgencia', type: 'message', position: { x: 150, y: 2140 }, data: { message: 'Entendi. Como isso pode exigir avaliação imediata, recomendamos procurar atendimento presencial ou serviço de urgência/emergência mais próximo. Posso também encaminhar sua mensagem para nossa equipe verificar o quanto antes.' } },
    { id: 'handoff_urgencia', type: 'handoff', position: { x: 150, y: 2260 }, data: { reason: 'Paciente relatou sintoma grave/urgente' } },

    // ETAPA 6 — CONVÊNIO E PREFERÊNCIA
    { id: 'perguntar_convenio', type: 'message', position: { x: -100, y: 2140 }, data: { message: 'Possui convênio ou será particular?' } },
    { id: 'wait_convenio', type: 'wait', position: { x: -100, y: 2260 }, data: { label: 'Aguardando convênio' } },
    { id: 'salvar_convenio', type: 'set_variable', position: { x: -100, y: 2380 }, data: { variable_name: 'convenio', value: '{{user_message}}' } },
    { id: 'perguntar_periodo', type: 'message', position: { x: -100, y: 2500 }, data: { message: 'Você prefere atendimento em qual período?\n\n1. Manhã\n2. Tarde\n3. Noite\n4. Primeiro horário disponível' } },
    { id: 'wait_periodo', type: 'wait', position: { x: -100, y: 2620 }, data: { label: 'Aguardando período' } },
    { id: 'salvar_periodo', type: 'set_variable', position: { x: -100, y: 2740 }, data: { variable_name: 'periodo', value: '{{user_message}}' } },

    // ETAPA 7 — OFERECER HORÁRIOS
    { id: 'oferecer_horarios', type: 'message', position: { x: -100, y: 2860 }, data: { message: 'Temos estes horários disponíveis:\n\n1. Segunda-feira às 09h\n2. Terça-feira às 14h\n3. Quinta-feira às 16h\n\nQual deles fica melhor para você?' } },
    { id: 'wait_horario', type: 'wait', position: { x: -100, y: 2980 }, data: { label: 'Aguardando escolha de horário' } },
    { id: 'salvar_horario', type: 'set_variable', position: { x: -100, y: 3100 }, data: { variable_name: 'horario_escolhido', value: '{{user_message}}' } },

    // ETAPA 8 — CONFIRMAÇÃO
    { id: 'confirmar_dados', type: 'message', position: { x: -100, y: 3220 }, data: { message: 'Perfeito. Vou confirmar os dados:\n\nNome: {{nome}}\nEspecialidade: {{especialidade}}\nData/Horário: {{horario_escolhido}}\nConvênio: {{convenio}}\n\nEstá tudo correto?' } },
    { id: 'wait_confirmacao', type: 'wait', position: { x: -100, y: 3340 }, data: { label: 'Aguardando confirmação' } },
    { id: 'check_confirmou', type: 'condition', position: { x: -100, y: 3460 }, data: { label: 'Confirmou?', field: 'user_message', operator: 'contains', value: 'sim,correto,confirmo,isso' } },

    // ETAPA 9 — AGENDAMENTO CONFIRMADO
    { id: 'agendamento_ok', type: 'message', position: { x: -250, y: 3600 }, data: { message: 'Pronto, sua consulta foi agendada com sucesso!\n\nPor favor, chegue com alguns minutos de antecedência e leve documento com foto, carteirinha do convênio (se houver) e exames anteriores (se tiver).\n\nPosso ajudar com mais alguma coisa?' } },
    { id: 'salvar_status_agendado', type: 'set_variable', position: { x: -250, y: 3720 }, data: { variable_name: 'status', value: 'agendado' } },

    // ETAPA 10 — REMARCAÇÃO
    { id: 'remarcar_msg', type: 'message', position: { x: 400, y: 1300 }, data: { message: 'Claro. Informe, por favor, o nome completo e a data da consulta atual para eu localizar seu agendamento.' } },
    { id: 'wait_remarcar', type: 'wait', position: { x: 400, y: 1420 }, data: { label: 'Aguardando dados para remarcação' } },
    { id: 'remarcar_periodo', type: 'message', position: { x: 400, y: 1540 }, data: { message: 'Encontrei seu agendamento. Você prefere remarcar para qual período?\n\n1. Manhã\n2. Tarde\n3. Noite\n4. Primeiro disponível' } },
    { id: 'wait_remarcar_periodo', type: 'wait', position: { x: 400, y: 1660 }, data: { label: 'Aguardando novo período' } },
    { id: 'remarcar_confirmado', type: 'message', position: { x: 400, y: 1780 }, data: { message: 'Consulta remarcada com sucesso! Você receberá a confirmação em breve. Posso ajudar com mais alguma coisa?' } },
    { id: 'salvar_status_remarcado', type: 'set_variable', position: { x: 400, y: 1900 }, data: { variable_name: 'status', value: 'remarcado' } },

    // ETAPA 11 — CANCELAMENTO
    { id: 'cancelar_msg', type: 'message', position: { x: 700, y: 1300 }, data: { message: 'Tudo bem. Para cancelar com segurança, informe seu nome completo e a data da consulta.' } },
    { id: 'wait_cancelar', type: 'wait', position: { x: 700, y: 1420 }, data: { label: 'Aguardando dados para cancelamento' } },
    { id: 'cancelar_confirmado', type: 'message', position: { x: 700, y: 1540 }, data: { message: 'Consulta cancelada. Caso deseje, posso te ajudar a escolher uma nova data. É só me avisar!' } },
    { id: 'salvar_status_cancelado', type: 'set_variable', position: { x: 700, y: 1660 }, data: { variable_name: 'status', value: 'cancelado' } },

    // ETAPA 12 — VALORES
    { id: 'valores_msg', type: 'message', position: { x: 1000, y: 1300 }, data: { message: 'Os valores podem variar conforme especialidade, médico, convênio e tipo de atendimento. Posso verificar a melhor opção para você.\n\nQual especialidade você procura e o atendimento seria particular ou por convênio?' } },
    { id: 'wait_valores', type: 'wait', position: { x: 1000, y: 1420 }, data: { label: 'Aguardando detalhes para valores' } },
    { id: 'valores_encaminhar', type: 'message', position: { x: 1000, y: 1540 }, data: { message: 'Vou verificar os valores disponíveis e encaminhar para nossa equipe te retornar com as informações. Um momento!' } },
    { id: 'handoff_valores', type: 'handoff', position: { x: 1000, y: 1660 }, data: { reason: 'Paciente solicitou informações de valores' } },

    // ETAPA 14 — TRANSFERIR PARA HUMANO
    { id: 'transferir_msg', type: 'message', position: { x: 1300, y: 1300 }, data: { message: 'Vou encaminhar sua conversa para nossa equipe dar continuidade com mais segurança. Aguarde um momento, por favor.' } },
    { id: 'handoff_atendente', type: 'handoff', position: { x: 1300, y: 1420 }, data: { reason: 'Paciente solicitou atendente humano' } },

    // NÓ DE CORREÇÃO (se não confirmou dados)
    { id: 'corrigir_dados', type: 'message', position: { x: 50, y: 3600 }, data: { message: 'Sem problema! Me diga o que precisa ser corrigido e vou ajustar.' } },
    { id: 'wait_correcao', type: 'wait', position: { x: 50, y: 3720 }, data: { label: 'Aguardando correção' } },
  ] as Node[],

  edges: [
    // Fluxo principal: Saudação -> Identificação -> Menu
    { id: 'e1', source: 'saudacao', target: 'wait_nome', animated: true },
    { id: 'e2', source: 'wait_nome', target: 'salvar_nome', animated: true },
    { id: 'e3', source: 'salvar_nome', target: 'perguntar_paciente', animated: true },
    { id: 'e4', source: 'perguntar_paciente', target: 'wait_paciente', animated: true },
    { id: 'e5', source: 'wait_paciente', target: 'salvar_tipo_paciente', animated: true },
    { id: 'e6', source: 'salvar_tipo_paciente', target: 'menu_principal', animated: true },
    { id: 'e7', source: 'menu_principal', target: 'wait_menu', animated: true },
    { id: 'e8', source: 'wait_menu', target: 'salvar_opcao', animated: true },

    // Roteamento do menu
    { id: 'e9', source: 'salvar_opcao', target: 'check_agendar', animated: true },
    { id: 'e10', source: 'check_agendar', target: 'qualificacao_especialidade', sourceHandle: 'true', animated: true },
    { id: 'e11', source: 'check_agendar', target: 'check_remarcar', sourceHandle: 'false', animated: true },
    { id: 'e12', source: 'check_remarcar', target: 'remarcar_msg', sourceHandle: 'true', animated: true },
    { id: 'e13', source: 'check_remarcar', target: 'check_cancelar', sourceHandle: 'false', animated: true },
    { id: 'e14', source: 'check_cancelar', target: 'cancelar_msg', sourceHandle: 'true', animated: true },
    { id: 'e15', source: 'check_cancelar', target: 'check_valores', sourceHandle: 'false', animated: true },
    { id: 'e16', source: 'check_valores', target: 'valores_msg', sourceHandle: 'true', animated: true },
    { id: 'e17', source: 'check_valores', target: 'check_atendente', sourceHandle: 'false', animated: true },
    { id: 'e18', source: 'check_atendente', target: 'transferir_msg', sourceHandle: 'true', animated: true },

    // Fluxo de agendamento
    { id: 'e20', source: 'qualificacao_especialidade', target: 'wait_especialidade', animated: true },
    { id: 'e21', source: 'wait_especialidade', target: 'salvar_especialidade', animated: true },
    { id: 'e22', source: 'salvar_especialidade', target: 'qualificacao_motivo', animated: true },
    { id: 'e23', source: 'qualificacao_motivo', target: 'wait_motivo', animated: true },
    { id: 'e24', source: 'wait_motivo', target: 'salvar_motivo', animated: true },
    { id: 'e25', source: 'salvar_motivo', target: 'check_urgencia', animated: true },
    { id: 'e26', source: 'check_urgencia', target: 'msg_urgencia', sourceHandle: 'true', animated: true },
    { id: 'e27', source: 'msg_urgencia', target: 'handoff_urgencia', animated: true },
    { id: 'e28', source: 'check_urgencia', target: 'perguntar_convenio', sourceHandle: 'false', animated: true },
    { id: 'e29', source: 'perguntar_convenio', target: 'wait_convenio', animated: true },
    { id: 'e30', source: 'wait_convenio', target: 'salvar_convenio', animated: true },
    { id: 'e31', source: 'salvar_convenio', target: 'perguntar_periodo', animated: true },
    { id: 'e32', source: 'perguntar_periodo', target: 'wait_periodo', animated: true },
    { id: 'e33', source: 'wait_periodo', target: 'salvar_periodo', animated: true },
    { id: 'e34', source: 'salvar_periodo', target: 'oferecer_horarios', animated: true },
    { id: 'e35', source: 'oferecer_horarios', target: 'wait_horario', animated: true },
    { id: 'e36', source: 'wait_horario', target: 'salvar_horario', animated: true },
    { id: 'e37', source: 'salvar_horario', target: 'confirmar_dados', animated: true },
    { id: 'e38', source: 'confirmar_dados', target: 'wait_confirmacao', animated: true },
    { id: 'e39', source: 'wait_confirmacao', target: 'check_confirmou', animated: true },
    { id: 'e40', source: 'check_confirmou', target: 'agendamento_ok', sourceHandle: 'true', animated: true },
    { id: 'e41', source: 'agendamento_ok', target: 'salvar_status_agendado', animated: true },
    { id: 'e42', source: 'check_confirmou', target: 'corrigir_dados', sourceHandle: 'false', animated: true },
    { id: 'e43', source: 'corrigir_dados', target: 'wait_correcao', animated: true },
    { id: 'e44', source: 'wait_correcao', target: 'confirmar_dados', animated: true },

    // Fluxo de remarcacao
    { id: 'e50', source: 'remarcar_msg', target: 'wait_remarcar', animated: true },
    { id: 'e51', source: 'wait_remarcar', target: 'remarcar_periodo', animated: true },
    { id: 'e52', source: 'remarcar_periodo', target: 'wait_remarcar_periodo', animated: true },
    { id: 'e53', source: 'wait_remarcar_periodo', target: 'remarcar_confirmado', animated: true },
    { id: 'e54', source: 'remarcar_confirmado', target: 'salvar_status_remarcado', animated: true },

    // Fluxo de cancelamento
    { id: 'e60', source: 'cancelar_msg', target: 'wait_cancelar', animated: true },
    { id: 'e61', source: 'wait_cancelar', target: 'cancelar_confirmado', animated: true },
    { id: 'e62', source: 'cancelar_confirmado', target: 'salvar_status_cancelado', animated: true },

    // Fluxo de valores
    { id: 'e70', source: 'valores_msg', target: 'wait_valores', animated: true },
    { id: 'e71', source: 'wait_valores', target: 'valores_encaminhar', animated: true },
    { id: 'e72', source: 'valores_encaminhar', target: 'handoff_valores', animated: true },

    // Transferencia
    { id: 'e80', source: 'transferir_msg', target: 'handoff_atendente', animated: true },
  ] as Edge[],
};
