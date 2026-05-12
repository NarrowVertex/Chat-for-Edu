import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Menu, Plus, Compass, Sparkles, Mic, Paperclip, MessageSquare, MessageCircle, X,
  ArrowLeft, Search, Share2, Star, Edit3, RotateCcw, ThumbsUp, ThumbsDown,
  MoreVertical, ChevronRight, ChevronDown, Hash, Send, ExternalLink, CornerDownRight, SquarePlus, Trash2, Loader2, Bell, Check,
  Pencil, Highlighter, Eraser, Type, FileText
} from 'lucide-react';
import './App.css';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import NodeTreeView from './NodeTreeView';

// AI 답변에서 가끔 섞여 들어오는 <br> 류 HTML 태그를 마크다운 줄바꿈으로 치환
const sanitizeMarkdown = (text) => {
  if (text == null) return '';
  return String(text).replace(/<br\s*\/?>(\s*<br\s*\/?>)*\s*/gi, '\n\n');
};

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

  // Sidebar History Item States (이름 변경 / 삭제 메뉴)
  const [historyMenuOpenId, setHistoryMenuOpenId] = useState(null);
  const [historyMenuPos, setHistoryMenuPos] = useState(null); // { top, right } — 포털용 좌표
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [editingHistoryTitle, setEditingHistoryTitle] = useState('');
  const [deleteHistoryItem, setDeleteHistoryItem] = useState(null);

  // Project/Node States
  const [activeChat, setActiveChat] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [contextNode, setContextNode] = useState(null);
  const [isContextSelectorOpen, setIsContextSelectorOpen] = useState(false);
  const [collapsedNodes, setCollapsedNodes] = useState(new Set()); // 접힌 노드 ID 목록
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);

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
  const [searchQuery, setSearchQuery] = useState('');
  
  // 메인 로비 전역 검색 상태
  const [lobbySearchQuery, setLobbySearchQuery] = useState('');
  const [lobbySearchResults, setLobbySearchResults] = useState([]);
  const [isLobbySearching, setIsLobbySearching] = useState(false);
  const [pendingNodeId, setPendingNodeId] = useState(null);
  
  // 정리본(PDF 요약집) 상태
  const [compiledSummary, setCompiledSummary] = useState({
    mainNodes: [],
    appendixNodes: [],
    isCompiled: false
  });

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

  // Image Modal State
  const [enlargedImage, setEnlargedImage] = useState(null);

  // Drag and Drop State
  const [isDragging, setIsDragging] = useState(false);

  // Smart Icon Toggle States
  const [activeIcons, setActiveIcons] = useState({ next: false, node: false, sparkle: false });

  // Drawing State
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingTool, setDrawingTool] = useState('pen'); // 'pen', 'highlighter', 'eraser'
  const [penColor, setPenColor] = useState('#ffffff');
  const [highlighterColor, setHighlighterColor] = useState('#ffff00');
  const [activeColorPicker, setActiveColorPicker] = useState(null); // 'pen' | 'highlighter' | null
  const [drawings, setDrawings] = useState([]);

  const PRESET_COLORS = ['#ffffff', '#ff4757', '#ffa502', '#2ed573', '#1e90ff', '#3742fa', '#ff6b81', '#ffff00', '#00ffff', '#a4b0be'];

  // Login State
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // AI 응답 로딩 상태
  const [isGenerating, setIsGenerating] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  
  const textareaRef = useRef(null);
  const contextSelectorRef = useRef(null);
  const modelSelectorRef = useRef(null);

  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);

  // --- Quiz 관련 상태 ---
  const [quizConfig, setQuizConfig] = useState({
    types: {
      ox: 0,
      multiple: 0,
      short: 0,
      descriptive: 0
    },
    difficulty: '하', // 응용도
    includeCalculation: false,
    selectedNodeIds: []
  });

  const [quizList, setQuizList] = useState([]); // { id, title, status, data, config }
  const [activeQuiz, setActiveQuiz] = useState(null); // 현재 풀고 있는 퀴즈 데이터
  const [quizState, setQuizState] = useState('setup'); // 'setup', 'taking', 'result'
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [quizFeedback, setQuizFeedback] = useState([]);
  const [showCheckFeedback, setShowCheckFeedback] = useState(null); // id of quiz that just finished
  const [quizProgressMap, setQuizProgressMap] = useState({}); // { [quizId]: { currentQuizIndex, userAnswers, quizFeedback, quizState } }
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [editingQuizTitle, setEditingQuizTitle] = useState('');
  const [quizTasks, setQuizTasks] = useState([]); // [{ tempId, chatId, status, title, resultId }]
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [projectSessionMap, setProjectSessionMap] = useState({}); // { [chatId]: { viewMode, activeQuiz, quizState, currentQuizIndex, userAnswers, quizFeedback } }

  const totalQuizCount = Object.values(quizConfig.types).reduce((a, b) => a + b, 0);

  const toggleNodeSelection = (nodeId) => {
    setQuizConfig(prev => ({
      ...prev,
      selectedNodeIds: prev.selectedNodeIds.includes(nodeId)
        ? prev.selectedNodeIds.filter(id => id !== nodeId)
        : [...prev.selectedNodeIds, nodeId]
    }));
  };

  const selectAllNodes = () => {
    setQuizConfig(prev => ({
      ...prev,
      selectedNodeIds: nodes.map(n => n.id)
    }));
  };

  const deselectAllNodes = () => {
    setQuizConfig(prev => ({
      ...prev,
      selectedNodeIds: []
    }));
  };

  // 노드 목록이 로드되면 자동으로 '전체 선택'이 기본값이 되도록 설정
  useEffect(() => {
    if (nodes.length > 0 && quizConfig.selectedNodeIds.length === 0) {
      setQuizConfig(prev => ({
        ...prev,
        selectedNodeIds: nodes.map(n => n.id)
      }));
    }
  }, [nodes]);

  // 진행 상태 자동 저장
  useEffect(() => {
    if (activeQuiz && quizState !== 'setup') {
      if (quizState === 'result') {
        // 퀴즈 결과를 봤다면 해당 퀴즈의 진행도를 초기화하여 나중에 처음부터 다시 풀 수 있게 함
        setQuizProgressMap(prev => {
          const next = { ...prev };
          delete next[activeQuiz.id];
          return next;
        });
      } else {
        setQuizProgressMap(prev => ({
          ...prev,
          [activeQuiz.id]: {
            currentQuizIndex,
            userAnswers,
            quizFeedback,
            quizState
          }
        }));
      }
    }
  }, [activeQuiz, currentQuizIndex, userAnswers, quizFeedback, quizState]);

  const handleQuizTypeChange = (type, delta) => {
    setQuizConfig(prev => {
      const newValue = Math.max(0, prev.types[type] + delta);
      const currentTotal = Object.values(prev.types).reduce((a, b) => a + b, 0);
      const newTotal = currentTotal - prev.types[type] + newValue;

      if (newTotal > 20) {
        alert("최대 20문제까지만 생성 가능합니다.");
        return prev;
      }

      return {
        ...prev,
        types: {
          ...prev.types,
          [type]: newValue
        }
      };
    });
  };

  const fetchQuizzes = async (chatId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/chats/${chatId}/quizzes`);
      if (response.ok) {
        const data = await response.json();
        setQuizList(data.map(q => ({
          id: q.id,
          title: `${activeChat?.title || '프로젝트'} 퀴즈`,
          status: q.status === 'completed' ? 'ready' : q.status,
          config: q.config,
          data: []
        })));
      }
    } catch (err) {
      console.error('Fetch Quizzes Error:', err);
    }
  };

  const handleGenerateQuiz = async () => {
    // 임시 ID로 추가
    const tempId = Date.now();
    const newQuiz = {
      id: tempId,
      title: `${activeChat.title} 퀴즈`,
      status: 'generating',
      config: { ...quizConfig },
      data: []
    };

    setQuizList(prev => [newQuiz, ...prev]); // 최신 항목이 위로 오도록

    // 전역 작업 리스트에 추가
    setQuizTasks(prev => [{
      tempId,
      chatId: activeChat.id,
      status: 'generating',
      title: newQuiz.title
    }, ...prev]);

    try {
      const response = await fetch('http://localhost:5000/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: activeChat.id,
          selectedNodeIds: quizConfig.selectedNodeIds,
          config: quizConfig
        })
      });

      if (response.ok) {
        const { quizId, quizData } = await response.json();
        
        // 작업 리스트 업데이트
        setQuizTasks(prev => prev.map(t => t.tempId === tempId ? { ...t, status: 'completed', resultId: quizId } : t));

        // 1. 현재 보고 있는 프로젝트가 생성된 퀴즈의 프로젝트인 경우 UI 업데이트
        setQuizList(prev => {
          const exists = prev.some(q => q.id === tempId);
          if (!exists) return prev;
          return prev.map(q => q.id === tempId ? { 
            ...q, 
            id: quizId,
            status: 'ready', 
            data: quizData.map(d => ({
              type: d.type,
              question: d.question,
              options: d.options,
              answer: d.answer,
              explanation: d.explanation
            }))
          } : q);
        });

        setShowCheckFeedback(quizId);
        setTimeout(() => setShowCheckFeedback(null), 2000);
      } else {
        // 서버가 명시적으로 에러를 반환한 경우에만 실패 처리
        setQuizTasks(prev => prev.map(t => t.tempId === tempId ? { ...t, status: 'failed' } : t));
        setQuizList(prev => prev.filter(q => q.id !== tempId));
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || "퀴즈 생성에 실패했습니다.");
      }
    } catch (err) {
      // 네트워크 끊김이나 화면 이동 등으로 인한 에러 발생 시
      console.error("Generate Quiz Error:", err);
      
      // 알림 상태는 일단 유지하거나 나중에 다시 확인할 수 있도록 함 (실패로 단정짓지 않음)
      // 만약 정말로 서버에 연결할 수 없는 상태라면 여기서 처리가 필요할 수 있지만, 
      // 현재는 "실패했다고 뜨는데 실제론 생성되는" 문제를 막기 위해 상태를 성급하게 바꾸지 않습니다.
      setQuizTasks(prev => prev.map(t => t.tempId === tempId ? { ...t, status: 'failed' } : t));
    }
  };

  const startQuizSession = async (quiz) => {
    let finalQuiz = quiz;
    if (!quiz.data || quiz.data.length === 0) {
      try {
        const response = await fetch(`http://localhost:5000/api/quizzes/${quiz.id}/questions`);
        if (response.ok) {
          const questions = await response.json();
          const mappedQuestions = questions.map(q => ({
            id: q.id,
            type: q.question_type,
            question: q.question_text,
            options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
            answer: q.correct_answer,
            explanation: q.explanation
          }));

          finalQuiz = { ...quiz, data: mappedQuestions };
          setQuizList(prev => prev.map(p => p.id === quiz.id ? finalQuiz : p));
        } else {
          alert("문제를 불러오지 못했습니다.");
          return;
        }
      } catch (err) {
        console.error("Fetch Questions Error:", err);
        alert("문제를 불러오지 못했습니다.");
        return;
      }
    }

    setActiveQuiz(finalQuiz);

    // 저장된 진행 상황이 있으면 복원
    if (quizProgressMap[finalQuiz.id]) {
      const p = quizProgressMap[finalQuiz.id];
      setCurrentQuizIndex(p.currentQuizIndex);
      setUserAnswers(p.userAnswers);
      setQuizFeedback(p.quizFeedback);
      setQuizState(p.quizState);
    } else {
      setQuizState('taking');
      setCurrentQuizIndex(0);
      setUserAnswers(new Array(finalQuiz.data.length).fill(''));
      setQuizFeedback(new Array(finalQuiz.data.length).fill(null));
    }
  };

  const handleDeleteQuiz = async (e, quizId) => {
    e.stopPropagation();
    if (!window.confirm("정말 이 퀴즈를 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`http://localhost:5000/api/quizzes/${quizId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setQuizList(prev => prev.filter(q => q.id !== quizId));
        setQuizProgressMap(prev => {
          const next = { ...prev };
          delete next[quizId];
          return next;
        });
      } else {
        alert("퀴즈 삭제에 실패했습니다.");
      }
    } catch (err) {
      console.error("Delete Quiz Error:", err);
      alert("서버 통신 오류가 발생했습니다.");
    }
  };

  const handleEditQuizTitleSubmit = async (e, quizId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!editingQuizTitle.trim()) {
      setEditingQuizId(null);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/quizzes/${quizId}/title`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingQuizTitle })
      });
      if (response.ok) {
        setQuizList(prev => prev.map(q => q.id === quizId ? { ...q, title: editingQuizTitle } : q));
        setEditingQuizId(null);
      } else {
        alert("퀴즈 제목 수정에 실패했습니다.");
      }
    } catch (err) {
      console.error("Edit Quiz Title Error:", err);
      alert("서버 통신 오류가 발생했습니다.");
    }
  };

  const handleNotifClick = (task) => {
    if (task.status === 'generating') return;

    // 1. 해당 프로젝트로 이동 (ID 타입 불일치 방지를 위해 String 변환 비교)
    const isSameProject = activeChat && String(activeChat.id) === String(task.chatId);
    
    if (!isSameProject) {
      const targetChat = historyItems.find(c => String(c.id) === String(task.chatId));
      if (targetChat) {
        enterProject(targetChat);
      } else {
        // historyItems에 아직 없을 수도 있으므로(방금 생성된 경우 등), 최소 정보로 이동 시도
        enterProject({ id: task.chatId, title: task.title });
      }
    } else {
      // 이미 같은 프로젝트를 가리키고 있더라도, 뷰(Home -> Project)는 전환해줘야 함
      setView('project');
    }
    
    // 무조건 퀴즈 탭으로 이동
    setViewMode('quiz');

    // 2. 알림 삭제
    setQuizTasks(prev => prev.filter(t => t.tempId !== task.tempId));
    
    // 3. 알림창 닫기
    setIsNotificationOpen(false);
  };

  const handleAnswerSelect = (val) => {
    setUserAnswers(prev => {
      const next = [...prev];
      next[currentQuizIndex] = val;
      return next;
    });
  };

  const handleQuizSubmit = async () => {
    setIsGenerating(true); // 채점 중 로딩 표시용으로 재사용
    const newFeedback = [...quizFeedback];
    
    try {
      for (let i = 0; i < activeQuiz.data.length; i++) {
        const q = activeQuiz.data[i];
        if (q.type === 'descriptive') {
          const response = await fetch('http://localhost:5000/api/quiz/grade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question_text: q.question,
              correct_answer: q.answer,
              explanation: q.explanation,
              user_answer: userAnswers[i]
            })
          });
          if (response.ok) {
            const data = await response.json();
            newFeedback[i] = data; // { score, feedback }
          }
        }
      }
      setQuizFeedback(newFeedback);
      setQuizState('result');
    } catch (err) {
      console.error('Quiz Submit Error:', err);
      alert('채점 중 오류가 발생했습니다.');
      setQuizState('result'); // 오류나더라도 일단 결과창으로
    } finally {
      setIsGenerating(false);
    }
  };

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

  // AI 모델 선택 팝업 닫기 (Click Outside)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target)) {
        setIsModelSelectorOpen(false);
      }
    };

    if (isModelSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside, true);
    } else {
      document.removeEventListener('mousedown', handleClickOutside, true);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isModelSelectorOpen]);

  // 사용 가능한 AI 모델 목록 불러오기
  const fetchModels = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/ai-models');
      if (response.ok) {
        const data = await response.json();
        setAvailableModels(data);
      }
    } catch (err) {
      console.error('Fetch Models Error:', err);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  // 로그인 시 혹은 모델 목록 로드 시 선택된 모델 동기화
  useEffect(() => {
    if (availableModels.length > 0) {
      if (currentUser?.preferred_model && availableModels.some(m => m.id === currentUser.preferred_model)) {
        setSelectedModelId(currentUser.preferred_model);
      } else {
        setSelectedModelId(availableModels[0].id);
      }
    }
  }, [currentUser, availableModels]);

  const handleModelChange = async (modelId) => {
    setSelectedModelId(modelId);
    if (currentUser) {
      try {
        await fetch(`http://localhost:5000/api/auth/user/${currentUser.id}/preferred-model`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferred_model: modelId })
        });
      } catch (err) {
        console.error('Update Preferred Model Error:', err);
      }
    }
  };

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

  // 프로젝트 변경 또는 뷰 모드(채팅/노드/퀴즈) 변경 시 필기 모드 해제
  useEffect(() => {
    setIsDrawingMode(false);
    setActiveColorPicker(null);
  }, [activeChat?.id, viewMode]);

  // 로그인된 사용자별로 localStorage에서 노드 모드 viewport 복원
  // 로그아웃하거나 다른 계정으로 바꾸면 이전 사용자의 viewport는 메모리에서 제거됨
  useEffect(() => {
    if (!currentUser?.id) {
      // 로그아웃 시 viewport 메모리에서 제거 (다른 사용자 데이터 누출 방지)
      setProjectSessionMap(prev => {
        const next = {};
        for (const [cid, session] of Object.entries(prev)) {
          const { viewport, ...rest } = session;
          next[cid] = rest;
        }
        return next;
      });
      return;
    }
    try {
      const saved = localStorage.getItem(`gemini_node_viewports_${currentUser.id}`);
      if (!saved) return;
      const viewports = JSON.parse(saved);
      setProjectSessionMap(prev => {
        const next = { ...prev };
        for (const [chatId, viewport] of Object.entries(viewports)) {
          next[chatId] = { ...(next[chatId] || {}), viewport };
        }
        return next;
      });
    } catch (err) {
      console.error('Load viewports error:', err);
    }
  }, [currentUser]);

  // 사이드바 메뉴 열려있을 때 외부 클릭 / Esc 감지하여 닫기
  useEffect(() => {
    if (historyMenuOpenId === null) return;
    const handleOutsideClick = (e) => {
      if (e.target.closest('.history-action-menu')) return;
      if (e.target.closest('.history-item-menu-btn')) return;
      setHistoryMenuOpenId(null);
      setHistoryMenuPos(null);
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setHistoryMenuOpenId(null);
        setHistoryMenuPos(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [historyMenuOpenId]);

  useEffect(() => {
    if (activeChat) {
      const targetNodeId = pendingNodeId;
      fetchNodes(activeChat.id, targetNodeId);
      if (targetNodeId) {
        setPendingNodeId(null);
      }
      fetchQuizzes(activeChat.id);
    }
  }, [activeChat]);

  // 전역 검색 API 호출 Effect
  useEffect(() => {
    if (!currentUser || !lobbySearchQuery || lobbySearchQuery.trim() === '') {
      setLobbySearchResults([]);
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      setIsLobbySearching(true);
      try {
        const res = await fetch(`http://localhost:5000/api/search/${currentUser.id}?q=${encodeURIComponent(lobbySearchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setLobbySearchResults(data);
        }
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setIsLobbySearching(false);
      }
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [lobbySearchQuery, currentUser]);

  const handleGlobalSearchResultClick = async (result) => {
    const chatItem = historyItems.find(item => String(item.id) === String(result.chatId)) || { id: result.chatId, title: result.chatTitle };
    
    if (result.type === 'chat') {
      enterProject(chatItem);
    } else if (result.type === 'node') {
      setPendingNodeId(result.nodeId);
      enterProject(chatItem);
      setViewMode('node'); // 노드 뷰 모드로 전환하여 해당 블록을 바로 볼 수 있게 함
    }
  };

  useEffect(() => {
    // 사용자가 현재 보고 있는 노드를 기본 컨텍스트(부모)로 설정
    if (selectedNode) setContextNode(selectedNode);
  }, [selectedNode]);

  const saveCurrentSession = (chatId) => {
    if (!chatId) return;
    setProjectSessionMap(prev => ({
      ...prev,
      [chatId]: {
        ...(prev[chatId] || {}), // 기존 viewport 등 보존
        viewMode,
        activeQuiz,
        quizState,
        currentQuizIndex,
        userAnswers,
        quizFeedback
      }
    }));
  };

  // 노드 모드 viewport(pan/zoom) 위치 저장 — pan/zoom 종료 시점에만 호출됨
  // 메모리(projectSessionMap) + localStorage 둘 다 갱신하며 사용자별로 분리
  const handleNodeViewportChange = (viewport) => {
    if (!activeChat?.id || !currentUser?.id) return;
    setProjectSessionMap(prev => {
      const next = {
        ...prev,
        [activeChat.id]: {
          ...(prev[activeChat.id] || {}),
          viewport
        }
      };
      try {
        const onlyViewports = {};
        for (const [cid, session] of Object.entries(next)) {
          if (session.viewport) onlyViewports[cid] = session.viewport;
        }
        localStorage.setItem(`gemini_node_viewports_${currentUser.id}`, JSON.stringify(onlyViewports));
      } catch (err) {
        console.error('Save viewports error:', err);
      }
      return next;
    });
  };

  const restoreSession = (chatId) => {
    const session = projectSessionMap[chatId];
    if (session) {
      setViewMode(session.viewMode || 'chat');
      setActiveQuiz(session.activeQuiz || null);
      setQuizState(session.quizState || 'setup');
      setCurrentQuizIndex(session.currentQuizIndex || 0);
      setUserAnswers(session.userAnswers || []);
      setQuizFeedback(session.quizFeedback || []);
    } else {
      // 기본값 세팅
      setViewMode('chat');
      setActiveQuiz(null);
      setQuizState('setup');
      setCurrentQuizIndex(0);
      setUserAnswers([]);
      setQuizFeedback([]);
    }
  };

  const enterProject = (chat) => {
    if (activeChat && String(activeChat.id) === String(chat.id)) {
      setView('project');
      return;
    }
    
    // 1. 현재 프로젝트 상태 저장
    if (activeChat) {
      saveCurrentSession(activeChat.id);
    }

    setNodes([]); // 이전 프로젝트 노드 비우기
    setSelectedNode(null); // 선택된 노드 초기화
    setQuizList([]); // 이전 프로젝트 퀴즈 목록 비우기
    setDrawings([]); // 이전 프로젝트 필기 비우기
    setIsDrawingMode(false); // 필기 모드 초기화
    setCompiledSummary({ mainNodes: [], appendixNodes: [], isCompiled: false });
    
    // 2. 새 프로젝트 정보 설정
    setActiveChat(chat);
    
    // 3. 서버에서 최신 드로잉 데이터 가져오기 (사이드바 데이터가 stale할 수 있으므로)
    const syncDrawings = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/chats/detail/${chat.id}`);
        if (response.ok) {
          const freshChat = await response.json();
          if (freshChat.drawings) {
            setDrawings(JSON.parse(freshChat.drawings));
          } else {
            setDrawings([]);
          }
          // 로컬 데이터도 최신화
          setActiveChat(freshChat);
        } else {
          // 실패 시 기존 데이터 사용
          if (chat.drawings) {
            setDrawings(JSON.parse(chat.drawings));
          } else {
            setDrawings([]);
          }
        }
      } catch (err) {
        console.error('Sync drawings error:', err);
        if (chat.drawings) {
          setDrawings(JSON.parse(chat.drawings));
        } else {
          setDrawings([]);
        }
      }
    };

    // 4. 새 프로젝트 세션 복구
    restoreSession(chat.id);
    syncDrawings();
    
    setView('project');
  };

  const exitProject = () => {
    if (activeChat) {
      saveCurrentSession(activeChat.id);
    }
    setActiveChat(null);
    setNodes([]);
    setSelectedNode(null);
    setViewMode('chat'); // 홈으로 나갈 때 뷰 모드 초기화
    setView('home');
    setCompiledSummary({ mainNodes: [], appendixNodes: [], isCompiled: false });
  };

  const handleGenerateSummary = () => {
    // 1. M 본문 그룹 추출 (라벨이 M으로 시작하면서 -S가 없는 메인 노드들)
    const mNodes = nodes.filter(n => n.node_label?.startsWith('M') && !n.node_label?.includes('-S'));
    // 자연스러운 번호 순서로 정렬 (예: M1-1, M2-1, M10-1)
    mNodes.sort((a, b) => (a.node_label || '').localeCompare(b.node_label || '', undefined, { numeric: true }));

    const mainResult = [];
    const handledIds = new Set();

    mNodes.forEach(mNode => {
      mainResult.push({ ...mNode, isSubNode: false });
      handledIds.add(mNode.id);

      // 해당 M 노드 바로 뒤에 파생 하위 S 노드들 밀착 배치
      if (mNode.node_label) {
        const sChildNodes = nodes.filter(n => 
          n.node_label?.startsWith(`${mNode.node_label}-S`)
        );
        sChildNodes.sort((a, b) => (a.node_label || '').localeCompare(b.node_label || '', undefined, { numeric: true }));
        
        sChildNodes.forEach(sNode => {
          if (!handledIds.has(sNode.id)) {
            mainResult.push({ ...sNode, isSubNode: true });
            handledIds.add(sNode.id);
          }
        });
      }
    });

    // 부모 매칭이 안 된 나머지 M 계열 노드나 예외 노드 중복 방지 처리
    nodes.forEach(n => {
      if (!handledIds.has(n.id) && !n.node_label?.startsWith('B')) {
        const isSub = n.node_label?.includes('-S');
        mainResult.push({ ...n, isSubNode: isSub });
        handledIds.add(n.id);
      }
    });

    // 2. B 부록 그룹 추출 (라벨이 B로 시작하면서 -S가 없는 브랜치 노드들)
    const bNodes = nodes.filter(n => n.node_label?.startsWith('B') && !n.node_label?.includes('-S'));
    bNodes.sort((a, b) => (a.node_label || '').localeCompare(b.node_label || '', undefined, { numeric: true }));

    const appendixResult = [];
    bNodes.forEach(bNode => {
      appendixResult.push({ ...bNode, isSubNode: false });
      handledIds.add(bNode.id);

      if (bNode.node_label) {
        const bChildNodes = nodes.filter(n => 
          n.node_label?.startsWith(`${bNode.node_label}-S`)
        );
        bChildNodes.sort((a, b) => (a.node_label || '').localeCompare(b.node_label || '', undefined, { numeric: true }));
        
        bChildNodes.forEach(sNode => {
          if (!handledIds.has(sNode.id)) {
            appendixResult.push({ ...sNode, isSubNode: true });
            handledIds.add(sNode.id);
          }
        });
      }
    });

    // 남은 B 계열 노드 처리
    nodes.forEach(n => {
      if (n.node_label?.startsWith('B') && !handledIds.has(n.id)) {
        const isSub = n.node_label?.includes('-S');
        appendixResult.push({ ...n, isSubNode: isSub });
        handledIds.add(n.id);
      }
    });

    setCompiledSummary({
      mainNodes: mainResult,
      appendixNodes: appendixResult,
      isCompiled: true
    });
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

  const updateNodeMetadata = async (nodeId, updates, skipFetch = false) => {
    try {
      const response = await fetch(`http://localhost:5000/api/nodes/${nodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (response.ok) {
        // 로컬 상태 즉시 동기화 (드래그 좌표, 별점, 이해도 등)
        const updateItem = (prev) => {
          if (!prev) return prev;
          return prev.id === Number(nodeId) ? { ...prev, ...updates } : prev;
        };

        setNodes(prev => prev.map(node => updateItem(node)));
        setSelectedNode(prev => updateItem(prev));
        setContextNode(prev => updateItem(prev));

        if (!skipFetch) {
          // 선 끊기/연결 등 큰 변화가 있을 때는 확실히 await 하여 순서를 보장
          await fetchNodes(activeChat.id);
        }
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
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: selectedModelId })
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

  // 사이드바 블록 메뉴 토글 (⋯ 클릭) — ⋯ 버튼의 위치를 계산해 포털로 띄울 좌표 저장
  const handleHistoryMenuToggle = (item, e) => {
    e.stopPropagation();
    if (historyMenuOpenId === item.id) {
      setHistoryMenuOpenId(null);
      setHistoryMenuPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setHistoryMenuPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right
    });
    setHistoryMenuOpenId(item.id);
  };

  // 사이드바 블록 이름 변경 시작
  const handleHistoryRenameStart = (item, e) => {
    if (e) e.stopPropagation();
    setEditingHistoryId(item.id);
    setEditingHistoryTitle(item.title);
    setHistoryMenuOpenId(null);
    setHistoryMenuPos(null);
  };

  // 사이드바 블록 이름 변경 저장 (PATCH)
  const handleHistoryRenameSubmit = async (chatId) => {
    const newTitle = editingHistoryTitle.trim();
    if (!newTitle) {
      setEditingHistoryId(null);
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      if (response.ok) {
        if (activeChat && String(activeChat.id) === String(chatId)) {
          setActiveChat({ ...activeChat, title: newTitle });
        }
        if (currentUser) fetchChats(currentUser.id);
      }
    } catch (err) {
      console.error('Rename History Error:', err);
    } finally {
      setEditingHistoryId(null);
    }
  };

  // 사이드바 블록 삭제 확정 (DELETE)
  const handleHistoryDeleteConfirm = async () => {
    if (!deleteHistoryItem) return;
    const targetId = deleteHistoryItem.id;
    try {
      const response = await fetch(`http://localhost:5000/api/chats/${targetId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        if (activeChat && String(activeChat.id) === String(targetId)) {
          setActiveChat(null);
          setNodes([]);
          setSelectedNode(null);
          setView('home');
        }
        if (currentUser) fetchChats(currentUser.id);
      }
    } catch (err) {
      console.error('Delete History Error:', err);
    } finally {
      setDeleteHistoryItem(null);
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
        formData.append('model_id', selectedModelId);
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
      formData.append('model_id', selectedModelId);

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
    
    // 이미지 파일 여부 확인
    if (!file.type.startsWith('image/')) {
      alert("이미지 파일(jpg, png, webp 등)만 업로드 가능합니다.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("이미지 크기는 10MB를 초과할 수 없습니다.");
      return;
    }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreviewUrl(reader.result);
    reader.readAsDataURL(file);
  };

  // --- Drag and Drop Handlers ---
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // 드래그가 영역 밖으로 완전히 나갔을 때만 상태 해제
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
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
    <div 
      className={`app-container mode-${viewMode} view-${view}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="mesh-background"></div>
      {/* 드래그 앤 드롭 오버레이 */}
      {isDragging && (
        <div className="drag-drop-overlay">
          <div className="drag-drop-box">
            <div className="drag-drop-icon-wrap">
              <Paperclip size={48} color="#4285f4" />
            </div>
            <h3>사진을 여기에 놓으세요</h3>
            <p>Chat for Edu가 사진을 분석하여 답변해 드립니다.</p>
          </div>
        </div>
      )}
      {/* 1. 사이드바 구성 */}
      <aside className={`sidebar ${isSidebarOpen ? 'expanded' : 'collapsed'}`}>
        {view === 'project' ? (
          /* 프로젝트 내부 사이드바 */
          <div className="sidebar-project-view">
            <div className="project-sidebar-header">
              <div className="header-top">
                <button className="icon-button" onClick={exitProject}><ArrowLeft size={20} /></button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="icon-button" onClick={() => {
                    setIsEditingTitle(true);
                    setEditedTitle(activeChat?.title || '');
                  }}>
                    <Edit3 size={18} />
                  </button>
                  <button className="icon-button trash-btn" onClick={() => setIsDeleteProjectModalOpen(true)}>
                    <Trash2 size={18} />
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
              <button className={`view-mode-btn ${viewMode === 'quiz' ? 'active' : ''}`} onClick={() => setViewMode('quiz')}>
                <div className="view-mode-icon"><MessageCircle size={20} /></div>
                <span>quiz</span>
              </button>
              <button className={`view-mode-btn ${viewMode === 'summary' ? 'active' : ''}`} onClick={() => setViewMode('summary')}>
                <div className="view-mode-icon"><FileText size={20} /></div>
                <span>정리본</span>
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

            <div className="node-search-bar" style={{ padding: '0 16px 12px 16px' }}>
               <div style={{ position: 'relative' }}>
                 <input 
                   type="text" 
                   placeholder="검색어를 입력하세요..." 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   style={{ 
                     width: '100%', 
                     padding: '8px 12px 8px 32px', 
                     borderRadius: '8px', 
                     border: '1px solid rgba(255, 255, 255, 0.1)', 
                     backgroundColor: 'rgba(0, 0, 0, 0.2)',
                     color: '#fff',
                     fontSize: '14px',
                     boxSizing: 'border-box'
                   }}
                 />
                 <Search size={16} color="#888" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                 {searchQuery && (
                   <button 
                     onClick={() => setSearchQuery('')}
                     style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '0', display: 'flex' }}
                   >
                     <X size={14} color="#888" />
                   </button>
                 )}
               </div>
            </div>

            <div className="nodes-container">
              {searchQuery ? (
                <div className="search-results-view">
                  {(() => {
                    const lowerQuery = searchQuery.toLowerCase();
                    const filteredNodes = nodes.filter(n => 
                      (n.node_title && n.node_title.toLowerCase().includes(lowerQuery)) ||
                      (n.question_text && n.question_text.toLowerCase().includes(lowerQuery)) ||
                      (n.answer_text && n.answer_text.toLowerCase().includes(lowerQuery))
                    );
                    
                    if (filteredNodes.length === 0) {
                      return <div className="score-group-empty" style={{ padding: '20px', textAlign: 'center' }}>검색 결과가 없습니다</div>;
                    }
                    
                    return filteredNodes.map(node => (
                      <button
                        key={node.id}
                        className={`node-item ${selectedNode?.id === node.id ? 'selected' : ''}`}
                        onClick={() => setSelectedNode(node)}
                      >
                        <div className={`node-tag ${getTagColorClass(node.node_label)}`} title={node.node_label}>{getDisplayLabel(node.node_label)}</div>
                        <div className="node-item-title">{node.node_title}</div>
                        <ChevronRight size={14} color="#555" />
                      </button>
                    ));
                  })()}
                </div>
              ) : nodeListTab === 'score' ? (
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
              <div className="lobby-search-bar" style={{ padding: '0 12px 12px 12px' }}>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    placeholder="프로젝트 및 블록 검색..." 
                    value={lobbySearchQuery}
                    onChange={(e) => setLobbySearchQuery(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '8px 12px 8px 32px', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(255, 255, 255, 0.1)', 
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      color: '#fff',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <Search size={16} color="#888" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  {lobbySearchQuery && (
                    <button 
                      onClick={() => setLobbySearchQuery('')}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '0', display: 'flex' }}
                    >
                      <X size={14} color="#888" />
                    </button>
                  )}
                </div>
              </div>

              {lobbySearchQuery ? (
                <div className="lobby-search-results" style={{ overflowY: 'auto', flex: 1, padding: '0 12px' }}>
                  {isLobbySearching ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
                      <Loader2 size={16} className="spinning-icon" style={{ display: 'inline-block', marginRight: '8px' }} />
                      검색 중...
                    </div>
                  ) : lobbySearchResults.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
                      검색 결과가 없습니다
                    </div>
                  ) : (
                    lobbySearchResults.map((result) => (
                      <div 
                        key={result.id}
                        onClick={() => handleGlobalSearchResultClick(result)}
                        style={{ 
                          padding: '10px', 
                          borderRadius: '8px', 
                          cursor: 'pointer', 
                          marginBottom: '8px',
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: result.type === 'chat' ? '#4285f4' : '#e0e0e0', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          {result.type === 'chat' ? '📁' : '📄'}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {result.type === 'chat' ? result.title : `[${result.chatTitle}] ${result.title}`}
                          </span>
                        </div>
                        {result.snippet && (
                          <div style={{ fontSize: '12px', color: '#aaa', lineHeight: '1.4', wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {result.snippet}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <>
                  <button className="new-chat-button" onClick={() => { setView('home'); setActiveChat(null); }}>
                <Plus size={20} />
                <span>새 채팅</span>
              </button>
              <div className="recent-history">
                <div className="history-title">최근</div>
                {historyItems.map((item, i) => (
                  <div key={item.id ?? i} className="history-item-wrapper">
                    {editingHistoryId === item.id ? (
                      <div className="history-item history-item-editing">
                        <MessageSquare size={18} />
                        <input
                          autoFocus
                          className="history-rename-input"
                          value={editingHistoryTitle}
                          onChange={(e) => setEditingHistoryTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleHistoryRenameSubmit(item.id);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setEditingHistoryId(null);
                            }
                          }}
                          onBlur={() => handleHistoryRenameSubmit(item.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    ) : (
                      <>
                        <button className="history-item" onClick={() => enterProject(item)}>
                          <MessageSquare size={18} />
                          <span>{item.title}</span>
                        </button>
                        <button
                          className={`history-item-menu-btn ${historyMenuOpenId === item.id ? 'active' : ''}`}
                          onClick={(e) => handleHistoryMenuToggle(item, e)}
                          aria-label="더보기"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              </>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* 사이드바 항목 메뉴 (포털: overflow에 잘리지 않도록 body 직속 렌더) */}
      {historyMenuOpenId !== null && historyMenuPos && createPortal(
        <div
          className="history-action-menu"
          style={{ position: 'fixed', top: historyMenuPos.top, right: historyMenuPos.right }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              const item = historyItems.find(it => it.id === historyMenuOpenId);
              if (item) handleHistoryRenameStart(item, e);
            }}
          >
            <Edit3 size={14} />
            <span>이름 변경</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const item = historyItems.find(it => it.id === historyMenuOpenId);
              if (item) setDeleteHistoryItem(item);
              setHistoryMenuOpenId(null);
              setHistoryMenuPos(null);
            }}
          >
            <Trash2 size={14} />
            <span>삭제</span>
          </button>
        </div>,
        document.body
      )}

      {/* 2. 메인 컨텐츠 구성 */}
      <main className={`main-content view-${view} mode-${viewMode}`}>
        <header className="top-bar">
          <div className="logo-text">Chat for Edu</div>
          <div className="user-controls">
            <div className="notification-wrapper" style={{ position: 'relative' }}>
              <button 
                className={`icon-button bell-btn ${quizTasks.some(t => t.status === 'generating') ? 'pulse' : ''}`}
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                style={{ marginRight: '16px' }}
              >
                <Bell size={22} color={isNotificationOpen ? '#4285f4' : '#5f6368'} />
                {quizTasks.length > 0 && <span className="notification-badge">{quizTasks.length}</span>}
              </button>

              {isNotificationOpen && (
                <div className="notification-dropdown glass-panel-v3">
                  <div className="notif-header">알림</div>
                  <div className="notif-list">
                    {quizTasks.length === 0 ? (
                      <div className="notif-empty">새로운 알림이 없습니다.</div>
                    ) : (
                      quizTasks.map((task, i) => (
                        <div 
                          key={i} 
                          className={`notif-item ${task.status !== 'generating' ? 'clickable' : ''}`}
                          onClick={() => handleNotifClick(task)}
                        >
                          <div className="notif-icon">
                            {task.status === 'generating' ? <Loader2 size={16} className="spinning-icon" /> : 
                             task.status === 'completed' ? <Check size={16} color="#00c896" /> : <X size={16} color="#ff4d4d" />}
                          </div>
                          <div className="notif-content">
                            <div className="notif-title">{task.title}</div>
                            <div className="notif-desc">
                              {task.status === 'generating' ? '퀴즈가 생성되는 중입니다...' : 
                               task.status === 'completed' ? '퀴즈 생성이 완료되었습니다. (클릭하여 이동)' : '퀴즈 생성에 실패했습니다.'}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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
              <div className="node-view-split fade-in">
                <div className="node-graph-area">
                  <NodeTreeView
                    nodes={nodes}
                    selectedNode={selectedNode}
                    onNodeClick={(node) => setSelectedNode(node)}
                    onDoubleClickNode={(node) => {
                      setSelectedNode(node);
                      setIsNodeModalOpen(true);
                    }}
                    onUpdateMetadata={updateNodeMetadata}
                    onDeleteNode={() => setIsDeleteNodeModalOpen(true)}
                    onConnectEdge={handleConnectEdge}
                    savedViewport={activeChat ? projectSessionMap[activeChat.id]?.viewport : undefined}
                    onViewportChange={handleNodeViewportChange}
                    isDrawingMode={isDrawingMode}
                    drawingTool={drawingTool}
                    penColor={penColor}
                    highlighterColor={highlighterColor}
                    drawings={drawings}
                    setDrawings={setDrawings}
                    onSaveDrawings={async (newDrawings) => {
                      if (!activeChat) return;
                      try {
                        await fetch(`http://localhost:5000/api/chats/${activeChat.id}/drawings`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ drawings: JSON.stringify(newDrawings) })
                        });
                        // update activeChat local ref
                        const drawingsStr = JSON.stringify(newDrawings);
                        setActiveChat(prev => ({ ...prev, drawings: drawingsStr }));
                        
                        // 사이드바 목록(historyItems)도 동기화하여 프로젝트 전환 시 데이터 유지
                        setHistoryItems(prev => prev.map(item => 
                          String(item.id) === String(activeChat.id) 
                            ? { ...item, drawings: drawingsStr } 
                            : item
                        ));
                      } catch (err) {
                        console.error('Failed to save drawings:', err);
                      }
                    }}
                  />
                </div>

                {/* 우측 패널 (메시지 형태) */}
                {isNodeModalOpen && selectedNode && (
                  <div className="node-right-panel">
                    <div className="panel-header">
                      <div>
                        <div className={`node-tag ${getTagColorClass(selectedNode.node_label)}`}>
                          {getDisplayLabel(selectedNode.node_label)}
                        </div>
                        {isEditingNodeTitle ? (
                          <div className="title-edit-container">
                            <input
                              type="text"
                              className="title-edit-input"
                              value={editedNodeTitle}
                              onChange={(e) => setEditedNodeTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleNodeTitleUpdate();
                                if (e.key === 'Escape') setIsEditingNodeTitle(false);
                              }}
                              autoFocus
                            />
                            <div className="title-edit-actions">
                              <button onClick={handleNodeTitleUpdate}><Check size={16} /></button>
                              <button onClick={() => setIsEditingNodeTitle(false)}><X size={16} /></button>
                            </div>
                          </div>
                        ) : (
                          <div className="editable-title-wrapper">
                            <h3>{selectedNode.node_title || '(제목 없음)'}</h3>
                            <button 
                              className="edit-title-btn" 
                              onClick={() => {
                                setEditedNodeTitle(selectedNode.node_title);
                                setIsEditingNodeTitle(true);
                              }}
                              title="제목 수정"
                            >
                              <Edit3 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                      <button className="panel-close-btn" onClick={() => setIsNodeModalOpen(false)}>
                        <X size={24} />
                      </button>
                    </div>
                    
                    <div className="panel-scroll-area">
                      {/* 질문 (사용자 말풍선) */}
                      <div className="panel-message user">
                        <span className="panel-message-label">{selectedNode.node_type === 'content' ? '메모' : '질문'}</span>
                        <div className="panel-bubble">
                          {selectedNode.question_text}
                        </div>
                      </div>

                      {/* 답변 (AI 말풍선) */}
                      {selectedNode.node_type !== 'content' && selectedNode.answer_text && (
                        <div className="panel-message ai">
                          <span className="panel-message-label">AI 답변</span>
                          <div className="panel-bubble">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {sanitizeMarkdown(selectedNode.answer_text)}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : viewMode === 'quiz' ? (
              <div className="quiz-container fade-up-element">
                {quizState === 'setup' ? (
                  <div className="quiz-layout-v3">
                    {/* Left: Setup Card (Original Structure Restored) */}
                    <div className="quiz-setup-card-v3 glass-panel-v3">
                      <div className="quiz-setup-header-v3">
                        <div className="quiz-badge-v3">QUIZ MODE</div>
                        <h2>학습 퀴즈 설정</h2>
                        <p>학습한 내용을 점검하기 위한 맞춤형 문제를 구성하세요.</p>
                      </div>

                      <div className="quiz-setup-grid-v3">
                        {/* Column 1: 출제 범위 (캡슐 UI) */}
                        <div className="setup-col-v3">
                          <div className="col-title-v3">출제 범위</div>
                          <label className="bulk-check-v3">
                            <div className="checkbox-wrapper-v3">
                              <input
                                type="checkbox"
                                id="bulk-select-quiz"
                                checked={nodes.length > 0 && quizConfig.selectedNodeIds.length === nodes.length}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setQuizConfig(prev => ({ ...prev, selectedNodeIds: nodes.map(n => n.id) }));
                                  } else {
                                    setQuizConfig(prev => ({ ...prev, selectedNodeIds: [] }));
                                  }
                                }}
                              />
                              <div className="custom-check-v3"></div>
                            </div>
                            <span>전체 선택</span>
                          </label>
                          <div className="capsule-frame-v3">
                            <div className="capsule-scroll-v3">
                              {nodes.length > 0 ? (
                                nodes.map(node => (
                                  <div
                                    key={node.id}
                                    className={`node-card-v3 ${quizConfig.selectedNodeIds.includes(node.id) ? 'active' : ''}`}
                                    onClick={() => toggleNodeSelection(node.id)}
                                  >
                                    <div className="checkbox-wrapper-v3">
                                      <input
                                        type="checkbox"
                                        checked={quizConfig.selectedNodeIds.includes(node.id)}
                                        readOnly
                                      />
                                      <div className="custom-check-v3"></div>
                                    </div>
                                    <div className="node-info-v3">
                                      <span className="n-label-v3">{getDisplayLabel(node.node_label)}</span>
                                      <span className="n-title-v3">{node.node_title}</span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="empty-msg-v3">등록된 노드가 없습니다.</div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Column 2: 문제 유형 및 개수 */}
                        <div className="setup-col-v3">
                          <div className="col-title-v3">문제 유형 및 개수</div>
                          <div className="total-sum-display-v3">
                            전체 문제: <span className={totalQuizCount > 0 ? 'highlight' : ''}>{totalQuizCount}</span> / 20 개
                          </div>
                          <div className="type-controls-v3">
                            <div className="type-row-v3">
                              <span>O,X 문제:</span>
                              <div className="counter-v3">
                                <button onClick={() => handleQuizTypeChange('ox', -1)}>-</button>
                                <span className="count">{quizConfig.types.ox}</span>
                                <button onClick={() => handleQuizTypeChange('ox', 1)}>+</button>
                              </div>
                              <span className="unit">개</span>
                            </div>
                            <div className="type-row-v3">
                              <span>객관식:</span>
                              <div className="counter-v3">
                                <button onClick={() => handleQuizTypeChange('multiple', -1)}>-</button>
                                <span className="count">{quizConfig.types.multiple}</span>
                                <button onClick={() => handleQuizTypeChange('multiple', 1)}>+</button>
                              </div>
                              <span className="unit">개</span>
                            </div>

                            {/* 계산 문제 포함 (주관식/서술형 전용) */}
                            <label className="calc-toggle-v3">
                              <div className="checkbox-wrapper-v3">
                                <input
                                  type="checkbox"
                                  checked={quizConfig.includeCalculation}
                                  onChange={(e) => setQuizConfig({ ...quizConfig, includeCalculation: e.target.checked })}
                                />
                                <div className="custom-check-v3"></div>
                              </div>
                              <span>계산 문제 포함</span>
                            </label>

                            <div className="type-row-v3">
                              <span>주관식:</span>
                              <div className="counter-v3">
                                <button onClick={() => handleQuizTypeChange('short', -1)}>-</button>
                                <span className="count">{quizConfig.types.short}</span>
                                <button onClick={() => handleQuizTypeChange('short', 1)}>+</button>
                              </div>
                              <span className="unit">개</span>
                            </div>
                            <div className="type-row-v3">
                              <span>서술형:</span>
                              <div className="counter-v3">
                                <button onClick={() => handleQuizTypeChange('descriptive', -1)}>-</button>
                                <span className="count">{quizConfig.types.descriptive}</span>
                                <button onClick={() => handleQuizTypeChange('descriptive', 1)}>+</button>
                              </div>
                              <span className="unit">개</span>
                            </div>
                          </div>
                        </div>

                        {/* Column 3: 난이도 (Original Color Buttons) */}
                        <div className="setup-col-v3">
                          <div className="col-title-v3">난이도</div>
                          <div className="difficulty-vertical-v3">
                            <button className={`diff-btn-v3 low ${quizConfig.difficulty === '하' ? 'active' : ''}`} onClick={() => setQuizConfig({ ...quizConfig, difficulty: '하' })}>하</button>
                            <button className={`diff-btn-v3 mid ${quizConfig.difficulty === '중' ? 'active' : ''}`} onClick={() => setQuizConfig({ ...quizConfig, difficulty: '중' })}>중</button>
                            <button className={`diff-btn-v3 high ${quizConfig.difficulty === '상' ? 'active' : ''}`} onClick={() => setQuizConfig({ ...quizConfig, difficulty: '상' })}>상</button>
                          </div>
                        </div>
                      </div>

                      <div className="quiz-footer-v3">
                        <button
                          className="start-btn-v3"
                          disabled={totalQuizCount === 0 || quizConfig.selectedNodeIds.length === 0}
                          onClick={handleGenerateQuiz}
                        >
                          생성하기
                        </button>
                      </div>
                    </div>

                    {/* Right: History Panel */}
                    <div className="quiz-history-panel-v3 glass-panel-v3">
                      <div className="history-header-v3">
                        <h3>생성된 퀴즈</h3>
                        <span className="history-count-v3">{quizList.length}</span>
                      </div>
                      <div className="history-list-v3">
                        {quizList.length === 0 ? (
                          <div className="history-empty-v3">생성된 퀴즈가 없습니다.</div>
                        ) : (
                          quizList.map(q => (
                            <div
                              key={q.id}
                              className={`quiz-history-block-v3 ${q.status} ${showCheckFeedback === q.id ? 'show-check' : ''}`}
                              onClick={() => q.status === 'ready' && startQuizSession(q)}
                            >
                              <div className="q-block-info-v3" style={{ flex: 1, paddingRight: '12px' }}>
                                <div className="q-block-title-v3" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {editingQuizId === q.id ? (
                                    <form onSubmit={(e) => handleEditQuizTitleSubmit(e, q.id)} onClick={e => e.stopPropagation()} style={{ flex: 1, display: 'flex' }}>
                                      <input
                                        autoFocus
                                        value={editingQuizTitle}
                                        onChange={e => setEditingQuizTitle(e.target.value)}
                                        onBlur={(e) => handleEditQuizTitleSubmit(e, q.id)}
                                        style={{ width: '100%', background: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '4px', fontSize: '14px' }}
                                      />
                                    </form>
                                  ) : (
                                    <>
                                      <span>{q.title}</span>
                                      {q.status !== 'generating' && (
                                        <Edit3 
                                          size={14} 
                                          style={{ cursor: 'pointer', opacity: 0.5 }} 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingQuizId(q.id);
                                            setEditingQuizTitle(q.title);
                                          }} 
                                        />
                                      )}
                                    </>
                                  )}
                                </div>
                                <div className="q-block-meta-v3" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '4px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>{q.config.difficulty} · {Object.values(q.config.types).reduce((a, b) => a + b, 0)}문제</span>
                                    {q.status === 'ready' && quizProgressMap[q.id] && quizProgressMap[q.id].userAnswers && (
                                      <span style={{ fontSize: '11px', color: '#888', fontWeight: '500' }}>
                                        {quizProgressMap[q.id].userAnswers.filter(a => a !== '').length} / {Object.values(q.config.types).reduce((a, b) => a + b, 0)}
                                      </span>
                                    )}
                                  </div>
                                  {q.status === 'ready' && quizProgressMap[q.id] && quizProgressMap[q.id].userAnswers && (
                                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                      <div style={{ 
                                        height: '100%', 
                                        background: quizProgressMap[q.id].quizState === 'result' ? '#00c896' : '#4285f4', 
                                        width: `${(quizProgressMap[q.id].userAnswers.filter(a => a !== '').length / Object.values(q.config.types).reduce((a, b) => a + b, 0)) * 100}%`,
                                        transition: 'width 0.3s ease'
                                      }}></div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="q-block-actions-v3" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div
                                  className="q-delete-btn-v3"
                                  onClick={(e) => handleDeleteQuiz(e, q.id)}
                                  title="퀴즈 삭제"
                                >
                                  <Trash2 size={16} />
                                </div>
                                <div className="q-block-status-v3">
                                  {q.status === 'generating' ? (
                                    <Loader2 className="spinning-icon" size={18} />
                                  ) : (
                                    <ChevronRight size={18} />
                                  )}
                                </div>
                              </div>
                              {showCheckFeedback === q.id && (
                                <div className="check-overlay-v3">
                                  <Sparkles className="check-sparkle" size={32} />
                                  <div className="check-icon-v3">✓</div>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : quizState === 'taking' ? (
                  /* Quiz Taking View */
                  <div className="quiz-taking-container-v3">
                    <div className="quiz-taking-header-v3">
                      <button className="back-btn-v3" onClick={() => setQuizState('setup')}>
                        <ArrowLeft size={20} />
                        <span>나가기</span>
                      </button>
                      <div className="quiz-progress-v3">
                        <div className="progress-text-v3">문제 {currentQuizIndex + 1} / {activeQuiz.data.length}</div>
                        <div className="progress-bar-v3">
                          <div className="progress-fill-v3" style={{ width: `${((currentQuizIndex + 1) / activeQuiz.data.length) * 100}%` }}></div>
                        </div>
                      </div>
                    </div>

                    <div className="question-card-v3 glass-panel-v3">
                      <div className="q-type-badge-v3">{activeQuiz.data[currentQuizIndex].type.toUpperCase()}</div>
                      <div className="q-text-v3">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {sanitizeMarkdown(activeQuiz.data[currentQuizIndex].question)}
                        </ReactMarkdown>
                      </div>

                      <div className="q-input-area-v3">
                        {activeQuiz.data[currentQuizIndex].type === 'ox' ? (
                          <div className="ox-options-v3">
                            <button
                              className={`ox-btn-v3 ${userAnswers[currentQuizIndex] === 'O' ? 'selected' : ''}`}
                              onClick={() => handleAnswerSelect('O')}
                            >O</button>
                            <button
                              className={`ox-btn-v3 ${userAnswers[currentQuizIndex] === 'X' ? 'selected' : ''}`}
                              onClick={() => handleAnswerSelect('X')}
                            >X</button>
                          </div>
                        ) : activeQuiz.data[currentQuizIndex].type === 'multiple' ? (
                          <div className="multiple-options-v3">
                            {activeQuiz.data[currentQuizIndex].options.map((opt, i) => (
                              <button
                                key={i}
                                className={`opt-btn-v3 ${userAnswers[currentQuizIndex] === opt ? 'selected' : ''}`}
                                onClick={() => handleAnswerSelect(opt)}
                              >
                                <span className="opt-num-v3">{i + 1}</span>
                                <span className="opt-text-v3">
                                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                    {sanitizeMarkdown(opt)}
                                  </ReactMarkdown>
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : activeQuiz.data[currentQuizIndex].type === 'short' ? (
                          <textarea
                            className="short-answer-input-v3"
                            placeholder="단답형 답안을 입력하세요..."
                            value={userAnswers[currentQuizIndex] || ''}
                            onChange={(e) => handleAnswerSelect(e.target.value)}
                          />
                        ) : (
                          <textarea
                            className="descriptive-input-v3"
                            placeholder="서술형 답안을 입력하세요..."
                            value={userAnswers[currentQuizIndex] || ''}
                            onChange={(e) => handleAnswerSelect(e.target.value)}
                          />
                        )}
                      </div>

                      <div className="q-nav-v3">
                        <button
                          className="nav-btn-v3 prev"
                          disabled={currentQuizIndex === 0}
                          onClick={() => setCurrentQuizIndex(prev => prev - 1)}
                        >이전</button>
                        {currentQuizIndex === activeQuiz.data.length - 1 ? (
                          <button
                            className="nav-btn-v3 submit"
                            onClick={handleQuizSubmit}
                            disabled={isGenerating}
                          >{isGenerating ? '채점 중...' : '결과 보기'}</button>
                        ) : (
                          <button
                            className="nav-btn-v3 next"
                            onClick={() => setCurrentQuizIndex(prev => prev + 1)}
                            disabled={!userAnswers[currentQuizIndex]}
                          >다음</button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Quiz Result View */
                  <div className="quiz-result-container-v3">
                    <div className="result-header-v3 glass-panel-v3">
                      <div className="result-score-v3">
                        <div className="score-circle-v3">
                          <span className="score-num-v3">
                            {userAnswers.filter((ans, i) => {
                              const q = activeQuiz.data[i];
                              if (q.type === 'descriptive') return quizFeedback[i] && quizFeedback[i].score >= 70;
                              return String(ans).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
                            }).length}
                          </span>
                          <span className="score-total-v3">/ {activeQuiz.data.length}</span>
                        </div>
                        <h3>퀴즈 완료!</h3>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'center' }}>
                          <button className="reset-btn-v3" style={{ marginTop: 0 }} onClick={() => setQuizState('setup')}>목록으로 돌아가기</button>
                          <button className="reset-btn-v3" style={{ marginTop: 0, background: 'rgba(66, 133, 244, 0.2)', border: '1px solid #4285f4' }} onClick={() => {
                            setUserAnswers([]);
                            setQuizFeedback([]);
                            setCurrentQuizIndex(0);
                            setQuizState('taking');
                          }}>다시 시작</button>
                        </div>
                      </div>
                    </div>

                    <div className="result-list-v3">
                      {activeQuiz.data.map((q, i) => {
                        let isCorrect = false;
                        if (q.type === 'descriptive') {
                           isCorrect = quizFeedback[i] && quizFeedback[i].score >= 70;
                        } else {
                           isCorrect = String(userAnswers[i]).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
                        }
                        return (
                          <div key={i} className={`result-card-v3 glass-panel-v3 ${isCorrect ? 'correct' : 'incorrect'}`}>
                            <div className="res-q-header-v3">
                              <span className={`res-badge-v3 ${isCorrect ? 'correct' : 'incorrect'}`}>
                                {isCorrect ? '정답' : '오답'} {q.type === 'descriptive' && quizFeedback[i] ? `(${quizFeedback[i].score}점)` : ''}
                              </span>
                              <span className="res-num-v3">문제 {i + 1}</span>
                            </div>
                            <div className="res-q-text-v3">
                              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                {sanitizeMarkdown(q.question)}
                              </ReactMarkdown>
                            </div>
                            <div className="res-compare-v3">
                              <div className="res-ans-box-v3">
                                <label>나의 답변:</label>
                                <div className="ans-val-v3">{userAnswers[i] || '(입력 없음)'}</div>
                              </div>
                              {!isCorrect && q.type !== 'descriptive' && (
                                <div className="res-ans-box-v3 correct-box">
                                  <label>정답:</label>
                                  <div className="ans-val-v3">
                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                      {sanitizeMarkdown(q.answer)}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {q.type === 'descriptive' && quizFeedback[i] && (
                                <div className="res-explanation-v3" style={{ marginBottom: '16px' }}>
                                  <label style={{ color: '#4285f4' }}>AI 피드백:</label>
                                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                    {sanitizeMarkdown(quizFeedback[i].feedback)}
                                  </ReactMarkdown>
                                </div>
                            )}

                            <div className="res-explanation-v3">
                              <label>해설 / 모범 답안:</label>
                              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                {sanitizeMarkdown(q.explanation || q.answer)}
                              </ReactMarkdown>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : viewMode === 'summary' ? (
              <div className="summary-view-container fade-up-element">
                <div className="summary-header">
                  <div className="summary-title">
                    <FileText size={20} color="#4285f4" />
                    <span>{activeChat?.title} 정리본 PDF 생성하기</span>
                  </div>
                  <div className="summary-actions">
                    <button className="summary-btn generate" onClick={handleGenerateSummary}>
                      <RotateCcw size={14} />
                      <span>생성하기</span>
                    </button>
                    {compiledSummary.isCompiled && (
                      <button className="summary-btn download" onClick={() => {
                        const prevTitle = document.title;
                        document.title = `${activeChat?.title || '정리본'} - 정리본`;
                        setTimeout(() => {
                          window.print();
                          setTimeout(() => { document.title = prevTitle; }, 1000);
                        }, 100);
                      }}>
                        <FileText size={14} />
                        <span>다운로드</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="summary-preview-wrapper">
                  {!compiledSummary.isCompiled ? (
                    <div className="summary-empty-state">
                      <FileText size={48} color="#4285f4" style={{ opacity: 0.5, margin: '0 auto 16px auto', display: 'block' }} />
                      <h3 style={{ marginBottom: '8px', color: '#fff' }}>정리본이 아직 생성되지 않았습니다.</h3>
                      <p style={{ fontSize: '14px' }}>상단의 <b>생성하기</b> 버튼을 눌러 현재 프로젝트의 질문과 답변을 요약본으로 구성하세요.</p>
                    </div>
                  ) : (
                    <div className="summary-paper-preview">
                      <div className="paper-cover-title">{activeChat?.title} 요약 정리본</div>
                      <div className="paper-meta">작성자: {currentUser?.user_id} | 추출 일시: {new Date().toLocaleDateString()}</div>

                      {/* 본문 (M + S 파생) */}
                      {compiledSummary.mainNodes.length === 0 ? (
                        <div style={{ color: '#888', fontStyle: 'italic', marginBottom: '40px' }}>본문 항목이 없습니다.</div>
                      ) : (
                        compiledSummary.mainNodes.map((n) => (
                          <div key={n.id} className={`summary-block ${n.isSubNode ? 'sub-block' : ''}`}>
                            <div className="block-title">
                              {n.isSubNode && <span className="sub-node-tag" style={{ color: '#3b82f6', fontWeight: 'bold', marginRight: '6px' }}>[추가 설명]</span>}
                              {n.node_title || sanitizeMarkdown(n.answer_text).split('\n')[0].replace(/^[#*\s]+/, '') || '(제목 없음)'}
                            </div>
                            <div className="block-content">
                              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                {sanitizeMarkdown(n.answer_text)}
                              </ReactMarkdown>
                            </div>
                          </div>
                        ))
                      )}

                      {/* 부록 (B + S 파생) */}
                      {compiledSummary.appendixNodes.length > 0 && (
                        <div className="appendix-divider">
                          <div className="appendix-title" style={{ borderBottom: '2px solid #3b82f6', color: '#1e3a8a', paddingBottom: '6px', marginTop: '40px', marginBottom: '20px', fontSize: '18px', fontWeight: 'bold' }}>
                            [부록] 추가 탐구 및 파생 질문
                          </div>
                          {compiledSummary.appendixNodes.map((n) => (
                            <div key={n.id} className={`summary-block ${n.isSubNode ? 'sub-block' : ''}`}>
                              <div className="block-title">
                                {n.isSubNode && <span className="sub-node-tag" style={{ color: '#3b82f6', fontWeight: 'bold', marginRight: '6px' }}>[추가 설명]</span>}
                                {n.node_title || sanitizeMarkdown(n.answer_text).split('\n')[0].replace(/^[#*\s]+/, '') || '(제목 없음)'}
                              </div>
                              <div className="block-content">
                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                  {sanitizeMarkdown(n.answer_text)}
                                </ReactMarkdown>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                          <img 
                            src={`http://localhost:5000${selectedNode.photo_url}`} 
                            alt="Q" 
                            onClick={() => setEnlargedImage(`http://localhost:5000${selectedNode.photo_url}`)}
                            style={{ cursor: 'zoom-in' }}
                          />
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
                                <span>Chat for Edu가 답변을 생성하고 있습니다...</span>
                              </div>
                            ) : (
                              <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                              >
                                {sanitizeMarkdown(selectedNode.answer_text)}
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
                        <p>잠시만 기다려주세요. Chat for Edu가 질문을 분석 중입니다.</p>
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
            )
          )}

        </section>

        {/* 공통 입력창 영역 */}
        {viewMode !== 'quiz' && viewMode !== 'summary' && (
          <div className={`input-area-wrapper ${isNodeModalOpen && viewMode === 'node' ? 'panel-open' : ''}`}>
            {imagePreviewUrl && (
              <div className="image-preview-container">
                <div className="preview-bubble"><img src={imagePreviewUrl} alt="p" /><button className="remove-image-btn" onClick={clearImage}><X size={14} /></button></div>
              </div>
            )}

            <div className="input-area-content" style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column' }}>
              {/* 좌측 상단 필기 모드 (노드 모드 전용) */}
              {viewMode === 'node' && (
                <div className="drawing-toolbar-wrapper" style={{ alignSelf: 'flex-start', marginLeft: '16px' }}>
                  <div className="drawing-tools-bar">
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <button 
                        className={`tool-btn ${isDrawingMode && drawingTool === 'pen' ? 'active' : ''}`} 
                        onClick={() => {
                          if (activeColorPicker === 'pen') {
                            setActiveColorPicker(null);
                            setIsDrawingMode(false);
                          } else {
                            setIsDrawingMode(true);
                            setDrawingTool('pen');
                            setActiveColorPicker('pen');
                          }
                        }} 
                        title="펜 (클릭하여 색상 선택)"
                      >
                        <Pencil size={18} style={{ color: penColor }} />
                      </button>
                      {activeColorPicker === 'pen' && (
                        <div style={{
                          position: 'absolute', bottom: '100%', left: 0, marginBottom: '8px',
                          background: 'rgba(25, 28, 35, 0.95)', padding: '10px', borderRadius: '16px',
                          display: 'flex', flexWrap: 'wrap', width: '150px', gap: '8px', border: '1px solid rgba(255, 255, 255, 0.15)',
                          boxShadow: '0 -8px 24px rgba(0,0,0,0.4)', zIndex: 1000,
                          backdropFilter: 'blur(10px)'
                        }}>
                          {PRESET_COLORS.map(color => (
                            <div 
                              key={color}
                              onClick={() => { setPenColor(color); setActiveColorPicker(null); }}
                              style={{
                                width: '22px', height: '22px', borderRadius: '50%', backgroundColor: color,
                                cursor: 'pointer', border: penColor === color ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                                boxShadow: penColor === color ? '0 0 8px rgba(255,255,255,0.5)' : 'none',
                                transition: 'all 0.2s'
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <button 
                        className={`tool-btn ${isDrawingMode && drawingTool === 'highlighter' ? 'active' : ''}`} 
                        onClick={() => {
                          if (activeColorPicker === 'highlighter') {
                            setActiveColorPicker(null);
                            setIsDrawingMode(false);
                          } else {
                            setIsDrawingMode(true);
                            setDrawingTool('highlighter');
                            setActiveColorPicker('highlighter');
                          }
                        }} 
                        title="형광펜 (클릭하여 색상 선택)"
                      >
                        <Highlighter size={18} style={{ color: highlighterColor }} />
                      </button>
                      {activeColorPicker === 'highlighter' && (
                        <div style={{
                          position: 'absolute', bottom: '100%', left: 0, marginBottom: '8px',
                          background: 'rgba(25, 28, 35, 0.95)', padding: '10px', borderRadius: '16px',
                          display: 'flex', flexWrap: 'wrap', width: '150px', gap: '8px', border: '1px solid rgba(255, 255, 255, 0.15)',
                          boxShadow: '0 -8px 24px rgba(0,0,0,0.4)', zIndex: 1000,
                          backdropFilter: 'blur(10px)'
                        }}>
                          {PRESET_COLORS.map(color => (
                            <div 
                              key={color}
                              onClick={() => { setHighlighterColor(color); setActiveColorPicker(null); }}
                              style={{
                                width: '22px', height: '22px', borderRadius: '50%', backgroundColor: color,
                                cursor: 'pointer', border: highlighterColor === color ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                                boxShadow: highlighterColor === color ? '0 0 8px rgba(255,255,255,0.5)' : 'none',
                                opacity: 0.8,
                                transition: 'all 0.2s'
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <button 
                      className={`tool-btn ${isDrawingMode && drawingTool === 'eraser' ? 'active' : ''}`} 
                      onClick={() => {
                        setActiveColorPicker(null); // 다른 색상 창 닫기
                        if (drawingTool === 'eraser' && isDrawingMode) {
                          setIsDrawingMode(false);
                        } else {
                          setIsDrawingMode(true);
                          setDrawingTool('eraser');
                        }
                      }} 
                      title="지우개"
                    >
                      <Eraser size={18} />
                    </button>
                    <div className="tool-divider" />
                    <button 
                      className="tool-btn" 
                      onClick={() => {
                        if(window.confirm('모든 필기를 지우시겠습니까?')) {
                          setDrawings([]);
                          if (activeChat) {
                            fetch(`http://localhost:5000/api/chats/${activeChat.id}/drawings`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ drawings: JSON.stringify([]) })
                            });
                          }
                        }
                      }} 
                      title="전체 삭제"
                    >
                      <X size={18} />
                    </button>
                  </div>
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
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => processImageFile(e.target.files[0])} disabled={isGenerating} />
                  </label>

                  {/* AI 모델 선택 박스 (Premium Custom Dropdown) */}
                  {availableModels.length > 0 && (
                    <div className="model-selector-container" ref={modelSelectorRef}>
                      <button 
                        className={`model-selector-trigger ${isModelSelectorOpen ? 'active' : ''}`}
                        onClick={() => !isGenerating && setIsModelSelectorOpen(!isModelSelectorOpen)}
                        disabled={isGenerating}
                      >
                        <Sparkles size={14} className="gemini-icon" />
                        <span className="selected-model-name">
                          {availableModels.find(m => m.id === selectedModelId)?.name || 'Model Select'}
                        </span>
                        <ChevronDown size={14} className={`arrow-icon ${isModelSelectorOpen ? 'rotated' : ''}`} />
                      </button>

                      {isModelSelectorOpen && (
                        <div className="model-selector-popup fade-up-element">
                          <div className="model-popup-header">AI 모델 선택</div>
                          <div className="model-popup-list">
                            {availableModels.map(model => (
                              <button
                                key={model.id}
                                className={`model-item-btn ${selectedModelId === model.id ? 'active' : ''}`}
                                onClick={() => {
                                  handleModelChange(model.id);
                                  setIsModelSelectorOpen(false);
                                }}
                              >
                                <div className="model-item-info">
                                  <span className="model-name">{model.name}</span>
                                  {selectedModelId === model.id && <Sparkles size={12} fill="currentColor" />}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
        </div>
      )}

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

        {/* --- Sidebar History Item Delete Modal --- */}
        {deleteHistoryItem && (
          <div className="modal-overlay" onClick={() => setDeleteHistoryItem(null)}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
              <h3>프로젝트 삭제</h3>
              <p><strong>[{deleteHistoryItem.title}]</strong></p>
              <p>이 프로젝트를 삭제하시겠습니까?</p>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setDeleteHistoryItem(null)}>취소</button>
                <button className="btn-danger" onClick={handleHistoryDeleteConfirm} style={{ backgroundColor: '#d96570', color: 'white' }}>삭제</button>
              </div>
            </div>
          </div>
        )}

        {/* --- Image Modal (Enlarge) --- */}
        {enlargedImage && (
          <div className="image-modal-overlay" onClick={() => setEnlargedImage(null)}>
            <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
              <img src={enlargedImage} alt="Enlarged" className="enlarged-photo" />
              <button className="modal-close-btn" onClick={() => setEnlargedImage(null)}>
                <X size={28} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
