import { useState, useEffect, useRef } from 'react';
import {
  Menu, Plus, Compass, Sparkles, Mic, Paperclip, MessageSquare, X,
  ArrowLeft, Search, Share2, Star, Edit3, RotateCcw, ThumbsUp, ThumbsDown,
  MoreVertical, ChevronRight, ChevronDown, Hash, Send, ExternalLink, CornerDownRight, SquarePlus, Trash2, Loader2
} from 'lucide-react';
import './App.css';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import NodeTreeView from './NodeTreeView';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [view, setView] = useState('login'); // 'login', 'home', 'project'
  const [viewMode, setViewMode] = useState('chat'); // 'chat' or 'node'

  const [historyItems, setHistoryItems] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteNodeModalOpen, setIsDeleteNodeModalOpen] = useState(false);
  const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);

  // Project/Node States
  const [activeChat, setActiveChat] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [contextNode, setContextNode] = useState(null);
  const [isContextSelectorOpen, setIsContextSelectorOpen] = useState(false);
  const [collapsedNodes, setCollapsedNodes] = useState(new Set()); // 접힌 노드 ID 목록

  const toggleCollapse = (nodeId, e) => {
    e.stopPropagation(); // 노드 선택 이벤트 방지
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const [nodeListTab, setNodeListTab] = useState('category'); // 'category' | 'score' | 'favorite'

  // Chat Input State
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  // Title Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  // Node Title Editing State
  const [isEditingNodeTitle, setIsEditingNodeTitle] = useState(false);
  const [editedNodeTitle, setEditedNodeTitle] = useState('');

  // Smart Icon Toggle States
  const [activeIcons, setActiveIcons] = useState({ next: false, node: false, sparkle: false });

  // Login State
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // AI 응답 로딩 상태
  const [isGenerating, setIsGenerating] = useState(false);
  const textareaRef = useRef(null);
  const contextSelectorRef = useRef(null);

  // 입력창 자동 높이 조절
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const nextHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = `${nextHeight}px`;
    }
  }, [inputText]);

  // 부모 노드 선택 팝업 닫기 (Click Outside)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextSelectorRef.current && !contextSelectorRef.current.contains(event.target)) {
        setIsContextSelectorOpen(false);
      }
    };

    if (isContextSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside, true);
    } else {
      document.removeEventListener('mousedown', handleClickOutside, true);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isContextSelectorOpen]);

  // 사용자의 채팅 목록 불러오기
  const fetchChats = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/chats/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setHistoryItems(data);
      }
    } catch (err) {
      console.error('Fetch Chats Error:', err);
    }
  };

  // 특정 채팅의 노드들 불러오기
  const fetchNodes = async (chatId, selectId = null) => {
    try {
      const response = await fetch(`http://localhost:5000/api/chats/${chatId}/nodes`);
      if (response.ok) {
        const data = await response.json();
        setNodes(data);

        // 현재 선택된 컨텍스트 노드 정보도 최신 데이터로 동기화
        setContextNode(prev => {
          if (!prev) return null;
          return data.find(n => n.id === prev.id) || prev;
        });

        // 만약 선택된 노드가 있다면 그것도 최신화
        setSelectedNode(prev => {
          if (!prev) return null;
          return data.find(n => n.id === prev.id) || prev;
        });

        if (data.length > 0) {
          // 1. 명시적으로 지정된 ID가 있다면 그것을 선택
          if (selectId) {
            const found = data.find(n => n.id === selectId);
            if (found) setSelectedNode(found);
            else setSelectedNode(data[0]); // 사라졌다면 첫 번째
          }
          // 2. 이미 선택된 노드가 있다면 최신 정보로 갱신 (라벨 동기화 핵심)
          else if (selectedNode) {
            const found = data.find(n => n.id === selectedNode.id);
            if (found) setSelectedNode(found);
            else setSelectedNode(data[0]); // 선택 중이던 것이 삭제되었다면 첫 번째
          }
          // 3. 아무것도 선택되지 않았다면 첫 번째 선택
          else {
            setSelectedNode(data[0]);
          }
        }
      }
    } catch (err) {
      console.error('Fetch Nodes Error:', err);
    }
  };

  // 앱 초기 로드 시 localStorage에서 사용자 정보 복구 (새로고침 대응)
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setView('home');
    }
  }, []);

  const resetAppState = () => {
    localStorage.removeItem('currentUser'); // 세션 삭제
    setCurrentUser(null);
    setHistoryItems([]);
    setActiveChat(null);
    setNodes([]);
    setSelectedNode(null);
    setInputText('');
    clearImage();
    setIsProfileMenuOpen(false);
    setIsEditingTitle(false);
    setIsEditingNodeTitle(false);
  };

  useEffect(() => {
    if (currentUser) {
      fetchChats(currentUser.id);
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeChat) {
      fetchNodes(activeChat.id);
    }
  }, [activeChat]);

  useEffect(() => {
    // 사용자가 현재 보고 있는 노드를 기본 컨텍스트(부모)로 설정
    if (selectedNode) setContextNode(selectedNode);
  }, [selectedNode]);

  const enterProject = (chat) => {
    setNodes([]); // 이전 프로젝트 노드 비우기
    setSelectedNode(null); // 선택된 노드 초기화
    setActiveChat(chat);
    setView('project');
  };

  const exitProject = () => {
    setActiveChat(null);
    setNodes([]);
    setSelectedNode(null);
    setView('home');
  };

  const handleRegister = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: loginId, password })
      });
      const data = await response.json();
      if (!response.ok) {
        setAuthError(data.error);
        return;
      }
      setAuthError('');
      const newUser = { id: data.id, user_id: loginId };
      localStorage.setItem('currentUser', JSON.stringify(newUser)); // 세션 저장
      setCurrentUser(newUser);
      setView('home');
    } catch (err) {
      setAuthError('백엔드 서버에 연결할 수 없습니다.');
    }
  };

  const handleLogin = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: loginId, password })
      });
      const data = await response.json();
      if (!response.ok) {
        setAuthError(data.error);
        return;
      }
      setAuthError('');
      localStorage.setItem('currentUser', JSON.stringify(data.user)); // 세션 저장
      setCurrentUser(data.user);
      setView('home');
    } catch (err) {
      setAuthError('백엔드 서버에 연결할 수 없습니다.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    try {
      const response = await fetch(`http://localhost:5000/api/auth/user/${currentUser.id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        resetAppState();
        setView('login');
        setIsDeleteModalOpen(false);
      }
    } catch (err) {
      console.error('Delete Error:', err);
    }
  };

  const toggleSmartIcon = (key) => {
    setActiveIcons(prev => ({
      next: key === 'next' ? !prev.next : false,
      node: key === 'node' ? !prev.node : false,
      sparkle: key === 'sparkle' ? !prev.sparkle : false,
    }));
  };

  const updateNodeMetadata = async (nodeId, updates) => {
    try {
      const response = await fetch(`http://localhost:5000/api/nodes/${nodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (response.ok) {
        // 선 끊기/연결 등 큰 변화가 있을 때는 확실히 await 하여 순서를 보장
        await fetchNodes(activeChat.id); 
      }
    } catch (err) {
      console.error('Update Node Error:', err);
    }
  };

  const handleConnectEdge = async (connection) => {
    const { source, target, sourceHandle } = connection;
    // sourceHandle: 'right' (형제) or 'bottom' (자식)
    const connectionType = sourceHandle === 'bottom' ? 'child' : 'sibling';

    try {
      const response = await fetch(`http://localhost:5000/api/nodes/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_id: source,
          target_id: target,
          connection_type: connectionType
        })
      });
      if (response.ok) {
        await fetchNodes(activeChat.id); // 트리 재정렬 및 변경된 라벨 반영
      } else {
        const errorData = await response.json();
        alert(errorData.error || '선 연결에 실패했습니다.');
      }
    } catch (err) {
      console.error('Connect Edge Error:', err);
      alert('백엔드 서버 오류로 선 연결에 실패했습니다.');
    }
  };

  const handleRegenerate = async () => {
    if (!selectedNode || isGenerating) return;
    setIsGenerating(true);
    try {
      const response = await fetch(`http://localhost:5000/api/messages/${selectedNode.id}/regenerate`, {
        method: 'PUT'
      });
      const data = await response.json();
      if (response.ok) {
        // 노드 리스트 데이터 갱신
        if (activeChat) fetchNodes(activeChat.id);
        // 현재 선택된 노드 상태 갱신
        setSelectedNode(prev => ({
          ...prev,
          node_title: data.node_title,
          answer_text: data.answer_text
        }));
      } else {
        alert("답변 재생성에 실패했습니다.");
      }
    } catch (err) {
      console.error('Regenerate Error:', err);
      alert("백엔드 서버와 통신할 수 없습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTitleUpdate = async () => {
    if (!activeChat || !editedTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/chats/${activeChat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editedTitle })
      });
      if (response.ok) {
        setActiveChat({ ...activeChat, title: editedTitle });
        fetchChats(currentUser.id);
      }
      setIsEditingTitle(false);
    } catch (err) {
      console.error('Update Title Error:', err);
      setIsEditingTitle(false);
    }
  };

  const handleNodeTitleUpdate = async () => {
    if (!selectedNode || !editedNodeTitle.trim()) {
      setIsEditingNodeTitle(false);
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/nodes/${selectedNode.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_title: editedNodeTitle })
      });
      if (response.ok) {
        fetchNodes(activeChat.id);
      }
      setIsEditingNodeTitle(false);
    } catch (err) {
      console.error('Update Node Title Error:', err);
      setIsEditingNodeTitle(false);
    }
  };

  const handleDeleteNode = async () => {
    if (!selectedNode) return;
    const deletedNodeId = selectedNode.id;
    try {
      const response = await fetch(`http://localhost:5000/api/nodes/${deletedNodeId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setIsDeleteNodeModalOpen(false);
        setSelectedNode(null); 
        await fetchNodes(activeChat.id); 
      } else {
        const errorData = await response.json();
        alert(errorData.error || '노드 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('Delete Node Error:', err);
      alert('서버 오류로 인해 노드를 삭제할 수 없습니다.');
    }
  };

  const handleDeleteProject = async () => {
    if (!activeChat) return;
    try {
      const response = await fetch(`http://localhost:5000/api/chats/${activeChat.id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setIsDeleteProjectModalOpen(false);
        setActiveChat(null);
        setNodes([]);
        setSelectedNode(null);
        setView('home');
        fetchChats(currentUser.id);
      }
    } catch (err) {
      console.error('Delete Project Error:', err);
    }
  };

  const generateNodeLabel = (parent, isSub) => {
    // 이제 백엔드에서 모든 라벨링을 전담하므로, 프론트엔드에서는 
    // 생성 전 임시 표시용 자리표시자만 반환합니다.
    return "...";
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && !selectedImage) return;
    if (!currentUser || isGenerating) return;

    setIsGenerating(true);

    try {
      if (activeIcons.sparkle || view === 'home') {
        // 새 프로젝트 생성 로직 (유지)
        setView('project');
        setNodes([]);
        setActiveChat({ id: 'temp', title: '분석 중...' });

        const formData = new FormData();
        formData.append('owner_id', currentUser.id);
        formData.append('text_content', inputText);
        if (selectedImage) formData.append('photo', selectedImage);

        const response = await fetch('http://localhost:5000/api/chats', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const data = await response.json();
          setInputText('');
          clearImage();
          setActiveIcons({ next: false, node: false, sparkle: false });
          setActiveChat({ id: data.chatId, title: data.title });
          fetchChats(currentUser.id);
          fetchNodes(data.chatId);
        } else {
          const errorData = await response.json();
          alert(errorData.error || '채팅 생성에 실패했습니다.');
          setView('home');
        }
        return;
      }

      if (!activeChat) return;

      const isSubMode = activeIcons.next; 
      const isContentBlock = activeIcons.node; 
      
      const formData = new FormData();
      formData.append('chat_id', activeChat.id);
      formData.append('text_content', inputText);

      if (isContentBlock) {
        formData.append('reference_node_id', "");
        formData.append('parent_id', "");
        formData.append('node_type', 'content');
        formData.append('node_label', 'B1-1'); 
      } else {
        let finalParentId = "";
        if (contextNode) {
          finalParentId = isSubMode ? contextNode.id : (contextNode.parent_id || "");
          formData.append('reference_node_id', contextNode.id);
        }
        formData.append('parent_id', finalParentId);
        formData.append('node_label', '...'); // 서버에서 확정함
        formData.append('node_type', 'qa');
      }

      if (selectedImage) formData.append('photo', selectedImage);

      const response = await fetch('http://localhost:5000/api/nodes', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setInputText('');
        clearImage();
        setActiveIcons({ next: false, node: false, sparkle: false });
        // 데이터 전송 후 반드시 서버로부터 최신 라벨이 포함된 노드 목록을 가져옴
        await fetchNodes(activeChat.id, data.id);
      } else {
        const errorData = await response.json();
        alert(errorData.error || '답변 생성에 실패했습니다.');
      }
    } catch (err) {
      console.error('Send Message Error:', err);
      alert('서버 연결에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        processImageFile(file);
      }
    }
  };

  const processImageFile = (file) => {
    if (!file) return;
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreviewUrl(reader.result);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreviewUrl(null);
  };

  const getDisplayLabel = (label) => {
    if (!label) return '';
    if (label.startsWith('B')) return label;
    if (label.includes('-S')) return label.substring(label.lastIndexOf('-S') + 1);
    return label;
  };

  const getTagColorClass = (label) => {
    if (!label) return 'tag-gray';
    if (label.startsWith('B')) return 'tag-blue'; // B로 시작하면 파란색 계열
    // 경로에 -S 가 포함되어 있으면 서브 노드로 간주 (노란색)
    if (label.includes('-S')) return 'tag-yellow';
    return 'tag-red'; // M으로 시작하는 메인 노드 (빨간색)
  };

  if (view === 'login') {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1 className="login-title">Chat for Edu</h1>
          {authError && <div className="error-message">{authError}</div>}
          <input type="text" className="login-input" placeholder="아이디" value={loginId} onChange={(e) => setLoginId(e.target.value)} />
          <input type="password" className="login-input" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="login-actions">
            <button className="btn-secondary" onClick={handleRegister}>Register</button>
            <button className="btn-primary" onClick={handleLogin}>로그인</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="mesh-background"></div>
      {/* 1. 사이드바 구성 */}
      <aside className={`sidebar ${isSidebarOpen ? 'expanded' : 'collapsed'}`}>
        {view === 'project' ? (
          /* 프로젝트 내부 사이드바 */
          <div className="sidebar-project-view">
            <div className="project-sidebar-header">
              <div className="header-top">
                <button className="icon-button" onClick={exitProject}><ArrowLeft size={20} /></button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="icon-button"><Search size={20} /></button>
                  <button className="icon-button trash-btn" onClick={() => setIsDeleteProjectModalOpen(true)}>
                    <Trash2 size={18} />
                  </button>
                  <button className="icon-button" onClick={() => {
                    setIsEditingTitle(true);
                    setEditedTitle(activeChat?.title || '');
                  }}>
                    <Edit3 size={18} />
                  </button>
                </div>
              </div>
              {isEditingTitle ? (
                <input
                  className="project-title-edit-active"
                  value={editedTitle}
                  autoFocus
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleTitleUpdate}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleUpdate()}
                />
              ) : (
                <div className="project-title-display" onClick={() => {
                  setIsEditingTitle(true);
                  setEditedTitle(activeChat?.title || '');
                }}>
                  {activeChat?.title}
                </div>
              )}
            </div>

            <div className="view-mode-tabs">
              <button className={`view-mode-btn ${viewMode === 'chat' ? 'active' : ''}`} onClick={() => setViewMode('chat')}>
                <div className="view-mode-icon"><MessageSquare size={20} /></div>
                <span>chat</span>
              </button>
              <button className={`view-mode-btn ${viewMode === 'node' ? 'active' : ''}`} onClick={() => setViewMode('node')}>
                <div className="view-mode-icon"><Compass size={20} /></div>
                <span>node</span>
              </button>
            </div>

            <div className="node-list-tabs">
              <span
                className={`node-tab ${nodeListTab === 'category' ? 'active' : ''}`}
                onClick={() => setNodeListTab('category')}
              >분류</span>
              <span
                className={`node-tab ${nodeListTab === 'score' ? 'active' : ''}`}
                onClick={() => setNodeListTab('score')}
              >이해도</span>
              <span
                className={`node-tab ${nodeListTab === 'favorite' ? 'active' : ''}`}
                onClick={() => setNodeListTab('favorite')}
              >즐겨찾기</span>
            </div>

            <div className="nodes-container">
              {nodeListTab === 'score' ? (
                /* 이해도 그룹 뷰 */
                <div className="score-group-view">
                  {[1, 2, 3, 4, 5].map(score => {
                    const groupNodes = nodes.filter(n => (n.understanding_score || 0) === score);
                    return (
                      <div key={score} className="score-group">
                        <div className="score-group-header">
                          <div className="score-group-dots">
                            {[1, 2, 3, 4, 5].map(v => (
                              <div key={v} className={`score-dot ${v <= score ? 'filled' : ''}`} />
                            ))}
                          </div>
                          <span className="score-group-label">이해도 {score}</span>
                          <span className="score-group-count">{groupNodes.length}개</span>
                        </div>
                        {groupNodes.length > 0 ? (
                          <div className="score-group-items">
                            {groupNodes.map(node => (
                              <button
                                key={node.id}
                                className={`node-item score-node-item ${selectedNode?.id === node.id ? 'selected' : ''}`}
                                onClick={() => setSelectedNode(node)}
                              >
                                <div className={`node-tag ${getTagColorClass(node.node_label)}`} title={node.node_label}>{getDisplayLabel(node.node_label)}</div>
                                <div className="node-item-title">{node.node_title}</div>
                                <ChevronRight size={14} color="#555" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="score-group-empty">블록 없음</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : nodeListTab === 'favorite' ? (
                /* 즐겨찾기 뷰 */
                <div className="score-group-view">
                  {nodes.filter(n => n.is_favorite).length === 0 ? (
                    <div className="score-group-empty" style={{ padding: '20px', textAlign: 'center' }}>즐겨찾기한 블록이 없습니다</div>
                  ) : (
                    nodes.filter(n => n.is_favorite).map(node => (
                      <button
                        key={node.id}
                        className={`node-item ${selectedNode?.id === node.id ? 'selected' : ''}`}
                        onClick={() => setSelectedNode(node)}
                      >
                        <div className={`node-tag ${getTagColorClass(node.node_label)}`} title={node.node_label}>{getDisplayLabel(node.node_label)}</div>
                        <div className="node-item-title">{node.node_title}</div>
                        <ChevronRight size={14} color="#555" />
                      </button>
                    ))
                  )}
                </div>
              ) : (
                /* 분류(기본) 트리 뷰 */
                (() => {
                  const sorted = [...nodes].sort((a, b) =>
                    a.node_label.localeCompare(b.node_label, undefined, { numeric: true })
                  );

                  return sorted.map(node => {
                    const depth = (node.node_label.match(/-S/g) || []).length;
                    const label = node.node_label;

                    if (depth > 0) {
                      let isHidden = false;
                      const parts = label.split('-');
                      for (let i = 2; i < parts.length; i += 2) {
                        const ancestorLabel = parts.slice(0, i).join('-');
                        const ancestorNode = nodes.find(n => n.node_label === ancestorLabel);
                        if (ancestorNode && collapsedNodes.has(ancestorNode.id)) {
                          isHidden = true;
                          break;
                        }
                      }
                      if (isHidden) return null;
                    }

                    const childPrefix = label + '-';
                    const hasChildren = nodes.some(n => n.node_label.startsWith(childPrefix) &&
                      (n.node_label.replace(childPrefix, '').match(/-/g) || []).length === 1
                    );
                    const isCollapsed = collapsedNodes.has(node.id);

                    return (
                      <button
                        key={node.id}
                        className={`node-item ${selectedNode?.id === node.id ? 'selected' : ''}`}
                        style={{ 
                          paddingLeft: `${16 + depth * 12}px`,
                          borderLeft: depth > 0 ? `1px solid rgba(255, 255, 255, 0.05)` : 'none'
                        }}
                        onClick={() => setSelectedNode(node)}
                      >
                        <div className={`node-tag ${getTagColorClass(label)}`} title={label}>{getDisplayLabel(label)}</div>
                        <div className="node-item-title">{node.node_title}</div>
                        {hasChildren ? (
                          <button
                            className="collapse-toggle-btn"
                            onClick={(e) => toggleCollapse(node.id, e)}
                            title={isCollapsed ? '펼치기' : '접기'}
                          >
                            {isCollapsed
                              ? <ChevronRight size={15} color="#888" />
                              : <ChevronDown size={15} color="#888" />}
                          </button>
                        ) : (
                          <ChevronRight size={16} color="#555" />
                        )}
                      </button>
                    );
                  });
                })()
              )}
            </div>
          </div>
        ) : (
          /* 메인 로비 사이드바 */
          <div className="sidebar-lobby-view">
            <div className="menu-button-container">
              <button className="icon-button" onClick={() => setIsSidebarOpen(!isSidebarOpen)}><Menu size={24} /></button>
            </div>
            <div className="sidebar-content">
              <button className="new-chat-button" onClick={() => { setView('home'); setActiveChat(null); }}>
                <Plus size={20} />
                <span>새 채팅</span>
              </button>
              <div className="recent-history">
                <div className="history-title">최근</div>
                {historyItems.map((item, i) => (
                  <button key={i} className="history-item" onClick={() => enterProject(item)}>
                    <MessageSquare size={18} />
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* 2. 메인 컨텐츠 구성 */}
      <main className={`main-content view-${view} mode-${viewMode}`}>
        <header className="top-bar">
          <div className="logo-text">Chat for Edu</div>
          <div className="user-controls">

            <div className="avatar" onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} style={{ cursor: 'pointer', position: 'relative' }}>
              {currentUser?.user_id?.charAt(0).toUpperCase()}
              {isProfileMenuOpen && (
                <div className="profile-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div className="dropdown-username">{currentUser?.user_id}</div>
                  <button className="dropdown-logout" onClick={() => {
                    resetAppState();
                    setView('login');
                  }}>로그아웃</button>
                  <button className="dropdown-delete" onClick={() => {
                    setIsDeleteModalOpen(true);
                  }}>계정 탈퇴</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className={`center-lobby fade-up-element ${view === 'home' ? 'home-layout' : ''}`}>
          {view === 'home' ? (
            <div className="greeting-wrapper">
              <h2 className="user-greeting"><span className="user-greeting-name">{currentUser?.user_id}</span>님, 안녕하세요</h2>
              <h1 className="greeting"><Sparkles size={36} fill="currentColor" color="#4285f4" style={{ marginRight: '16px' }} />무엇을 도와드릴까요?</h1>
            </div>
          ) : (
            /* 노드 상세 화면 (Project View) */
            viewMode === 'node' ? (
              /* 트리 시각화 뷰 (React Flow) - 완전 널짜 채움 */
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 1,
              }}>
                <NodeTreeView
                  nodes={nodes}
                  selectedNode={selectedNode}
                  onNodeClick={(node) => setSelectedNode(node)}
                  onDoubleClickNode={(node) => {
                    setSelectedNode(node);
                    setViewMode('chat');
                  }}
                  onUpdateMetadata={updateNodeMetadata}
                  onDeleteNode={() => setIsDeleteNodeModalOpen(true)}
                  onConnectEdge={handleConnectEdge}
                />
              </div>
            ) : (
              <div className="node-detail-container fade-up-element">
                {selectedNode ? (
                  <>
                    <div className="node-detail-header">
                      <div className="header-row">
                        <div className="node-info-group">
                          <span className="node-label-badge" title={selectedNode.node_label}>{getDisplayLabel(selectedNode.node_label)}</span>
                          <Star
                            size={20}
                            fill={selectedNode.is_favorite ? "#FFD700" : "none"}
                            color={selectedNode.is_favorite ? "#FFD700" : "#808080"}
                            style={{ cursor: 'pointer' }}
                            onClick={() => updateNodeMetadata(selectedNode.id, { is_favorite: !selectedNode.is_favorite })}
                          />
                          {isEditingNodeTitle ? (
                            <input
                              className="node-title-input"
                              value={editedNodeTitle}
                              autoFocus
                              onChange={(e) => setEditedNodeTitle(e.target.value)}
                              onBlur={handleNodeTitleUpdate}
                              onKeyDown={(e) => e.key === 'Enter' && handleNodeTitleUpdate()}
                            />
                          ) : (
                            <span
                              className="node-header-title"
                              onClick={() => {
                                setIsEditingNodeTitle(true);
                                setEditedNodeTitle(selectedNode.node_title);
                              }}
                            >
                              {selectedNode.node_title}
                            </span>
                          )}
                        </div>
                        <div className="action-btns">
                          <button className="icon-button" onClick={() => {
                            setIsEditingNodeTitle(true);
                            setEditedNodeTitle(selectedNode.node_title);
                          }}>
                            <Edit3 size={18} />
                          </button>
                          <button className="icon-button trash-btn" onClick={() => setIsDeleteNodeModalOpen(true)}>
                            <Trash2 size={18} />
                          </button>
                          <button className="icon-button" onClick={handleRegenerate} disabled={isGenerating}>
                            <RotateCcw size={18} className={isGenerating ? 'spinning-icon' : ''} />
                          </button>
                        </div>
                      </div>
                      <div className="understanding-score-wrap">
                        <span>이해도 수치</span>
                        <div className="gauge-block-container">
                          {[1, 2, 3, 4, 5].map(val => (
                            <div
                              key={val}
                              className={`gauge-block ${selectedNode.understanding_score >= val ? 'filled' : ''}`}
                              onClick={() => updateNodeMetadata(selectedNode.id, { understanding_score: val })}
                            ></div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="node-content-body">
                      {selectedNode.photo_url && (
                        <div className="node-image-display">
                          <img src={`http://localhost:5000${selectedNode.photo_url}`} alt="Q" />
                        </div>
                      )}
                      <div className="question-section">
                        <div className="section-label">{selectedNode.node_type === 'content' ? '메모 내용' : '질문'}</div>
                        <div className="text-box">{selectedNode.question_text}</div>
                      </div>
                      {selectedNode.node_type !== 'content' && (
                        <div className="answer-section">
                          <div className="section-label">답변</div>
                          <div className={`text-box ai-answer ${isGenerating ? 'loading' : ''}`}>
                            {isGenerating ? (
                              <div className="ai-loading-inline">
                                <Loader2 size={18} className="spinning-icon" />
                                <span>Gemini가 답변을 생성하고 있습니다...</span>
                              </div>
                            ) : (
                              <ReactMarkdown 
                                remarkPlugins={[remarkMath]} 
                                rehypePlugins={[rehypeKatex]}
                              >
                                {selectedNode.answer_text}
                              </ReactMarkdown>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                  </>
                ) : (
                  <div className="empty-project-placeholder">
                    {isGenerating ? (
                      <div className="ai-loading-full">
                        <Loader2 size={48} className="spinning-icon" color="#4285f4" />
                        <h3>지식을 구성하고 있습니다...</h3>
                        <p>잠시만 기다려주세요. Gemini가 질문을 분석 중입니다.</p>
                      </div>
                    ) : (
                      <>
                        <Sparkles size={48} color="#4285f4" style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <h3>대화 기록이 없습니다.</h3>
                        <p>아래 입력창에 첫 번째 질문을 남겨 대화를 시작해 보세요!</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}

        </section>

        {/* 공통 입력창 영역 */}
        <div className="input-area-wrapper">
          {imagePreviewUrl && (
            <div className="image-preview-container">
              <div className="preview-bubble"><img src={imagePreviewUrl} alt="p" /><button className="remove-image-btn" onClick={clearImage}><X size={14} /></button></div>
            </div>
          )}

          <div className={`input-container ${isGenerating ? 'disabled' : ''}`}>
            <textarea
              ref={textareaRef}
              className="input-field"
              placeholder={isGenerating ? "답변을 생성하는 중입니다..." : "Chat for Edu에게 물어보기"}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isGenerating}
              rows={1}
            />
            <div className="input-actions">
              <div className="input-actions-left">
                <label style={{ cursor: isGenerating ? 'not-allowed' : 'pointer' }}>
                  <Paperclip size={20} style={{ opacity: isGenerating ? 0.5 : 1 }} />
                  <input type="file" style={{ display: 'none' }} onChange={(e) => processImageFile(e.target.files[0])} disabled={isGenerating} />
                </label>
              </div>
              <div className="input-actions-right">
                {view === 'project' && (
                  <>
                    <div className="current-node-context-wrapper" ref={contextSelectorRef}>
                      {isContextSelectorOpen && !isGenerating && (
                        <div className="context-selector-popup">
                          <div className="context-popup-header">부모 노드 선택</div>
                          <div className="context-popup-list">
                            {nodes.map(n => (
                              <button
                                key={n.id}
                                className={`context-list-item ${contextNode?.id === n.id ? 'active' : ''}`}
                                onClick={() => {
                                  setContextNode(n);
                                  setIsContextSelectorOpen(false);
                                }}
                              >
                                <span className="item-label" title={n.node_label}>{getDisplayLabel(n.node_label)}</span>
                                <span className="item-title">{n.node_title}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <button
                        className="current-node-context-inline clickable"
                        onClick={() => !isGenerating && setIsContextSelectorOpen(!isContextSelectorOpen)}
                        disabled={isGenerating}
                        style={{ opacity: isGenerating ? 0.5 : 1 }}
                      >
                        {contextNode?.node_label || 'Root'}
                      </button>
                    </div>

                    {selectedNode && (
                      <>
                        <button
                          className={`smart-btn-inline ${activeIcons.next ? 'active' : ''}`}
                          title="세부 질문"
                          onClick={() => !isGenerating && toggleSmartIcon('next')}
                          disabled={isGenerating}
                        >
                          <CornerDownRight size={18} />
                        </button>
                        <button
                          className={`smart-btn-inline ${activeIcons.node ? 'active' : ''}`}
                          title="새 노드"
                          onClick={() => !isGenerating && toggleSmartIcon('node')}
                          disabled={isGenerating}
                        >
                          <SquarePlus size={18} />
                        </button>
                      </>
                    )}

                    <button
                      className={`smart-btn-inline ${activeIcons.sparkle ? 'active' : ''}`}
                      title="새로운 시작"
                      onClick={() => !isGenerating && toggleSmartIcon('sparkle')}
                      disabled={isGenerating}
                    >
                      <Sparkles size={18} />
                    </button>
                  </>
                )}
                <button 
                  className="icon-button send-btn-main" 
                  onClick={handleSendMessage}
                  disabled={isGenerating || (!inputText.trim() && !selectedImage)}
                  style={{ opacity: (isGenerating || (!inputText.trim() && !selectedImage)) ? 0.5 : 1 }}
                >
                  {isGenerating ? <Loader2 size={20} className="spinning-icon" /> : <Send size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 계정 탈퇴 확인 모달 */}
        {isDeleteModalOpen && (
          <div className="modal-overlay">
            <div className="modal-box">
              <p className="modal-text">계정을 탈퇴하시겠습니까?</p>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>아니오</button>
                <button className="btn-primary" onClick={handleDeleteAccount} style={{ backgroundColor: '#d96570' }}>예</button>
              </div>
            </div>
          </div>
        )}

        {/* --- Node Delete Modal --- */}
        {isDeleteNodeModalOpen && (
          <div className="modal-overlay">
            <div className="modal-box">
              <h3>블록 삭제</h3>
              <p><strong>[{selectedNode?.node_title}]</strong></p>
              <p>이 블럭을 삭제하시겠습니까?</p>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setIsDeleteNodeModalOpen(false)}>아니오</button>
                <button className="btn-danger" onClick={handleDeleteNode} style={{ backgroundColor: '#d96570', color: 'white' }}>네</button>
              </div>
            </div>
          </div>
        )}

        {/* --- Project Delete Modal --- */}
        {isDeleteProjectModalOpen && (
          <div className="modal-overlay">
            <div className="modal-box">
              <h3>프로젝트 삭제</h3>
              <p><strong>[{activeChat?.title}]</strong></p>
              <p>이 프로젝트를 전체 삭제하시겠습니까?</p>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setIsDeleteProjectModalOpen(false)}>아니오</button>
                <button className="btn-danger" onClick={handleDeleteProject} style={{ backgroundColor: '#d96570', color: 'white' }}>네</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
