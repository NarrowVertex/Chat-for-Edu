import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useState } from 'react';
import './index.css';
import UserManagement from './components/UserManagement';
import AIAssistant from './components/AIAssistant';

const initialNodes = [
  { 
    id: '1', 
    position: { x: 250, y: 5 }, 
    data: { label: 'Node 1' },
    type: 'default',
  },
  { 
    id: '2', 
    position: { x: 100, y: 100 }, 
    data: { label: 'Node 2' },
    type: 'default',
  },
];

const initialEdges = [{ id: 'e1-2', source: '1', target: '2', animated: true }];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  );

  const addNode = useCallback(() => {
    const id = `${nodes.length + 1}`;
    const newNode = {
      id,
      position: {
        x: Math.random() * 400,
        y: Math.random() * 400,
      },
      data: { label: `Node ${id}` },
      type: 'default',
    };
    setNodes((nds) => nds.concat(newNode));
  }, [nodes, setNodes]);

  const deleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((node) => !node.selected));
    setEdges((eds) => eds.filter((edge) => !edge.selected));
  }, [setNodes, setEdges]);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background variant="dots" gap={12} size={1} color="#334155" />
        <Controls />
        <MiniMap 
          nodeColor={(n) => {
            if (n.type === 'input') return '#10b981';
            return '#3b82f6';
          }}
          maskColor="rgba(15, 23, 42, 0.6)"
          style={{ background: 'rgba(30, 41, 59, 0.7)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}
        />
        
        <Panel position="top-right" className="toolbar system-toolbar">
          <button onClick={() => setIsUserPanelOpen(!isUserPanelOpen)}>
            {isUserPanelOpen ? 'Close Users' : 'Users (MySQL)'}
          </button>
          <button onClick={() => setIsAIPanelOpen(!isAIPanelOpen)} className="ai-btn">
            {isAIPanelOpen ? 'Close AI' : 'AI Assistant'}
          </button>
        </Panel>

        <Panel position="top-center" className="toolbar">
          <button onClick={addNode}>+ Add Node</button>
          <button className="delete-btn" onClick={deleteSelected}>Delete Selected</button>
        </Panel>

        <UserManagement isOpen={isUserPanelOpen} onClose={() => setIsUserPanelOpen(false)} />
        <AIAssistant isOpen={isAIPanelOpen} onClose={() => setIsAIPanelOpen(false)} />
      </ReactFlow>
    </div>
  );
}
