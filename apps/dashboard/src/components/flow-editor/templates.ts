import type { Node, Edge } from 'reactflow';
import { clinicaForezeFlow } from './templates/clinica-foreze';

interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
}

export const flowTemplates: FlowTemplate[] = [
  {
    id: 'clinica-medica',
    name: 'Clínica Médica',
    description: 'Atendimento para clínicas: saudação, identificação, agendamento e transferência.',
    nodes: [
      { id: 'n1', type: 'message', position: { x: 250, y: 0 }, data: { message: 'Olá, tudo bem? Sou o assistente virtual da clínica. Vou te ajudar com o atendimento inicial. Para começarmos, qual é o seu nome?' } },
      { id: 'n2', type: 'wait', position: { x: 250, y: 120 }, data: { label: 'Aguardando nome do paciente' } },
      { id: 'n3', type: 'set_variable', position: { x: 250, y: 240 }, data: { variable_name: 'nome', value: '' } },
      { id: 'n4', type: 'message', position: { x: 250, y: 360 }, data: { message: 'Prazer, {{nome}}! Você já é paciente da clínica ou seria seu primeiro atendimento?' } },
      { id: 'n5', type: 'wait', position: { x: 250, y: 480 }, data: { label: 'Aguardando resposta' } },
      { id: 'n6', type: 'message', position: { x: 250, y: 600 }, data: { message: 'Qual atendimento você está procurando hoje?\n1. Agendar consulta\n2. Remarcar consulta\n3. Cancelar consulta\n4. Saber valores\n5. Falar com atendente' } },
      { id: 'n7', type: 'wait', position: { x: 250, y: 720 }, data: { label: 'Aguardando escolha' } },
      { id: 'n8', type: 'condition', position: { x: 250, y: 840 }, data: { label: 'Quer falar com atendente?', field: 'user_message', operator: 'contains', value: 'atendente' } },
      { id: 'n9', type: 'handoff', position: { x: 450, y: 960 }, data: { reason: 'Paciente solicitou atendente humano' } },
      { id: 'n10', type: 'message', position: { x: 100, y: 960 }, data: { message: 'Qual especialidade você procura?' } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', animated: true },
      { id: 'e2', source: 'n2', target: 'n3', animated: true },
      { id: 'e3', source: 'n3', target: 'n4', animated: true },
      { id: 'e4', source: 'n4', target: 'n5', animated: true },
      { id: 'e5', source: 'n5', target: 'n6', animated: true },
      { id: 'e6', source: 'n6', target: 'n7', animated: true },
      { id: 'e7', source: 'n7', target: 'n8', animated: true },
      { id: 'e8', source: 'n8', target: 'n9', sourceHandle: 'true', animated: true },
      { id: 'e9', source: 'n8', target: 'n10', sourceHandle: 'false', animated: true },
    ],
  },
  {
    id: 'imobiliaria',
    name: 'Imobiliária',
    description: 'Atendimento para imobiliárias: qualificação de lead, tipo de imóvel e agendamento de visita.',
    nodes: [
      { id: 'n1', type: 'message', position: { x: 250, y: 0 }, data: { message: 'Olá! Sou o assistente virtual da imobiliária. Como posso te ajudar hoje?' } },
      { id: 'n2', type: 'wait', position: { x: 250, y: 120 }, data: { label: 'Aguardando resposta' } },
      { id: 'n3', type: 'condition', position: { x: 250, y: 240 }, data: { label: 'Quer comprar ou alugar?', field: 'user_message', operator: 'contains', value: 'comprar' } },
      { id: 'n4', type: 'message', position: { x: 100, y: 380 }, data: { message: 'Ótimo! Qual tipo de imóvel você procura?\n1. Apartamento\n2. Casa\n3. Terreno\n4. Comercial' } },
      { id: 'n5', type: 'message', position: { x: 400, y: 380 }, data: { message: 'Certo! Para aluguel, qual região você prefere e qual seu orçamento mensal?' } },
      { id: 'n6', type: 'wait', position: { x: 250, y: 500 }, data: { label: 'Aguardando detalhes' } },
      { id: 'n7', type: 'message', position: { x: 250, y: 620 }, data: { message: 'Perfeito! Posso agendar uma visita para você conhecer as opções. Qual dia e horário ficam melhores?' } },
      { id: 'n8', type: 'wait', position: { x: 250, y: 740 }, data: { label: 'Aguardando horário' } },
      { id: 'n9', type: 'message', position: { x: 250, y: 860 }, data: { message: 'Anotado! Um corretor entrará em contato para confirmar. Precisa de mais alguma coisa?' } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', animated: true },
      { id: 'e2', source: 'n2', target: 'n3', animated: true },
      { id: 'e3', source: 'n3', target: 'n4', sourceHandle: 'true', animated: true },
      { id: 'e4', source: 'n3', target: 'n5', sourceHandle: 'false', animated: true },
      { id: 'e5', source: 'n4', target: 'n6', animated: true },
      { id: 'e6', source: 'n5', target: 'n6', animated: true },
      { id: 'e7', source: 'n6', target: 'n7', animated: true },
      { id: 'e8', source: 'n7', target: 'n8', animated: true },
      { id: 'e9', source: 'n8', target: 'n9', animated: true },
    ],
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Atendimento para lojas online: status de pedido, trocas, dúvidas e suporte.',
    nodes: [
      { id: 'n1', type: 'message', position: { x: 250, y: 0 }, data: { message: 'Olá! Sou o assistente da loja. Como posso te ajudar?\n1. Rastrear pedido\n2. Trocar ou devolver\n3. Dúvida sobre produto\n4. Falar com atendente' } },
      { id: 'n2', type: 'wait', position: { x: 250, y: 140 }, data: { label: 'Aguardando escolha' } },
      { id: 'n3', type: 'condition', position: { x: 250, y: 260 }, data: { label: 'Quer rastrear?', field: 'user_message', operator: 'contains', value: 'rastrear' } },
      { id: 'n4', type: 'message', position: { x: 80, y: 400 }, data: { message: 'Me informe o número do seu pedido, por favor.' } },
      { id: 'n5', type: 'condition', position: { x: 420, y: 400 }, data: { label: 'Quer trocar?', field: 'user_message', operator: 'contains', value: 'trocar' } },
      { id: 'n6', type: 'message', position: { x: 300, y: 540 }, data: { message: 'Para iniciar a troca, me informe o número do pedido e o motivo.' } },
      { id: 'n7', type: 'handoff', position: { x: 540, y: 540 }, data: { reason: 'Atendimento que requer humano' } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', animated: true },
      { id: 'e2', source: 'n2', target: 'n3', animated: true },
      { id: 'e3', source: 'n3', target: 'n4', sourceHandle: 'true', animated: true },
      { id: 'e4', source: 'n3', target: 'n5', sourceHandle: 'false', animated: true },
      { id: 'e5', source: 'n5', target: 'n6', sourceHandle: 'true', animated: true },
      { id: 'e6', source: 'n5', target: 'n7', sourceHandle: 'false', animated: true },
    ],
  },
  clinicaForezeFlow,
];
