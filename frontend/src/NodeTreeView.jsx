import { useMemo, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  Handle
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const NODE_WIDTH = 340;
const NODE_HEIGHT = 120;

/* ─── 커스텀 노드 카드 ─── */
const NodeCard = ({ data, id }) => {
  const { label, title, score, isFavorite, isSelected, globalIndex, onUpdate } = data;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={data.onClick}
      onDoubleClick={data.onDoubleClick}
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        background: 'rgba(25, 28, 35, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${isSelected ? 'rgba(66, 133, 244, 0.8)' : 'rgba(255, 255, 255, 0.1)'}`,
        borderRadius: '16px',
        position: 'relative',
        cursor: 'pointer',
        boxShadow: isSelected 
          ? '0 0 24px rgba(66, 133, 244, 0.4), inset 0 0 12px rgba(66, 133, 244, 0.1)' 
          : '0 8px 32px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        padding: '20px',
        color: '#f3f4f6',
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        transform: isSelected ? 'translateY(-2px)' : 'none',
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        if (!isSelected) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.5)';
          e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.25)';
        }
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        if (!isSelected) {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
          e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        }
      }}
    >
      {/* Target Handles (화면엔 안 보이지만 선 연결의 도착점으로 필수) */}
      <Handle type="target" position={Position.Top} id="top" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0 }} />

      {/* Source Handles (화면에 보이는 빨간 점 - 네온 글로우 스타일) */}
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: '#ff4757', width: 10, height: 10, border: '2px solid #fff', left: '15%', boxShadow: '0 0 8px rgba(255, 71, 87, 0.8)' }} />
      <Handle type="source" position={Position.Right} id="right" style={{ background: '#ff4757', width: 10, height: 10, border: '2px solid #fff', boxShadow: '0 0 8px rgba(255, 71, 87, 0.8)' }} />

      {/* 1번 (Circle Index - Premium Glass Orb) */}
      <div style={{
        position: 'absolute',
        top: '-18px',
        left: '-18px',
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%)',
        backdropFilter: 'blur(8px)',
        border: `2px solid ${label.startsWith('B') ? '#4ea8de' : label.includes('-S') ? '#ffd700' : '#ff4757'}`,
        boxShadow: `0 4px 12px rgba(0,0,0,0.3), inset 0 2px 8px ${label.startsWith('B') ? 'rgba(78,168,222,0.3)' : label.includes('-S') ? 'rgba(255,215,0,0.3)' : 'rgba(255,71,87,0.3)'}, 0 0 10px ${label.startsWith('B') ? 'rgba(78,168,222,0.4)' : label.includes('-S') ? 'rgba(255,215,0,0.4)' : 'rgba(255,71,87,0.4)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        fontWeight: '800',
        color: '#ffffff',
        zIndex: 10
      }}>
        {globalIndex}
      </div>

      {/* 상단 (별표 + 이해도 게이지) */}
      <div style={{ display: 'flex', marginLeft: '32px', alignItems: 'center', gap: '24px' }}>
        <div 
          onClick={(e) => { e.stopPropagation(); onUpdate(id, { is_favorite: !isFavorite }); }}
          onDoubleClick={(e) => e.stopPropagation()}
          style={{ 
            fontSize: '28px', 
            color: isFavorite ? '#ffd700' : 'rgba(255,255,255,0.15)',
            filter: isFavorite ? 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))' : 'none',
            cursor: 'pointer',
            lineHeight: 1,
            transition: 'all 0.2s ease',
            transform: isFavorite ? 'scale(1.1)' : 'scale(1)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = isFavorite ? 'scale(1.1)' : 'scale(1)'}
        >
          ★
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          {[1, 2, 3, 4, 5].map(v => (
            <div 
              key={v}
              onClick={(e) => { e.stopPropagation(); onUpdate(id, { understanding_score: v }); }}
              onDoubleClick={(e) => e.stopPropagation()}
              style={{
                width: '32px',
                height: '8px',
                borderRadius: '4px',
                background: v <= (score || 0) ? 'linear-gradient(90deg, #00c6ff 0%, #0072ff 100%)' : 'rgba(255,255,255,0.1)',
                boxShadow: v <= (score || 0) ? '0 0 10px rgba(0, 198, 255, 0.5)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.3)'}
              onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
            />
          ))}
        </div>
      </div>

      {/* 좌측 중앙 (선 끊기 버튼) - 마우스 호버 시에만 표시되며, 기준 노드가 있을 때만(선이 연결되어 있을 때만) 나타남 */}
      {isHovered && data.reference_node_id && (
        <div style={{ position: 'absolute', top: '50%', left: '-12px', transform: 'translateY(-50%)', zIndex: 20 }}>
          <button 
            onClick={(e) => { 
              e.stopPropagation();
              if (data.onUpdate) data.onUpdate(id, { reference_node_id: null }); 
            }}
            onDoubleClick={(e) => e.stopPropagation()}
            style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: '#ff4757', border: '2px solid #191c23', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', padding: 0,
              boxShadow: '0 0 8px rgba(255, 71, 87, 0.6)',
              transition: 'transform 0.2s',
            }}
            title="선 끊기 (독립 노드로 만들기)"
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}

      {/* 우측 상단 (휴지통 버튼) */}
      <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 20 }}>
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            data.onClick(); // 선택 상태로 만들기 (삭제 모달이 selectedNode 참조)
            setTimeout(() => {
              if (data.onDelete) data.onDelete(); // 약간의 지연 후 모달 띄우기
            }, 10);
          }}
          onDoubleClick={(e) => e.stopPropagation()}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.3)', padding: '4px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ff4757';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>

      {/* 하단 (분류코드 + 제목) */}
      <div style={{ display: 'flex', marginTop: 'auto', gap: '16px', alignItems: 'center', marginLeft: '12px' }}>
        <div 
          title={label}
          style={{ 
            fontSize: '12px', 
            fontWeight: '700', 
            background: 'rgba(255,255,255,0.1)', 
            padding: '4px 8px', 
            borderRadius: '6px',
            color: '#a1a1aa',
            letterSpacing: '0.5px'
          }}
        >
          {label.includes('-S') ? label.substring(label.lastIndexOf('-S') + 1) : label}
        </div>
        <div style={{ 
          fontSize: '16px', 
          fontWeight: '500',
          color: '#ffffff',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          textShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}>
          {title || '(제목 없음)'}
        </div>
      </div>
    </div>
  );
};

const nodeTypes = { nodeCard: NodeCard };

/* ─── 커스텀 직교 트리 레이아웃 (Indented Tree) ─── */
const getLayoutedElements = (flowNodes, flowEdges) => {
  const X_GAP = 80;    // 최상위 형제들 간의 가로 간격
  const Y_GAP = 60;    // 자식 노드들 간의 세로 간격
  const X_INDENT = 80; // 자식 노드가 부모보다 우측으로 들어가는 들여쓰기 간격

  // 1. 트리 구조화
  const nodeMap = {};
  flowNodes.forEach(n => {
    nodeMap[n.id] = { ...n, children: [] };
  });

  const roots = [];
  flowNodes.forEach(n => {
    // 1:1 방사형 트리 구조: reference_node_id 기준 연결
    const refId = n.data.reference_node_id; // 프론트엔드 노드 데이터 매핑에서 전달됨
    if (refId && nodeMap[refId]) {
      nodeMap[refId].children.push(nodeMap[n.id]);
    } else {
      roots.push(nodeMap[n.id]);
    }
  });

  // 순서 정렬 (숫자 기준 오름차순)
  const sortNodes = (nodesList) => {
    nodesList.sort((a, b) => a.data.label.localeCompare(b.data.label, undefined, { numeric: true }));
    nodesList.forEach(child => sortNodes(child.children));
  };
  sortNodes(roots);

  // 2. 재귀적 좌표 계산
  let currentX = 0;
  
  for (let root of roots) {
    let currentY = 0; // 각 루트 트리는 최상단(y=0)부터 시작

    function layoutNode(node, x, depth) {
      node.position = { x, y: currentY };
      let nodeStartY = currentY;
      currentY += NODE_HEIGHT + Y_GAP;
      
      let maxSubtreeX = x + NODE_WIDTH;
      
      // 자식 노드 분리 (Right 브랜치 vs Bottom 브랜치)
      const sourceDepth = (node.data.label.match(/-S/g) || []).length;
      const rightChildren = [];
      const bottomChildren = [];
      
      node.children.forEach(c => {
        const targetDepth = (c.data.label.match(/-S/g) || []).length;
        if (targetDepth > sourceDepth) bottomChildren.push(c);
        else rightChildren.push(c);
      });

      // 1. Right 브랜치 배치 (우측으로 뻗어나감, 다수일 경우 세로 누적)
      if (rightChildren.length > 0) {
        let tempY = currentY;
        currentY = nodeStartY; // 부모와 수평 위치에서 시작
        for (let rc of rightChildren) {
          let childMaxX = layoutNode(rc, x + NODE_WIDTH + X_GAP, depth);
          maxSubtreeX = Math.max(maxSubtreeX, childMaxX);
        }
        currentY = Math.max(tempY, currentY); // 하단 자식들이 우측 자식들과 겹치지 않도록 Y 확보
      }
      
      // 2. Bottom 브랜치 배치 (하단으로 뻗어나감, 다수일 경우 세로 누적)
      for (let bc of bottomChildren) {
        let childMaxX = layoutNode(bc, x + X_INDENT, depth + 1);
        maxSubtreeX = Math.max(maxSubtreeX, childMaxX);
      }
      
      return maxSubtreeX;
    }

    let maxRootX = layoutNode(root, currentX, 0);
    currentX = maxRootX + X_GAP;
  }

  // 3. 플랫 배열로 다시 변환
  const layoutedNodes = flowNodes.map(n => {
    const layoutInfo = nodeMap[n.id].position;
    const existingX = n.data.position_x;
    const existingY = n.data.position_y;
    
    return {
      ...n,
      position: (existingX !== null && existingY !== null) 
        ? { x: existingX, y: existingY } 
        : (layoutInfo || { x: 0, y: 0 }),
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top, // 미사용 (Left/Right 직접 사용)
    };
  });

  return { layoutedNodes, layoutedEdges: flowEdges };
};

/* ─── 노드/엣지 변환 ─── */
const buildFlowData = (nodes, selectedNode, onNodeClick, onDoubleClickNode, onUpdateMetadata, onDeleteNode) => {
  if (!nodes || nodes.length === 0) return { flowNodes: [], flowEdges: [] };

  const flowNodes = nodes.map((node, index) => {
    const label = node.node_label;
    const depth = (label.match(/-S/g) || []).length;

    return {
      id: String(node.id),
      type: 'nodeCard',
      data: {
        label,
        title: node.node_title || '(제목 없음)',
        score: node.understanding_score || 0,
        isFavorite: !!node.is_favorite,
        isSelected: selectedNode?.id === node.id,
        depth,
        globalIndex: index + 1,
        reference_node_id: node.reference_node_id,
        onClick: () => onNodeClick(node),
        onDoubleClick: () => onDoubleClickNode && onDoubleClickNode(node),
        onUpdate: onUpdateMetadata,
        onDelete: onDeleteNode,
        position_x: node.position_x,
        position_y: node.position_y
      },
      position: { 
        x: node.position_x !== null ? node.position_x : 0, 
        y: node.position_y !== null ? node.position_y : 0 
      }
    };
  });

  const flowEdges = [];
  
  // 1:1 방사형 엣지 생성 (reference_node_id 기준)
  nodes.forEach(node => {
    if (node.reference_node_id) {
      const sourceNode = nodes.find(n => n.id === node.reference_node_id);
      if (sourceNode) {
        const sourceDepth = (sourceNode.node_label.match(/-S/g) || []).length;
        const targetDepth = (node.node_label.match(/-S/g) || []).length;
        const isBottom = targetDepth > sourceDepth;

        flowEdges.push({
          id: `e-${sourceNode.id}-${node.id}`,
          source: String(sourceNode.id),
          target: String(node.id),
          sourceHandle: isBottom ? 'bottom' : 'right',
          targetHandle: 'left',
          type: 'default',
          style: { 
            stroke: isBottom ? 'rgba(255,255,255,0.25)' : 'rgba(66, 133, 244, 0.4)', 
            strokeWidth: 2,
            strokeDasharray: isBottom ? 'none' : '5,5'
          },
          animated: false,
        });
      }
    }
  });

  return { flowNodes, flowEdges };
};

/* ─── 메인 컴포넌트 ─── */
export default function NodeTreeView({ nodes, selectedNode, onNodeClick, onDoubleClickNode, onUpdateMetadata, onDeleteNode, onConnectEdge }) {
  const { flowNodes: rawNodes, flowEdges: rawEdges } = useMemo(
    () => buildFlowData(nodes, selectedNode, onNodeClick, onDoubleClickNode, onUpdateMetadata, onDeleteNode),
    [nodes, selectedNode, onNodeClick, onDoubleClickNode, onUpdateMetadata, onDeleteNode]
  );

  const { layoutedNodes, layoutedEdges } = useMemo(
    () => getLayoutedElements(rawNodes, rawEdges),
    [rawNodes, rawEdges]
  );

  const [rfNodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);
  
  // 드래그 중 델타(이동량) 계산을 위한 참조값
  const lastPosRef = useRef({ x: 0, y: 0 });

  // 데이터(nodes prop)가 변경될 때마다 React Flow 내부 상태 동기화
  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  // ─── 1. 후손 노드 탐색 로직 (재귀) ───
  const getSubtreeIds = (nodeId, edges) => {
    const descendants = [];
    const queue = [nodeId];
    const visited = new Set();

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      edges.forEach(edge => {
        if (edge.source === currentId) {
          descendants.push(edge.target);
          queue.push(edge.target);
        }
      });
    }
    return descendants;
  };

  // ─── 2. 동시 드래그 로직 ───
  const onNodeDragStart = (event, node) => {
    // 드래그 시작 시점의 위치 저장
    lastPosRef.current = { x: node.position.x, y: node.position.y };
  };

  const onNodeDrag = (event, node) => {
    const subtreeIds = getSubtreeIds(node.id, rfEdges);
    if (subtreeIds.length === 0) {
      lastPosRef.current = { x: node.position.x, y: node.position.y };
      return;
    }

    // 이전 프레임 대비 이동량(Delta) 계산
    const dx = node.position.x - lastPosRef.current.x;
    const dy = node.position.y - lastPosRef.current.y;

    if (dx === 0 && dy === 0) return;

    // 현재 위치를 다음 프레임을 위한 기준값으로 업데이트
    lastPosRef.current = { x: node.position.x, y: node.position.y };

    // 모든 후손 노드들을 부모의 이동량만큼 동시 이동
    setNodes((nds) =>
      nds.map((n) => {
        if (subtreeIds.includes(n.id)) {
          return {
            ...n,
            position: { x: n.position.x + dx, y: n.position.y + dy }
          };
        }
        return n;
      })
    );
  };

  // ─── 3. 충돌 감지 및 밀어내기 로직 (onNodeDragStop) ───
  const onNodeDragStop = (event, node) => {
    const subtreeIds = [node.id, ...getSubtreeIds(node.id, rfEdges)];
    
    const resolveCollisions = (allNodes) => {
      let changed = false;
      const nextNodes = [...allNodes];
      const groupNodes = nextNodes.filter(n => subtreeIds.includes(n.id));
      
      nextNodes.forEach((otherNode) => {
        if (subtreeIds.includes(otherNode.id)) return;

        const isColliding = groupNodes.some(gn => {
          return (
            gn.position.x < otherNode.position.x + NODE_WIDTH + 20 &&
            gn.position.x + NODE_WIDTH + 20 > otherNode.position.x &&
            gn.position.y < otherNode.position.y + NODE_HEIGHT + 20 &&
            gn.position.y + NODE_HEIGHT + 20 > otherNode.position.y
          );
        });

        if (isColliding) {
          const otherSubtree = [otherNode.id, ...getSubtreeIds(otherNode.id, rfEdges)];
          const pushY = (NODE_HEIGHT + 60); 
          
          otherSubtree.forEach(oid => {
            const nodeIdx = nextNodes.findIndex(n => n.id === oid);
            if (nodeIdx !== -1) {
              nextNodes[nodeIdx] = {
                ...nextNodes[nodeIdx],
                position: {
                  ...nextNodes[nodeIdx].position,
                  y: nextNodes[nodeIdx].position.y + pushY
                }
              };
              changed = true;
            }
          });
        }
      });

      return { nextNodes, changed };
    };

    let finalNodes = rfNodes;
    for (let i = 0; i < 5; i++) {
      const { nextNodes, changed } = resolveCollisions(finalNodes);
      finalNodes = nextNodes;
      if (!changed) break;
    }

    setNodes(finalNodes);

    // ─── 4. 변경된 좌표 백엔드 저장 ───
    // 드래그된 그룹(노드 및 후손)의 최종 좌표를 서버에 반영
    finalNodes.forEach(fn => {
      if (subtreeIds.includes(fn.id)) {
        if (onUpdateMetadata) {
          onUpdateMetadata(fn.id, {
            position_x: fn.position.x,
            position_y: fn.position.y
          }, true);
        }
      }
    });
  };

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
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onConnect={(params) => {
          if (onConnectEdge) onConnectEdge(params);
        }}
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
            return n.data?.isSelected ? '#4285f4' : '#e5e7eb';
          }}
          maskColor="rgba(0,0,0,0.5)"
        />
      </ReactFlow>
    </div>
  );
}

