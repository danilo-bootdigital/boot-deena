'use client';

import { Input, Textarea } from '@/components/ui/input';
import type { Node } from 'reactflow';

interface NodeEditorPanelProps {
  node: Node | null;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

export function NodeEditorPanel({ node, onUpdate, onClose }: NodeEditorPanelProps) {
  if (!node) return null;

  const updateData = (key: string, value: unknown) => {
    onUpdate(node.id, { ...node.data, [key]: value });
  };

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-50 overflow-y-auto">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-medium text-gray-900 text-sm">Editar Nó</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
      </div>
      <div className="p-4 space-y-4">
        {node.type === 'message' && (
          <Textarea
            label="Mensagem"
            value={node.data.message || ''}
            onChange={(e) => updateData('message', e.target.value)}
            rows={6}
            placeholder="Digite a mensagem que o agente vai enviar..."
          />
        )}

        {node.type === 'condition' && (
          <>
            <Input
              label="Descrição da condição"
              value={node.data.label || ''}
              onChange={(e) => updateData('label', e.target.value)}
              placeholder="Ex: Se o paciente é novo"
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Campo</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={node.data.field || 'user_message'}
                onChange={(e) => updateData('field', e.target.value)}
              >
                <option value="user_message">Mensagem do usuário</option>
                <option value="nome">Nome</option>
                <option value="telefone">Telefone</option>
                <option value="especialidade">Especialidade</option>
                <option value="convenio">Convênio</option>
                <option value="status_paciente">Status do paciente</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Operador</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={node.data.operator || 'contains'}
                onChange={(e) => updateData('operator', e.target.value)}
              >
                <option value="contains">Contém</option>
                <option value="equals">Igual a</option>
                <option value="not_empty">Não está vazio</option>
                <option value="greater_than">Maior que</option>
                <option value="less_than">Menor que</option>
              </select>
            </div>
            <Input
              label="Valor"
              value={node.data.value || ''}
              onChange={(e) => updateData('value', e.target.value)}
              placeholder="Valor para comparar"
            />
            <div className="text-xs text-gray-400 space-y-1">
              <p>🟢 Saída verde = condição verdadeira</p>
              <p>🔴 Saída vermelha = condição falsa</p>
            </div>
          </>
        )}

        {node.type === 'handoff' && (
          <Textarea
            label="Motivo da transferência"
            value={node.data.reason || ''}
            onChange={(e) => updateData('reason', e.target.value)}
            rows={3}
            placeholder="Ex: Paciente solicitou atendente humano"
          />
        )}

        {node.type === 'wait' && (
          <Input
            label="Descrição"
            value={node.data.label || ''}
            onChange={(e) => updateData('label', e.target.value)}
            placeholder="Ex: Aguardando resposta do paciente"
          />
        )}

        {node.type === 'tool_call' && (
          <>
            <Input
              label="Nome da ação"
              value={node.data.label || ''}
              onChange={(e) => updateData('label', e.target.value)}
              placeholder="Ex: Verificar agenda"
            />
            <Input
              label="URL do endpoint (opcional)"
              value={node.data.endpoint_url || ''}
              onChange={(e) => updateData('endpoint_url', e.target.value)}
              placeholder="https://api.exemplo.com/..."
            />
          </>
        )}

        {node.type === 'set_variable' && (
          <>
            <Input
              label="Nome da variável"
              value={node.data.variable_name || ''}
              onChange={(e) => updateData('variable_name', e.target.value)}
              placeholder="Ex: nome, telefone, especialidade"
            />
            <Input
              label="Valor (ou deixe vazio para capturar da resposta)"
              value={node.data.value || ''}
              onChange={(e) => updateData('value', e.target.value)}
              placeholder="Valor fixo ou vazio"
            />
          </>
        )}
      </div>
    </div>
  );
}
