import { useMemo, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  Handle,
  useViewport,
  useReactFlow
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

const NODE_WIDTH = 340;
const NODE_HEIGHT = 120;

/* ─── 그리기 캔버스 레이어 ─── */
const DrawingLayer = ({ isDrawingMode, drawingTool, penColor, highlighterColor, drawings, setDrawings, onSaveDrawings }) => {
  const { screenToFlowPosition } = useReactFlow();
  const { x, y, zoom } = useViewport();
  const [activePath, setActivePath] = useState(null);
  const svgRef = useRef(null);

  const handlePointerDown = (e) => {
    if (!isDrawingMode || drawingTool === 'eraser') return;
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setActivePath([position]);
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!activePath) return;
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setActivePath(prev => [...prev, position]);
  };

  const handlePointerUp = (e) => {
    if (!activePath) return;
    e.target.releasePointerCapture(e.pointerId);
    if (activePath.length > 1) {
      const newStroke = {
        id: Date.now().toString(),
        tool: drawingTool,
        color: drawingTool === 'highlighter' ? highlighterColor : penColor,
        path: activePath
      };
      const newDrawings = [...drawings, newStroke];
      setDrawings(newDrawings);
      onSaveDrawings(newDrawings);
    }
    setActivePath(null);
  };

  const handleErase = (e, strokeId) => {
    if (isDrawingMode && drawingTool === 'eraser' && (e.buttons === 1 || e.type === 'pointerdown')) {
      const newDrawings = drawings.filter(d => d.id !== strokeId);
      setDrawings(newDrawings);
      onSaveDrawings(newDrawings);
    }
  };

  const pointsToPath = (points) => {
    if (!points || points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };

  const getCursorStyle = () => {
    if (!isDrawingMode) return 'default';
    if (drawingTool === 'eraser') {
      return `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect x="4" y="4" width="16" height="16" fill="white" stroke="black" stroke-width="2"/></svg>') 12 12, crosshair`;
    }
    if (drawingTool === 'highlighter') {
      return `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="9" fill="${encodeURIComponent(highlighterColor)}" opacity="0.4"/></svg>') 12 12, auto`;
    }
    return `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="4" fill="${encodeURIComponent(penColor)}"/></svg>') 8 8, auto`;
  };

  return (
    <div 
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: isDrawingMode ? 100 : 0,
        pointerEvents: isDrawingMode ? 'auto' : 'none',
        cursor: getCursorStyle()
      }}
    >
      <svg 
        ref={svgRef}
        width="100%" 
        height="100%" 
        style={{ position: 'absolute', top: 0, left: 0 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <g transform={`translate(${x}, ${y}) scale(${zoom})`}>
          {drawings.map(d => (
            <path
              key={d.id}
              d={pointsToPath(d.path)}
              stroke={d.color || (d.tool === 'highlighter' ? 'rgba(255, 255, 0, 0.4)' : '#ffffff')}
              strokeOpacity={d.tool === 'highlighter' && d.color ? 0.4 : 1}
              strokeWidth={d.tool === 'highlighter' ? 18 : 3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              onPointerEnter={(e) => handleErase(e, d.id)}
              onPointerDown={(e) => handleErase(e, d.id)}
              style={{ 
                pointerEvents: isDrawingMode && drawingTool === 'eraser' ? 'stroke' : 'none', 
                cursor: isDrawingMode && drawingTool === 'eraser' ? getCursorStyle() : 'default' 
              }}
            />
          ))}
          {activePath && (
            <path
              d={pointsToPath(activePath)}
              stroke={drawingTool === 'highlighter' ? highlighterColor : penColor}
              strokeOpacity={drawingTool === 'highlighter' ? 0.4 : 1}
              strokeWidth={drawingTool === 'highlighter' ? 18 : 3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pointerEvents: 'none' }}
            />
          )}
        </g>
      </svg>
    </div>
  );
};

/* ─── 커스텀 노드 카드 ─── */
const NodeCard = ({ data, id }) => {
  const { label, title, score, isFavorite, isSelected, globalIndex, onUpdate } = data;
  const [isHovered, setIsHovered] = useState(false);

  // 노드 타입별 테마 색상 정의
  const themeColor = label.startsWith('B') ? '#4ea8de' : label.includes('-S') ? '#ffd700' : '#ff4757';

  return (
    <div
      onClick={data.onClick}
      onDoubleClick={data.onDoubleClick}
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        background: 'rgba(25, 28, 35, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1.5px solid ${isSelected ? 'rgba(66, 133, 244, 0.8)' : 'rgba(255, 255, 255, 0.12)'}`,
        borderRadius: '24px',
        position: 'relative',
        cursor: 'pointer',
        boxShadow: isSelected 
          ? '0 0 30px rgba(66, 133, 244, 0.3), inset 0 0 15px rgba(66, 133, 244, 0.05)' 
          : '0 12px 40px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        padding: '18px 12px',
        color: '#f3f4f6',
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        transform: isSelected ? 'translateY(-4px)' : 'none',
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        if (!isSelected) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 16px 48px rgba(0, 0, 0, 0.5)';
          e.currentTarget.style.border = '1.5px solid rgba(255, 255, 255, 0.25)';
        }
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        if (!isSelected) {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.4)';
          e.currentTarget.style.border = '1.5px solid rgba(255, 255, 255, 0.12)';
        }
      }}
    >
      {/* Target Handles */}
      <Handle type="target" position={Position.Top} id="top" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0 }} />

      {/* Source Handles */}
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: '#4285f4', width: 12, height: 12, border: '2.5px solid #fff', left: '20%', boxShadow: '0 0 12px rgba(66, 133, 244, 0.8)' }} />
      <Handle type="source" position={Position.Right} id="right" style={{ background: '#4285f4', width: 12, height: 12, border: '2.5px solid #fff', boxShadow: '0 0 12px rgba(66, 133, 244, 0.8)' }} />

      {/* 순서 표시 동그라미 (Global Index) - 복구 */}
      <div style={{
        position: 'absolute',
        top: '-18px',
        left: '-18px',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${themeColor}33 0%, rgba(10, 12, 15, 1) 100%)`,
        border: `2.5px solid ${themeColor}`,
        boxShadow: `0 4px 12px rgba(0,0,0,0.5), 0 0 15px ${themeColor}66`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        fontWeight: '800',
        color: '#ffffff',
        zIndex: 50
      }}>
        {globalIndex}
      </div>

      {/* 상단 이해도 수치 칸 (동그라미) */}
      <div style={{ 
        position: 'absolute', 
        top: '-12px', 
        left: '50%', 
        transform: 'translateX(-50%)', 
        display: 'flex', 
        gap: '24px',
        zIndex: 30 
      }}>
        {[1, 2, 3, 4, 5].map(v => (
          <div 
            key={v}
            onClick={(e) => { e.stopPropagation(); onUpdate(id, { understanding_score: v }); }}
            onDoubleClick={(e) => e.stopPropagation()}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: v <= (score || 0) 
                ? 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)' 
                : '#1a1c22', 
              border: v <= (score || 0) 
                ? '2px solid rgba(255,255,255,0.8)' 
                : '1.5px solid rgba(255,255,255,0.1)', 
              borderTopColor: v <= (score || 0) ? 'rgba(255,255,255,0.8)' : 'transparent',
              boxShadow: v <= (score || 0) ? '0 0 15px rgba(0, 198, 255, 0.6)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              if (v > (score || 0)) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.border = '1.5px solid rgba(255,255,255,0.2)';
                e.currentTarget.style.borderTopColor = 'transparent';
              } else {
                e.currentTarget.style.transform = 'scale(1.2)';
                e.currentTarget.style.filter = 'brightness(1.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (v > (score || 0)) {
                e.currentTarget.style.background = '#1a1c22';
                e.currentTarget.style.border = '1.5px solid rgba(255,255,255,0.1)';
                e.currentTarget.style.borderTopColor = 'transparent';
              } else {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.filter = 'none';
              }
            }}
          />
        ))}
      </div>

      {/* 상단 레이어: 휴지통 (오른쪽 상단 밀착) */}
      <div style={{ position: 'absolute', top: '0', right: '0', zIndex: 40 }}>
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            data.onClick();
            setTimeout(() => { if (data.onDelete) data.onDelete(); }, 10);
          }}
          onDoubleClick={(e) => e.stopPropagation()}
          style={{
            background: 'rgba(255,255,255,0.05)', 
            border: 'none', 
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.3)', 
            padding: '10px 14px',
            borderRadius: '0 24px 0 12px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ff4757';
            e.currentTarget.style.background = 'rgba(255, 71, 87, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>

      {/* 메인 콘텐츠 레이아웃 */}
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: '10px', marginTop: '4px' }}>
        {/* 좌측 컬럼: 분류번호 + 별표 */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '8px',
          minWidth: '35px'
        }}>
          <div 
            title={label}
            style={{ 
              fontSize: '11px', 
              fontWeight: '800', 
              background: 'rgba(25, 28, 35, 0.6)', 
              padding: '3px 8px', 
              borderRadius: '6px',
              color: themeColor,
              border: `1px solid ${themeColor}44`,
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap'
            }}
          >
            {label.includes('-S') ? label.substring(label.lastIndexOf('-S') + 1) : label}
          </div>

          <div 
            onClick={(e) => { e.stopPropagation(); onUpdate(id, { is_favorite: !isFavorite }); }}
            onDoubleClick={(e) => e.stopPropagation()}
            style={{ 
              fontSize: '28px', 
              color: isFavorite ? '#ffd700' : 'rgba(255,255,255,0.1)',
              filter: isFavorite ? 'drop-shadow(0 0 12px rgba(255, 215, 0, 0.5))' : 'none',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              userSelect: 'none',
              lineHeight: 1
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2) rotate(15deg)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
          >
            ★
          </div>
        </div>

        {/* 우측 컬럼: 중앙 정렬된 제목 */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'flex-start',
          borderLeft: '1px solid rgba(255,255,255,0.05)',
          paddingLeft: '10px',
          height: '70%'
        }}>
          <div style={{ 
            fontSize: '22px', 
            fontWeight: '700',
            color: '#ffffff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: '1.4',
            textShadow: '0 2px 10px rgba(0,0,0,0.3)'
          }}>
            {title || '(제목 없음)'}
          </div>
        </div>
      </div>

      {/* 선 끊기 버튼 (호버 시 표시) */}
      {isHovered && data.reference_node_id && (
        <div style={{ position: 'absolute', top: '50%', left: '-14px', transform: 'translateY(-50%)', zIndex: 40 }}>
          <button 
            onClick={(e) => { 
              e.stopPropagation();
              if (data.onUpdate) data.onUpdate(id, { reference_node_id: null }); 
            }}
            onDoubleClick={(e) => e.stopPropagation()}
            style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: '#ff4757', border: '3px solid #1a1c22', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', padding: 0,
              boxShadow: '0 4px 12px rgba(255, 71, 87, 0.4)',
              transition: 'all 0.2s',
            }}
            title="선 끊기"
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
    </div>
  );
};

const nodeTypes = { nodeCard: NodeCard };

/* ─── 커스텀 직교 트리 레이아웃 (Collision-Aware Directional Tree) ─── */
const getLayoutedElements = (flowNodes, flowEdges) => {
  const X_GAP = 100;
  const Y_GAP = 60;
  const X_INDENT = 80;

  // 1. 트리 구조화
  const nodeMap = {};
  flowNodes.forEach(n => {
    nodeMap[n.id] = { ...n, children: [], position: null };
  });

  flowEdges.forEach(e => {
    if (nodeMap[e.source] && nodeMap[e.target]) {
      nodeMap[e.source].children.push(nodeMap[e.target]);
    }
  });

  // 루트 노드 찾기
  const roots = flowNodes.filter(n => !flowEdges.some(e => e.target === n.id)).map(n => nodeMap[n.id]);

  // 점유된 영역 추적 (수동 위치 노드 포함)
  const occupiedRects = flowNodes
    .filter(n => n.data.position_x !== null && n.data.position_y !== null)
    .map(n => ({
      id: n.id,
      x: n.data.position_x,
      y: n.data.position_y,
      w: NODE_WIDTH,
      h: NODE_HEIGHT
    }));

  const isOverlap = (rect) => {
    return occupiedRects.some(r => 
      rect.id !== r.id &&
      rect.x < r.x + r.w + X_GAP / 2 &&
      rect.x + rect.w + X_GAP / 2 > r.x &&
      rect.y < r.y + r.h + Y_GAP / 2 &&
      rect.y + rect.h + Y_GAP / 2 > r.y
    );
  };

  const findFreeY = (rect) => {
    let originalY = rect.y;
    while (isOverlap(rect)) {
      rect.y += (NODE_HEIGHT + Y_GAP) / 2;
      if (rect.y > originalY + 10000) break; // 무한 루프 방지
    }
    return rect.y;
  };

  function layoutNode(node, startX, startY) {
    let finalX = startX;
    let finalY = startY;

    // 수동 위치가 있으면 그대로 사용, 없으면 빈 공간 찾기
    if (node.data.position_x !== null && node.data.position_y !== null) {
      finalX = node.data.position_x;
      finalY = node.data.position_y;
    } else {
      finalY = findFreeY({ id: node.id, x: finalX, y: finalY, w: NODE_WIDTH, h: NODE_HEIGHT });
      occupiedRects.push({ id: node.id, x: finalX, y: finalY, w: NODE_WIDTH, h: NODE_HEIGHT });
    }

    node.position = { x: finalX, y: finalY };
    
    let maxSubtreeY = finalY + NODE_HEIGHT + Y_GAP;
    let maxSubtreeX = finalX + NODE_WIDTH + X_GAP;

    // 자식 분리
    const sourceDepth = (node.data.label.match(/-S/g) || []).length;
    const rightChildren = node.children.filter(c => (c.data.label.match(/-S/g) || []).length <= sourceDepth);
    const bottomChildren = node.children.filter(c => (c.data.label.match(/-S/g) || []).length > sourceDepth);

    // 1. 우측 자식 배치
    let nextRightY = finalY;
    for (let rc of rightChildren) {
      let subtreeRes = layoutNode(rc, finalX + NODE_WIDTH + X_GAP, nextRightY);
      nextRightY = subtreeRes.maxY;
      maxSubtreeY = Math.max(maxSubtreeY, subtreeRes.maxY);
      maxSubtreeX = Math.max(maxSubtreeX, subtreeRes.maxX);
    }

    // 2. 하단 자식 배치
    let nextBottomY = Math.max(maxSubtreeY, finalY + NODE_HEIGHT + Y_GAP);
    for (let bc of bottomChildren) {
      let subtreeRes = layoutNode(bc, finalX + X_INDENT, nextBottomY);
      nextBottomY = subtreeRes.maxY;
      maxSubtreeY = Math.max(maxSubtreeY, subtreeRes.maxY);
      maxSubtreeX = Math.max(maxSubtreeX, subtreeRes.maxX);
    }

    return { maxY: maxSubtreeY, maxX: maxSubtreeX };
  }

  let currentRootX = 0;
  let currentRootY = 0;
  for (let root of roots) {
    let res = layoutNode(root, currentRootX, 0);
    currentRootX = res.maxX;
  }

  const layoutedNodes = flowNodes.map(n => {
    const info = nodeMap[n.id];
    return {
      ...n,
      position: info.position || { x: 0, y: 0 }
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

/* ─── 전체 노드 맵 뷰 컨테이너 ─── */
export default function NodeTreeView({ 
  nodes, 
  selectedNode, 
  onNodeClick, 
  onDoubleClickNode, 
  onUpdateMetadata, 
  onDeleteNode, 
  onConnectEdge, 
  savedViewport, 
  onViewportChange,
  isDrawingMode,
  drawingTool,
  penColor,
  highlighterColor,
  drawings,
  setDrawings,
  onSaveDrawings
}) {
  const { flowNodes: rawNodes, flowEdges: rawEdges } = useMemo(
    () => buildFlowData(nodes, selectedNode, onNodeClick, onDoubleClickNode, onUpdateMetadata, onDeleteNode),
    [nodes, selectedNode, onNodeClick, onDoubleClickNode, onUpdateMetadata, onDeleteNode]
  );

  const { layoutedNodes, layoutedEdges } = useMemo(
    () => getLayoutedElements(rawNodes, rawEdges),
    [rawNodes, rawEdges]
  );

  const [rfNodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [rfEdges, setEdges, onEdgesChangeEdges] = useEdgesState(layoutedEdges);
  
  const lastPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

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

  const onNodeDragStart = (event, node) => {
    lastPosRef.current = { x: node.position.x, y: node.position.y };
  };

  const onNodeDrag = (event, node) => {
    const subtreeIds = getSubtreeIds(node.id, rfEdges);
    if (subtreeIds.length === 0) {
      lastPosRef.current = { x: node.position.x, y: node.position.y };
      return;
    }

    const dx = node.position.x - lastPosRef.current.x;
    const dy = node.position.y - lastPosRef.current.y;

    if (dx === 0 && dy === 0) return;

    lastPosRef.current = { x: node.position.x, y: node.position.y };

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
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChangeEdges}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onConnect={(params) => {
          if (onConnectEdge) onConnectEdge(params);
        }}
        onMoveEnd={(_, viewport) => {
          if (onViewportChange) onViewportChange(viewport);
        }}
        nodeTypes={nodeTypes}
        {...(savedViewport
          ? { defaultViewport: savedViewport }
          : { fitView: true, fitViewOptions: { padding: 0.25 } })}
        minZoom={0.15}
        maxZoom={2.5}
        style={{ background: '#1a1c22' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(255,255,255,0.03)" gap={28} />
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
        <DrawingLayer 
          isDrawingMode={isDrawingMode} 
          drawingTool={drawingTool} 
          penColor={penColor}
          highlighterColor={highlighterColor}
          drawings={drawings} 
          setDrawings={setDrawings}
          onSaveDrawings={onSaveDrawings}
        />
      </ReactFlow>
    </div>
  );
}
