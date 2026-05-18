'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';

const baseStyle = 'px-4 py-3 rounded-lg border-2 shadow-sm min-w-[200px]';

export const MessageNode = memo(({ data, selected }: NodeProps) => (
  <div className={`${baseStyle} bg-blue-50 ${selected ? 'border-blue-500' : 'border-blue-200'}`}>
    <Handle type="target" position={Position.Top} className="!bg-blue-500" />
    <div className="flex items-center gap-2 mb-1">
      <span className="text-blue-600 text-lg">💬</span>
      <span className="text-xs font-semibold text-blue-700 uppercase">Mensagem</span>
    </div>
    <p className="text-sm text-gray-700 line-clamp-3">{data.message || 'Clique para editar...'}</p>
    <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
  </div>
));
MessageNode.displayName = 'MessageNode';

export const ConditionNode = memo(({ data, selected }: NodeProps) => (
  <div className={`${baseStyle} bg-yellow-50 ${selected ? 'border-yellow-500' : 'border-yellow-200'}`}>
    <Handle type="target" position={Position.Top} className="!bg-yellow-500" />
    <div className="flex items-center gap-2 mb-1">
      <span className="text-yellow-600 text-lg">⚡</span>
      <span className="text-xs font-semibold text-yellow-700 uppercase">Condição</span>
    </div>
    <p className="text-sm text-gray-700">{data.label || 'Se...'}</p>
    <Handle type="source" position={Position.Bottom} id="true" className="!bg-green-500" style={{ left: '30%' }} />
    <Handle type="source" position={Position.Bottom} id="false" className="!bg-red-500" style={{ left: '70%' }} />
  </div>
));
ConditionNode.displayName = 'ConditionNode';

export const HandoffNode = memo(({ data, selected }: NodeProps) => (
  <div className={`${baseStyle} bg-red-50 ${selected ? 'border-red-500' : 'border-red-200'}`}>
    <Handle type="target" position={Position.Top} className="!bg-red-500" />
    <div className="flex items-center gap-2 mb-1">
      <span className="text-red-600 text-lg">🙋</span>
      <span className="text-xs font-semibold text-red-700 uppercase">Transferir p/ Humano</span>
    </div>
    <p className="text-sm text-gray-700">{data.reason || 'Motivo da transferência...'}</p>
  </div>
));
HandoffNode.displayName = 'HandoffNode';

export const WaitNode = memo(({ data, selected }: NodeProps) => (
  <div className={`${baseStyle} bg-purple-50 ${selected ? 'border-purple-500' : 'border-purple-200'}`}>
    <Handle type="target" position={Position.Top} className="!bg-purple-500" />
    <div className="flex items-center gap-2 mb-1">
      <span className="text-purple-600 text-lg">⏳</span>
      <span className="text-xs font-semibold text-purple-700 uppercase">Aguardar Resposta</span>
    </div>
    <p className="text-sm text-gray-700">{data.label || 'Aguardando resposta do usuário...'}</p>
    <Handle type="source" position={Position.Bottom} className="!bg-purple-500" />
  </div>
));
WaitNode.displayName = 'WaitNode';

export const ToolCallNode = memo(({ data, selected }: NodeProps) => (
  <div className={`${baseStyle} bg-green-50 ${selected ? 'border-green-500' : 'border-green-200'}`}>
    <Handle type="target" position={Position.Top} className="!bg-green-500" />
    <div className="flex items-center gap-2 mb-1">
      <span className="text-green-600 text-lg">🔧</span>
      <span className="text-xs font-semibold text-green-700 uppercase">Ação / API</span>
    </div>
    <p className="text-sm text-gray-700">{data.label || 'Chamar API...'}</p>
    <Handle type="source" position={Position.Bottom} className="!bg-green-500" />
  </div>
));
ToolCallNode.displayName = 'ToolCallNode';

export const SetVariableNode = memo(({ data, selected }: NodeProps) => (
  <div className={`${baseStyle} bg-gray-50 ${selected ? 'border-gray-500' : 'border-gray-200'}`}>
    <Handle type="target" position={Position.Top} className="!bg-gray-500" />
    <div className="flex items-center gap-2 mb-1">
      <span className="text-gray-600 text-lg">📝</span>
      <span className="text-xs font-semibold text-gray-700 uppercase">Salvar Dado</span>
    </div>
    <p className="text-sm text-gray-700">{data.variable_name ? `${data.variable_name} = ${data.value || '...'}` : 'Definir variável...'}</p>
    <Handle type="source" position={Position.Bottom} className="!bg-gray-500" />
  </div>
));
SetVariableNode.displayName = 'SetVariableNode';

export const nodeTypes = {
  message: MessageNode,
  condition: ConditionNode,
  handoff: HandoffNode,
  wait: WaitNode,
  tool_call: ToolCallNode,
  set_variable: SetVariableNode,
};
