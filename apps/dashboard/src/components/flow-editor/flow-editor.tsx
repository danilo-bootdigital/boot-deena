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
  { type: 'tool_call', label: '🔧 Ação / API', data: { label: '' } },
  { type: 'handoff', label: '🙋 Transferir', data: { reason: '' } },
];

export function FlowEditor({ initialNodes = [], initialEdges = [], onSave, saving }: FlowEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

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
    <div className="flex flex-col h-[600px] border border-gray-200 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 border-b border-gray-200 overflow-x-auto">
        {nodeTemplates.map((template) => (
          <button
            key={template.type}
            onClick={() => addNode(template)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-md hover:bg-gray-100 whitespace-nowrap transition-colors"
          >
            {template.label}
          </button>
        ))}
        <div className="flex-1" />
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
          className="bg-gray-50"
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
