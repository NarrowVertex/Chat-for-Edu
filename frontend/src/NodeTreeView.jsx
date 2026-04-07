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

// 노드 색상 팔레트 (깊이별 네온 스타일)
const DEPTH_STYLES = [
  // depth 0: M 노드 - 강렬한 블루/시안
  { bg: 'rgba(30, 40, 60, 0.7)', border: '#4285f4', text: '#ffffff', tagBg: 'rgba(66, 133, 244, 0.2)', tagText: '#4285f4', glow: 'rgba(66, 133, 244, 0.4)' },
  // depth 1: S1 노드 - 노란색/골드
  { bg: 'rgba(50, 45, 20, 0.7)', border: '#ffcc00', text: '#ffffff', tagBg: 'rgba(255, 204, 0, 0.2)', tagText: '#ffcc00', glow: 'rgba(255, 204, 0, 0.4)' },
  // depth 2: S2 노드 - 오렌지/레드
  { bg: 'rgba(50, 25, 20, 0.7)', border: '#ff4d4d', text: '#ffffff', tagBg: 'rgba(255, 77, 77, 0.2)', tagText: '#ff4d4d', glow: 'rgba(255, 77, 77, 0.4)' },
  // depth 3+: 보라색
  { bg: 'rgba(40, 30, 50, 0.7)', border: '#9b72cb', text: '#ffffff', tagBg: 'rgba(155, 114, 203, 0.2)', tagText: '#9b72cb', glow: 'rgba(155, 114, 203, 0.4)' },
];

const NODE_WIDTH = 200;
const NODE_HEIGHT = 86;

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
        background: style.bg,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: `2px solid ${isSelected ? style.border : 'rgba(255, 255, 255, 0.1)'}`,
        borderRadius: '16px',
        padding: '12px 14px',
        cursor: 'pointer',
        boxShadow: isSelected
          ? `0 0 20px ${style.glow}, 0 4px 20px rgba(0,0,0,0.6)`
          : '0 8px 16px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        boxSizing: 'border-box',
        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      {/* 라벨 태그 + 즐겨찾기 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: '10px', fontWeight: 800, padding: '2px 8px',
          borderRadius: '6px', background: style.tagBg,
          color: style.tagText, border: `1px solid ${style.border}33`,
          letterSpacing: '0.5px', textTransform: 'uppercase',
        }}>
          {label}
        </span>
        {isFavorite && <span style={{ fontSize: '14px', filter: 'drop-shadow(0 0 5px #FFD700)' }}>⭐</span>}
      </div>

      {/* 제목 */}
      <div style={{
        fontSize: '13px', color: style.text, fontWeight: 600,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        marginTop: '6px', letterSpacing: '-0.2px',
      }}>
        {title || '(제목 없음)'}
      </div>

      {/* 이해도 게이지 (네온 틱) */}
      <div style={{ display: 'flex', gap: '3px', marginTop: '8px' }}>
        {[1, 2, 3, 4, 5].map(v => (
          <div key={v} style={{
            flex: 1, height: '4px', borderRadius: '2px',
            background: v <= (score || 0) ? style.tagText : 'rgba(255,255,255,0.1)',
            boxShadow: v <= (score || 0) ? `0 0 8px ${style.tagText}` : 'none',
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
