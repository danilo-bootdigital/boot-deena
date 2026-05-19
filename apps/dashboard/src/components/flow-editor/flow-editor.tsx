'use client';

import { useCallback, useState, useRef } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { nodeTypes } from './nodes';
import { NodeEditorPanel } from './node-editor-panel';
import { flowTemplates } from './templates';
import { Button } from '@/components/ui/button';

interface FlowEditorProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  saving?: boolean;
}

const nodeTemplates = [
  { type: 'message', label: '💬 Mensagem', data: { message: '' } },
  { type: 'condition', label: '⚡ Condição', data: { label: '', field: 'user_message', operator: 'contains', value: '' } },
  { type: 'wait', label: '⏳ Aguardar', data: { label: 'Aguardando resposta' } },
  { type: 'set_variable', label: '📝 Salvar Dado', data: { variable_name: '', value: '' } },
  { type: 'schedule_message', label: '⏰ Agendar Msg', data: { delay_minutes: 60, message_type: 'follow_up_1h', message: '' } },
  { type: 'tool_call', label: '🔧 Ação / API', data: { label: '' } },
  { type: 'handoff', label: '🙋 Transferir', data: { reason: '' } },
];

export function FlowEditor({ initialNodes = [], initialEdges = [], onSave, saving }: FlowEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const loadTemplate = useCallback((templateId: string) => {
    const template = flowTemplates.find((t) => t.id === templateId);
    if (template) {
      setNodes(template.nodes);
      setEdges(template.edges);
      setShowTemplates(false);
    }
  }, [setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#6b7280' } }, eds)),
    [setEdges],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const addNode = useCallback((template: typeof nodeTemplates[0]) => {
    const position = reactFlowInstance
      ? reactFlowInstance.project({ x: 250, y: nodes.length * 120 + 50 })
      : { x: 250, y: nodes.length * 120 + 50 };

    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: template.type,
      position,
      data: { ...template.data },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes, nodes.length, reactFlowInstance]);

  const updateNodeData = useCallback((id: string, data: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data } : n)),
    );
    setSelectedNode((prev) => (prev && prev.id === id ? { ...prev, data } : prev));
  }, [setNodes]);

  const deleteSelected = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
    }
  }, [selectedNode, setNodes, setEdges]);

  return (
    <div className="flex flex-col h-[600px] border border-dark-700/50 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-dark-900/40 border-b border-dark-700/50 overflow-x-auto">
        {nodeTemplates.map((template) => (
          <button
            key={template.type}
            onClick={() => addNode(template)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-dark-800/50 border border-dark-700/50 rounded-md hover:bg-dark-800 whitespace-nowrap transition-colors"
          >
            {template.label}
          </button>
        ))}
        <div className="flex-1" />
        <Button size="sm" variant="secondary" onClick={() => setShowTemplates(!showTemplates)}>
          📋 Templates
        </Button>
        {selectedNode && (
          <Button size="sm" variant="danger" onClick={deleteSelected}>
            Excluir Nó
          </Button>
        )}
        {onSave && (
          <Button size="sm" onClick={() => onSave(nodes, edges)} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Fluxo'}
          </Button>
        )}
      </div>

      {/* Templates Panel */}
      {showTemplates && (
        <div className="p-3 bg-dark-800/50 border-b border-dark-700/50 space-y-2">
          <p className="text-xs font-medium text-dark-400 uppercase">Carregar template pronto:</p>
          <div className="flex gap-2 flex-wrap">
            {flowTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => loadTemplate(t.id)}
                className="px-3 py-2 text-xs bg-dark-900/40 border border-dark-700/50 rounded-lg hover:bg-brand-500/5 hover:border-blue-300 transition-colors text-left"
              >
                <span className="font-medium text-dark-100">{t.name}</span>
                <span className="block text-dark-400 mt-0.5">{t.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Delete"
          className="bg-dark-900/40"
        >
          <Background color="#e5e7eb" gap={20} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const colors: Record<string, string> = {
                message: '#bfdbfe',
                condition: '#fef08a',
                handoff: '#fecaca',
                wait: '#e9d5ff',
                tool_call: '#bbf7d0',
                set_variable: '#e5e7eb',
              };
              return colors[node.type || ''] || '#e5e7eb';
            }}
          />
        </ReactFlow>

        <NodeEditorPanel
          node={selectedNode}
          onUpdate={updateNodeData}
          onClose={() => setSelectedNode(null)}
        />
      </div>
    </div>
  );
}
