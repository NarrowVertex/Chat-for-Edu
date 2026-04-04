import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import '@xyflow/react/dist/style.css';

// 노드 색상 팔레트 (깊이별)
const DEPTH_STYLES = [
  // depth 0: M 노드 - 어두운 올리브/틸
  { bg: '#2d4a3e', border: '#4a7c59', text: '#a8d5b5', tagBg: 'rgba(74,124,89,0.3)', tagText: '#7ec896' },
  // depth 1: S1 노드 - 노란색
  { bg: '#4a3d00', border: '#b89a00', text: '#f0d060', tagBg: 'rgba(184,154,0,0.25)', tagText: '#f1d542' },
  // depth 2: S2 노드 - 주황/빨강
  { bg: '#4a1a00', border: '#c04a00', text: '#f09060', tagBg: 'rgba(192,74,0,0.25)', tagText: '#f07840' },
  // depth 3+: 더 깊은 노드 - 짙은 빨강
  { bg: '#3a0a0a', border: '#8b2020', text: '#e08080', tagBg: 'rgba(139,32,32,0.25)', tagText: '#e06060' },
];

const NODE_WIDTH = 180;
const NODE_HEIGHT = 72;

/* ─── 커스텀 노드 카드 ─── */
const NodeCard = ({ data }) => {
  const { label, title, score, isFavorite, isSelected, depth, onClick } = data;
  const style = DEPTH_STYLES[Math.min(depth, DEPTH_STYLES.length - 1)];

  return (
    <div
      onClick={onClick}
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        background: isSelected ? style.bg + 'ee' : style.bg,
        border: `1.5px solid ${isSelected ? '#4285f4' : style.border}`,
        borderRadius: '10px',
        padding: '8px 10px',
        cursor: 'pointer',
        boxShadow: isSelected
          ? `0 0 0 2px rgba(66,133,244,0.5), 0 4px 20px rgba(0,0,0,0.5)`
          : '0 4px 12px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.15s',
        boxSizing: 'border-box',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* 라벨 태그 + 즐겨찾기 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{
          fontSize: '9px', fontWeight: 700, padding: '2px 6px',
          borderRadius: '5px', background: style.tagBg,
          color: style.tagText, border: `1px solid ${style.border}`,
          letterSpacing: '0.3px', flexShrink: 0,
        }}>
          {label}
        </span>
        {isFavorite && <span style={{ fontSize: '10px' }}>⭐</span>}
      </div>

      {/* 제목 */}
      <div style={{
        fontSize: '12px', color: style.text, lineHeight: 1.3,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        flex: 1, marginTop: '4px',
      }}>
        {title || '(제목 없음)'}
      </div>

      {/* 이해도 게이지 */}
      <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
        {[1, 2, 3, 4, 5].map(v => (
          <div key={v} style={{
            flex: 1, height: '4px', borderRadius: '2px',
            background: v <= (score || 0) ? style.tagText : 'rgba(255,255,255,0.1)',
          }} />
        ))}
      </div>
    </div>
  );
};

const nodeTypes = { nodeCard: NodeCard };

/* ─── dagre 레이아웃 계산 ─── */
const getLayoutedElements = (flowNodes, flowEdges) => {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 60 });

  flowNodes.forEach(n => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  flowEdges.forEach(e => g.setEdge(e.source, e.target));

  dagre.layout(g);

  const layoutedNodes = flowNodes.map(n => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });

  return { layoutedNodes, layoutedEdges: flowEdges };
};

/* ─── 노드/엣지 변환 ─── */
const buildFlowData = (nodes, selectedNode, onNodeClick) => {
  if (!nodes || nodes.length === 0) return { flowNodes: [], flowEdges: [] };

  const flowNodes = nodes.map(node => {
    const label = node.node_label;
    const depth = (label.match(/-S/g) || []).length;

    return {
      id: String(node.id),
      type: 'nodeCard',
      position: { x: 0, y: 0 }, // dagre가 계산
      data: {
        label,
        title: node.node_title || '(제목 없음)',
        score: node.understanding_score || 0,
        isFavorite: !!node.is_favorite,
        isSelected: selectedNode?.id === node.id,
        depth,
        onClick: () => onNodeClick(node),
      },
    };
  });

  // 엣지: 부모 라벨 추론
  const flowEdges = [];
  nodes.forEach(node => {
    const label = node.node_label;
    const parts = label.split('-');
    if (parts.length > 2) {
      const parentLabel = parts.slice(0, parts.length - 2).join('-');
      const parentNode = nodes.find(n => n.node_label === parentLabel);
      if (parentNode) {
        flowEdges.push({
          id: `e-${parentNode.id}-${node.id}`,
          source: String(parentNode.id),
          target: String(node.id),
          type: 'smoothstep',
          style: { stroke: 'rgba(255,255,255,0.25)', strokeWidth: 1.5 },
        });
      }
    }
  });

  return { flowNodes, flowEdges };
};

/* ─── 메인 컴포넌트 ─── */
export default function NodeTreeView({ nodes, selectedNode, onNodeClick }) {
  const { flowNodes: rawNodes, flowEdges: rawEdges } = useMemo(
    () => buildFlowData(nodes, selectedNode, onNodeClick),
    [nodes, selectedNode, onNodeClick]
  );

  const { layoutedNodes, layoutedEdges } = useMemo(
    () => getLayoutedElements(rawNodes, rawEdges),
    [rawNodes, rawEdges]
  );

  const [rfNodes, , onNodesChange] = useNodesState(layoutedNodes);
  const [rfEdges, , onEdgesChange] = useEdgesState(layoutedEdges);

  if (nodes.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', color: '#5f6368', gap: '12px',
      }}>
        <div style={{ fontSize: '48px', opacity: 0.3 }}>🌿</div>
        <p style={{ fontSize: '14px' }}>생성된 블록이 없습니다. 먼저 chat 탭에서 대화를 시작해 보세요!</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.15}
        maxZoom={2.5}
        style={{ background: '#1a1c22' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(255,255,255,0.03)" gap={28} />
        <Controls
          style={{
            background: 'rgba(30,34,42,0.9)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
          }}
        />
        <MiniMap
          style={{
            background: 'rgba(26,28,34,0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
          }}
          nodeColor={n => {
            const depth = (n.data?.label?.match(/-S/g) || []).length;
            return DEPTH_STYLES[Math.min(depth, DEPTH_STYLES.length - 1)].border;
          }}
          maskColor="rgba(0,0,0,0.5)"
        />
      </ReactFlow>
    </div>
  );
}
