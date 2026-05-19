

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, BookOpen, Compass, CornerDownRight, SquarePlus, Sparkles, 
  MessageCircle, Mic, Paperclip, Send, ChevronRight, ChevronLeft, 
  MessageSquare, FileText, Search, Trash2, Pencil, ArrowLeft, Folder, File,
  Star, RotateCw, Highlighter, Eraser
} from 'lucide-react';
import './TutorialOverlay.css';

const TutorialOverlay = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('welcome');
  const [welcomeSubStep, setWelcomeSubStep] = useState(0);
  const [searchSubStep, setSearchSubStep] = useState(0);
  const [chatSubStep, setChatSubStep] = useState(0);
  const [nodeSubStep, setNodeSubStep] = useState(0);
  const [quizSubStep, setQuizSubStep] = useState(0);
  const tabs = ['welcome', 'search', 'chat', 'node', 'quiz', 'summary'];
  const slides = ['welcome-0', 'welcome-1', 'search-0', 'search-1', 'chat-0', 'chat-1', 'chat-2', 'chat-3', 'chat-4', 'node-0', 'node-1', 'node-2', 'quiz-0', 'quiz-1', 'summary'];

  const getSlideKey = () => {
    if (activeTab === 'welcome') return `welcome-${welcomeSubStep}`;
    if (activeTab === 'search') return `search-${searchSubStep}`;
    if (activeTab === 'chat') return `chat-${chatSubStep}`;
    if (activeTab === 'node') return `node-${nodeSubStep}`;
    if (activeTab === 'quiz') return `quiz-${quizSubStep}`;
    return activeTab;
  };

  const handleNext = () => {
    if (activeTab === 'welcome' && welcomeSubStep === 0) {
      setWelcomeSubStep(1);
    } else if (activeTab === 'welcome' && welcomeSubStep === 1) {
      setActiveTab('search');
      setSearchSubStep(0);
    } else if (activeTab === 'search' && searchSubStep === 0) {
      setSearchSubStep(1);
    } else if (activeTab === 'search' && searchSubStep === 1) {
      setActiveTab('chat');
      setChatSubStep(0);
    } else if (activeTab === 'chat' && chatSubStep === 0) {
      setChatSubStep(1);
    } else if (activeTab === 'chat' && chatSubStep === 1) {
      setChatSubStep(2);
    } else if (activeTab === 'chat' && chatSubStep === 2) {
      setChatSubStep(3);
    } else if (activeTab === 'chat' && chatSubStep === 3) {
      setChatSubStep(4);
    } else if (activeTab === 'chat' && chatSubStep === 4) {
      setActiveTab('node');
      setNodeSubStep(0);
    } else if (activeTab === 'node' && nodeSubStep === 0) {
      setNodeSubStep(1);
    } else if (activeTab === 'node' && nodeSubStep === 1) {
      setNodeSubStep(2);
    } else if (activeTab === 'node' && nodeSubStep === 2) {
      setActiveTab('quiz');
      setQuizSubStep(0);
    } else if (activeTab === 'quiz' && quizSubStep === 0) {
      setQuizSubStep(1);
    } else if (activeTab === 'quiz' && quizSubStep === 1) {
      setActiveTab('summary');
    } else {
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1]);
      } else {
        onClose();
      }
    }
  };

  const handlePrev = () => {
    if (activeTab === 'node' && nodeSubStep === 2) {
      setNodeSubStep(1);
    } else if (activeTab === 'node' && nodeSubStep === 1) {
      setNodeSubStep(0);
    } else if (activeTab === 'node' && nodeSubStep === 0) {
      setActiveTab('chat');
      setChatSubStep(4);
    } else if (activeTab === 'quiz' && quizSubStep === 1) {
      setQuizSubStep(0);
    } else if (activeTab === 'quiz' && quizSubStep === 0) {
      setActiveTab('node');
      setNodeSubStep(2);
    } else if (activeTab === 'chat' && chatSubStep === 4) {
      setChatSubStep(3);
    } else if (activeTab === 'chat' && chatSubStep === 3) {
      setChatSubStep(2);
    } else if (activeTab === 'chat' && chatSubStep === 2) {
      setChatSubStep(1);
    } else if (activeTab === 'chat' && chatSubStep === 1) {
      setChatSubStep(0);
    } else if (activeTab === 'chat' && chatSubStep === 0) {
      setActiveTab('search');
      setSearchSubStep(1);
    } else if (activeTab === 'search' && searchSubStep === 1) {
      setSearchSubStep(0);
    } else if (activeTab === 'search' && searchSubStep === 0) {
      setActiveTab('welcome');
      setWelcomeSubStep(1);
    } else if (activeTab === 'welcome' && welcomeSubStep === 1) {
      setWelcomeSubStep(0);
    } else {
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex > 0) {
        const prevTab = tabs[currentIndex - 1];
        setActiveTab(prevTab);
        if (prevTab === 'welcome') {
          setWelcomeSubStep(1);
        } else if (prevTab === 'search') {
          setSearchSubStep(1);
        } else if (prevTab === 'chat') {
          setChatSubStep(4);
        } else if (prevTab === 'node') {
          setNodeSubStep(2);
        } else if (prevTab === 'quiz') {
          setQuizSubStep(1);
        }
      }
    }
  };

  const handleDotClick = (slide) => {
    if (slide.startsWith('welcome-')) {
      setActiveTab('welcome');
      setWelcomeSubStep(parseInt(slide.split('-')[1], 10));
    } else if (slide.startsWith('search-')) {
      setActiveTab('search');
      setSearchSubStep(parseInt(slide.split('-')[1], 10));
    } else if (slide.startsWith('chat-')) {
      setActiveTab('chat');
      setChatSubStep(parseInt(slide.split('-')[1], 10));
    } else if (slide.startsWith('node-')) {
      setActiveTab('node');
      setNodeSubStep(parseInt(slide.split('-')[1], 10));
    } else if (slide.startsWith('quiz-')) {
      setActiveTab('quiz');
      setQuizSubStep(parseInt(slide.split('-')[1], 10));
    } else {
      setActiveTab(slide);
    }
  };

  const renderMockup = () => {
    switch (activeTab) {
      case 'welcome':
        if (welcomeSubStep === 0) {
          return (
            <div className="welcome-slide-inner">
              <div className="welcome-logo-box">
                <BookOpen size={36} color="#fff" />
              </div>
              <h1>Chat for Edu 사용 가이드</h1>
              <p>
                AI 동반 학습 시스템에 오신 것을 환영합니다!<br />
                본 가이드에서는 채팅을 통한 개념 학습, 마인드맵 노드 탐색, 맞춤형 퀴즈 출제 및 정리본 생성 기능을 빠르고 간편하게 설명해 드립니다.
              </p>
            </div>
          );
        } else {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '20px' }}>
              {/* Header Bar Area */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '24px',
                width: '100%',
                maxWidth: '300px',
                marginBottom: '12px',
                paddingRight: '12px'
              }}>
                {/* Book Icon */}
                <div style={{
                  color: '#718096',
                  opacity: 0.8,
                  padding: '6px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.03)'
                }}>
                  <BookOpen size={22} />
                </div>
                
                {/* Bell Icon */}
                <div style={{
                  color: '#718096',
                  opacity: 0.8
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                </div>

                {/* Avatar (F) */}
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#1d63d3',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '18px',
                  cursor: 'default'
                }}>
                  F
                </div>
              </div>

              {/* Dropdown Container */}
              <div style={{
                width: '240px',
                background: '#15171e',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '24px 16px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  fontSize: '15px',
                  fontWeight: '800',
                  color: '#fff',
                  textAlign: 'center',
                  letterSpacing: '0.5px'
                }}>
                  f1
                </div>

                {/* Divider */}
                <div style={{
                  width: '100%',
                  height: '1px',
                  background: 'rgba(255, 255, 255, 0.08)'
                }} />

                {/* Logout Button */}
                <div style={{
                  color: '#f87171',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'default',
                  textAlign: 'center',
                  padding: '4px 0'
                }}>
                  로그아웃
                </div>

                {/* Account Delete Button */}
                <div style={{
                  color: '#94a3b8',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'default',
                  textAlign: 'center',
                  padding: '4px 0'
                }}>
                  계정 탈퇴
                </div>
              </div>
            </div>
          );
        }

      case 'search':
        if (searchSubStep === 0) {
          return (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'flex-start', 
              background: '#0b0c10', 
              padding: '20px', 
              borderRadius: '16px', 
              border: '1px solid rgba(255,255,255,0.05)', 
              width: '260px', 
              gap: '12px', 
              boxShadow: '0 10px 25px rgba(0,0,0,0.4)' 
            }}>
              {/* Hamburger Menu Icon */}
              <div style={{ color: '#fff', opacity: 0.8, cursor: 'default' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </div>

              {/* Search Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                background: 'transparent',
                border: '1.5px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '6px 10px',
                color: '#fff'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Search size={14} color="#a0aec0" />
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>dpm</span>
                </div>
                <X size={14} color="#a0aec0" style={{ cursor: 'default' }} />
              </div>

              {/* Results List */}
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '8px' }}>
                {/* Project Result */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#15171e',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  width: '100%'
                }}>
                  <Folder size={16} color="#ecc94b" fill="#ecc94b" />
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#3182ce' }}>DPM 손실</span>
                </div>

                {/* Node Result */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  background: '#15171e',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  width: '100%'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <File size={14} color="#a0aec0" />
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>[DPM 손실] DPM 손실함수</span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#718096', paddingLeft: '20px' }}>DPM 손실함수</span>
                </div>
              </div>
            </div>
          );
        } else {
          return (
            <div style={{
              width: '260px',
              background: '#11131a',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.4)'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <ArrowLeft size={18} color="#a0aec0" style={{ cursor: 'default' }} />
                <div style={{ display: 'flex', gap: '12px' }}>
                  <Pencil size={16} color="#a0aec0" style={{ cursor: 'default' }} />
                  <Trash2 size={16} color="#a0aec0" style={{ cursor: 'default' }} />
                </div>
              </div>

              {/* Title */}
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>
                DPM 손실
              </div>

              {/* Modes */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px', marginBottom: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #9f7aea', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9f7aea' }}>
                    <MessageSquare size={16} />
                  </div>
                  <span style={{ fontSize: '10px', color: '#9f7aea', fontWeight: 'bold' }}>chat</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', opacity: 0.4 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #a0aec0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0' }}>
                    <Compass size={16} />
                  </div>
                  <span style={{ fontSize: '10px', color: '#a0aec0' }}>node</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', opacity: 0.4 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #a0aec0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0' }}>
                    <MessageCircle size={16} />
                  </div>
                  <span style={{ fontSize: '10px', color: '#a0aec0' }}>quiz</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', opacity: 0.4 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #a0aec0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0' }}>
                    <FileText size={16} />
                  </div>
                  <span style={{ fontSize: '10px', color: '#a0aec0' }}>정리본</span>
                </div>
              </div>

              {/* Filters */}
              <div style={{
                background: '#090a0d',
                borderRadius: '8px',
                padding: '3px',
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%'
              }}>
                <div style={{ background: 'rgba(159, 122, 234, 0.12)', color: '#b794f4', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                  분류
                </div>
                <div style={{ color: '#4a5568', padding: '4px 10px', fontSize: '11px' }}>
                  이해도
                </div>
                <div style={{ color: '#4a5568', padding: '4px 10px', fontSize: '11px' }}>
                  즐겨찾기
                </div>
              </div>

              {/* Inner Search Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                background: 'transparent',
                border: '1.5px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '6px 10px',
                color: '#fff'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Search size={14} color="#a0aec0" />
                  <span style={{ fontSize: '12px' }}>dpm</span>
                </div>
                <X size={14} color="#a0aec0" style={{ cursor: 'default' }} />
              </div>

              {/* Node Card Result */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#15171e',
                border: '1px solid rgba(255,255,255,0.06)',
                borderLeft: '4.5px solid #1d63d3',
                borderRadius: '10px',
                padding: '10px 12px',
                width: '100%'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    fontSize: '9px',
                    fontWeight: '800',
                    color: '#f87171',
                    background: 'rgba(248,113,113,0.15)',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    border: '1px solid rgba(248,113,113,0.2)'
                  }}>
                    M1-1
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>DPM 손실함수</span>
                </div>
                <ChevronRight size={14} color="#718096" />
              </div>
            </div>
          );
        }

      case 'chat':
        if (chatSubStep === 0) {
          return (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              minHeight: '220px',
              padding: '20px'
            }}>
              {/* Header Card based on screenshot */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: '420px',
                background: '#15171e',
                border: '1.5px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '18px 20px',
                gap: '16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                textAlign: 'left'
              }}>
                {/* Row 1: Badges, Title, Actions */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%'
                }}>
                  {/* Left Side: Badge + Star + Title */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* M1-1 Badge */}
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      color: '#a0aec0',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      M1-1
                    </div>

                    {/* Star (Favorite) */}
                    <div style={{ 
                      color: '#a0aec0', 
                      cursor: 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Star size={16} color="#a0aec0" />
                    </div>

                    {/* Node Title */}
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: '800', 
                      color: '#fff',
                      letterSpacing: '0.3px'
                    }}>
                      DPM 손실함수
                    </span>
                  </div>

                  {/* Right Side: Edit, Delete, Regenerate */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Edit (Pencil) */}
                    <div style={{ 
                      color: '#a0aec0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Pencil size={15} />
                    </div>

                    {/* Delete (Trash2) */}
                    <div style={{ 
                      color: '#a0aec0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Trash2 size={15} />
                    </div>

                    {/* Regenerate (RotateCw) */}
                    <div style={{ 
                      color: '#a0aec0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <RotateCw size={15} />
                    </div>
                  </div>
                </div>

                {/* Row 2: Understanding level */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  width: 'fit-content'
                }}>
                  <span style={{ fontSize: '12px', color: '#a0aec0', fontWeight: '600' }}>이해도 수치</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div 
                        key={i} 
                        style={{ 
                          width: '18px', 
                          height: '6px', 
                          background: 'linear-gradient(90deg, #4299e1, #667eea)', 
                          borderRadius: '3px' 
                        }} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        } else {
          // Adjust sub-step index for input box highlights (chatSubStep 1 maps to highlightIndex 0, etc.)
          const highlightIndex = chatSubStep - 1;
          return (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              minHeight: '220px',
              padding: '20px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: '480px',
                background: '#1b1c24',
                border: '1.5px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '24px',
                padding: '16px 18px',
                gap: '14px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                position: 'relative'
              }}>
                {/* Input Text Box */}
                <div style={{
                  color: 'rgba(255, 255, 255, 0.35)',
                  fontSize: '13px',
                  textAlign: 'left',
                  width: '100%',
                  fontWeight: '500'
                }}>
                  Chat for Edu에게 물어보기
                </div>

                {/* Action Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%'
                }}>
                  {/* Left Side: Paperclip, Gemini Selector */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    border: highlightIndex === 0 ? '1.5px dashed #4285f4' : '1.5px dashed transparent',
                    borderRadius: '24px',
                    padding: '2px',
                    transition: 'border 0.3s ease'
                  }}>
                    <Paperclip size={18} color={highlightIndex === 0 ? '#4285f4' : '#a0aec0'} style={{ cursor: 'default' }} />
                    
                    {/* Gemini 2.5 Flash Dropdown */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: highlightIndex === 0 ? 'rgba(66, 133, 244, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                      border: highlightIndex === 0 ? '1px solid rgba(66, 133, 244, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '20px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      color: highlightIndex === 0 ? '#4285f4' : '#a0aec0',
                      cursor: 'default'
                    }}>
                      <Sparkles size={11} color="#4285f4" />
                      <span>Gemini 2.5 Flash</span>
                      <span style={{ fontSize: '8px', opacity: 0.7 }}>▼</span>
                    </div>
                  </div>

                  {/* Right Side: M1-1 Badge, Arrow, Plus, Sparkles, Send */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Blue M1-1 Pill */}
                    <div style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      color: '#3182ce',
                      background: 'rgba(49, 130, 206, 0.15)',
                      border: '1px solid rgba(49, 130, 206, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}>
                      M1-1
                    </div>

                    {/* Return Arrow Icon */}
                    <div style={{ 
                      color: highlightIndex === 1 ? '#3182ce' : '#718096', 
                      opacity: 0.8,
                      border: highlightIndex === 1 ? '1.5px dashed #3182ce' : '1.5px dashed transparent',
                      borderRadius: '4px',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'border 0.3s ease'
                    }}>
                      <CornerDownRight size={15} />
                    </div>

                    {/* Plus Icon */}
                    <div style={{ 
                      color: highlightIndex === 2 ? '#3182ce' : '#718096', 
                      opacity: 0.8,
                      border: highlightIndex === 2 ? '1.5px dashed #3182ce' : '1.5px dashed transparent',
                      borderRadius: '4px',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'border 0.3s ease'
                    }}>
                      <SquarePlus size={15} />
                    </div>

                    {/* Sparkles Icon */}
                    <div style={{ 
                      color: highlightIndex === 3 ? '#3182ce' : '#718096', 
                      opacity: 0.8,
                      border: highlightIndex === 3 ? '1.5px dashed #3182ce' : '1.5px dashed transparent',
                      borderRadius: '4px',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'border 0.3s ease'
                    }}>
                      <Sparkles size={15} />
                    </div>

                    {/* Send Button */}
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#718096',
                      cursor: 'default'
                    }}>
                      <Send size={12} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }

      case 'node':
        if (nodeSubStep === 0) {
          return (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              minHeight: '260px',
              background: 'radial-gradient(circle, rgba(25, 28, 36, 0.3) 0%, rgba(10, 11, 14, 0.8) 100%)',
              padding: '40px',
              position: 'relative'
            }}>
              {/* Main Node Card Wrapper to position lines */}
              <div style={{
                position: 'relative',
                width: '290px',
                height: '90px'
              }}>
                {/* Top Line for indicators */}
                <div style={{
                  position: 'absolute',
                  top: '-1px',
                  left: '45px',
                  right: '45px',
                  height: '2px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  zIndex: 1
                }} />

                {/* 5 Glowing Indicators Container (Auto-centered) */}
                <div style={{
                  position: 'absolute',
                  top: '-9px',
                  left: '0',
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '16px',
                  zIndex: 2
                }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: '#0090ff',
                      border: '1.5px solid #ffffff',
                      boxShadow: '0 0 8px rgba(0, 144, 255, 0.7)',
                      cursor: 'default'
                    }} />
                  ))}
                </div>

                {/* Main Node Box */}
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: '#15171e',
                  border: '1.5px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '20px',
                  padding: '12px 16px',
                  position: 'relative',
                  boxShadow: '0 15px 30px rgba(0, 0, 0, 0.4)',
                  textAlign: 'left'
                }}>
                  {/* M1-1 Red Tag */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    fontSize: '9px',
                    fontWeight: '800',
                    color: '#ff4d6d',
                    background: 'rgba(255, 77, 109, 0.05)',
                    border: '1px solid rgba(255, 77, 109, 0.25)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    letterSpacing: '0.5px'
                  }}>
                    M1-1
                  </div>

                  {/* Star Icon (contour style) */}
                  <div style={{
                    position: 'absolute',
                    top: '38px',
                    left: '14px',
                    color: 'rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Star size={20} fill="none" />
                  </div>

                  {/* Node Title (centered in the remaining space) */}
                  <div style={{
                    position: 'absolute',
                    left: '60px',
                    right: '40px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '17px',
                    fontWeight: '800',
                    color: '#ffffff',
                    letterSpacing: '0.2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    DPM 손실함수
                  </div>

                  {/* Top-Right Trash Button */}
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    right: '0',
                    width: '36px',
                    height: '36px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderBottom: '1.5px solid rgba(255, 255, 255, 0.04)',
                    borderLeft: '1.5px solid rgba(255, 255, 255, 0.04)',
                    borderRadius: '0 20px 0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255, 255, 255, 0.2)'
                  }}>
                    <Trash2 size={13} />
                  </div>

                  {/* Left Overlapping Number Circle (Anchored exactly at the top-left corner vertex) */}
                  <div style={{
                    position: 'absolute',
                    left: '-14px',
                    top: '-14px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#0e1015',
                    border: '2px solid #ff4d6d',
                    boxShadow: '0 0 12px rgba(255, 77, 109, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    zIndex: 3
                  }}>
                    1
                  </div>

                  {/* Bottom Connection Port Dot (Centered on border, aligned under the Star column) */}
                  <div style={{
                    position: 'absolute',
                    bottom: '-6px',
                    left: '32px',
                    transform: 'translateX(-50%)',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#0084ff',
                    border: '2px solid #ffffff',
                    boxShadow: '0 0 6px rgba(0, 132, 255, 0.8)',
                    zIndex: 3
                  }} />

                  {/* Bottom Connection Line */}
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '32px',
                    transform: 'translateX(-50%)',
                    width: '2px',
                    height: '40px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    zIndex: 2
                  }} />

                  {/* Right Connection Port Dot (Centered on right border) */}
                  <div style={{
                    position: 'absolute',
                    right: '-6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#0084ff',
                    border: '2px solid #ffffff',
                    boxShadow: '0 0 6px rgba(0, 132, 255, 0.8)',
                    zIndex: 3
                  }} />

                  {/* Right Connection Curved Dashed Line */}
                  <div style={{
                    position: 'absolute',
                    left: '100%',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <svg width="40" height="20" style={{ overflow: 'visible', marginLeft: '-1px' }}>
                      <path 
                        d="M 0,10 C 15,10 20,15 40,15" 
                        fill="none" 
                        stroke="rgba(255, 255, 255, 0.2)" 
                        strokeWidth="2" 
                        strokeDasharray="4 3" 
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          );
        } else if (nodeSubStep === 1) {
          return (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              minHeight: '260px',
              background: 'radial-gradient(circle, rgba(25, 28, 36, 0.3) 0%, rgba(10, 11, 14, 0.8) 100%)',
              padding: '40px',
              position: 'relative'
            }}>
              {/* Main Node Card Wrapper to position lines */}
              <div style={{
                position: 'relative',
                width: '290px',
                height: '90px'
              }}>
                {/* Incoming Connection Line from left */}
                <div style={{
                  position: 'absolute',
                  right: '100%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '40px',
                  height: '2px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  zIndex: 2
                }} />

                {/* Left Disconnect Line X Button */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '-14px',
                  transform: 'translateY(-50%)',
                  zIndex: 40
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#ff4757',
                    border: '3px solid #15171e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(255, 71, 87, 0.5)',
                    cursor: 'default'
                  }}>
                    <X size={12} strokeWidth={3} />
                  </div>
                </div>

                {/* Main Node Box */}
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: '#15171e',
                  border: '1.5px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '20px',
                  padding: '12px 16px',
                  position: 'relative',
                  boxShadow: '0 15px 30px rgba(0, 0, 0, 0.4)',
                  textAlign: 'left'
                }}>
                  {/* M1-2 Red Tag (representing a subconcept) */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    fontSize: '9px',
                    fontWeight: '800',
                    color: '#ff4d6d',
                    background: 'rgba(255, 77, 109, 0.05)',
                    border: '1px solid rgba(255, 77, 109, 0.25)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    letterSpacing: '0.5px'
                  }}>
                    M1-2
                  </div>

                  {/* Star Icon (contour style) */}
                  <div style={{
                    position: 'absolute',
                    top: '38px',
                    left: '14px',
                    color: 'rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Star size={20} fill="none" />
                  </div>

                  {/* Node Title */}
                  <div style={{
                    position: 'absolute',
                    left: '60px',
                    right: '40px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '17px',
                    fontWeight: '800',
                    color: '#ffffff',
                    letterSpacing: '0.2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    연결리스트 비교
                  </div>

                  {/* Top-Right Trash Button */}
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    right: '0',
                    width: '36px',
                    height: '36px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderBottom: '1.5px solid rgba(255, 255, 255, 0.04)',
                    borderLeft: '1.5px solid rgba(255, 255, 255, 0.04)',
                    borderRadius: '0 20px 0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255, 255, 255, 0.2)'
                  }}>
                    <Trash2 size={13} />
                  </div>

                  {/* Left Overlapping Number Circle */}
                  <div style={{
                    position: 'absolute',
                    left: '-14px',
                    top: '-14px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#0e1015',
                    border: '2px solid #ff4d6d',
                    boxShadow: '0 0 12px rgba(255, 77, 109, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    zIndex: 3
                  }}>
                    2
                  </div>
                </div>
              </div>
            </div>
          );
        } else {
          return (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              minHeight: '260px',
              background: 'radial-gradient(circle, rgba(25, 28, 36, 0.3) 0%, rgba(10, 11, 14, 0.8) 100%)',
              padding: '24px 40px',
              position: 'relative',
              gap: '16px'
            }}>
              {/* Floating Drawing Toolbar Mockup */}
              <div style={{
                display: 'flex',
                background: 'rgba(30, 34, 42, 0.85)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
                padding: '6px 12px',
                gap: '10px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                zIndex: 10
              }}>
                {/* Pen Button (Active) */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(66, 133, 244, 0.25)',
                  color: '#4285f4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'default'
                }}>
                  <Pencil size={18} />
                </div>

                {/* Highlighter Button */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: '#ffd700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'default',
                  opacity: 0.8
                }}>
                  <Highlighter size={18} />
                </div>

                {/* Eraser Button */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: '#a0aab5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'default'
                }}>
                  <Eraser size={18} />
                </div>

                {/* Divider */}
                <div style={{
                  width: '1px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  margin: '4px 2px'
                }} />

                {/* Clear All (X) Button */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: '#a0aab5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'default'
                }}>
                  <X size={18} />
                </div>
              </div>

              {/* Node Card Mockup with SVG drawings on top */}
              <div style={{
                position: 'relative',
                width: '290px',
                height: '90px'
              }}>
                {/* Node Box */}
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: '#15171e',
                  border: '1.5px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '20px',
                  padding: '12px 16px',
                  position: 'relative',
                  boxShadow: '0 15px 30px rgba(0, 0, 0, 0.4)',
                  textAlign: 'left'
                }}>
                  {/* Tag */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    fontSize: '9px',
                    fontWeight: '800',
                    color: '#ff4d6d',
                    background: 'rgba(255, 77, 109, 0.05)',
                    border: '1px solid rgba(255, 77, 109, 0.25)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    letterSpacing: '0.5px'
                  }}>
                    M1-1
                  </div>

                  {/* Title */}
                  <div style={{
                    position: 'absolute',
                    left: '20px',
                    right: '20px',
                    top: '52%',
                    transform: 'translateY(-50%)',
                    fontSize: '17px',
                    fontWeight: '800',
                    color: '#ffffff',
                    letterSpacing: '0.2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    DPM 손실함수
                  </div>
                </div>

                {/* SVG Drawing overlay to simulate pen and highlighter drawing */}
                <svg style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 2
                }}>
                  {/* Highlighter yellow stroke over "손실함수" */}
                  <rect 
                    x="115" 
                    y="35" 
                    width="70" 
                    height="18" 
                    fill="rgba(255, 215, 0, 0.35)" 
                    rx="3"
                  />
                  {/* Red Pen underline under "DPM" */}
                  <path 
                    d="M 22,54 Q 45,58 70,53" 
                    fill="none" 
                    stroke="#ff4757" 
                    strokeWidth="3.5" 
                    strokeLinecap="round" 
                  />
                </svg>
              </div>
            </div>
          );
        }

      case 'quiz':
        if (quizSubStep === 0) {
          return (
            <div style={{
              width: '100%',
              height: '100%',
              background: '#090a0f',
              borderRadius: '20px',
              border: '1.5px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 15px 40px rgba(0, 0, 0, 0.5)',
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              textAlign: 'left',
              color: '#ffffff',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              {/* Header Area */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  display: 'inline-block',
                  background: '#ffffff',
                  color: '#090a0f',
                  fontSize: '8px',
                  fontWeight: '900',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  marginBottom: '6px'
                }}>
                  Quiz Mode
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 4px 0', color: '#ffffff' }}>
                  학습 퀴즈 설정
                </h2>
                <p style={{ fontSize: '11px', color: '#718096', margin: 0 }}>
                  학습한 내용을 점검하기 위한 맞춤형 문제를 구성하세요.
                </p>
              </div>

              {/* Layout Grid */}
              <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>
                {/* Column 1: 범위 선택 */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#cbd5e0', marginBottom: '8px' }}>
                    출제 범위
                  </span>
                  
                  {/* Select All Checkbox */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '10px',
                    cursor: 'default'
                  }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#090a0f',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}>
                      ✓
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#ffffff' }}>전체 선택</span>
                  </div>

                  {/* Node List Scrollbox */}
                  <div className="custom-scrollbar" style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    paddingRight: '4px'
                  }}>
                    {[
                      { tag: 'M1-1', title: 'DPM 손실함수' },
                      { tag: 'M2-1', title: 'KL 다이버전스' },
                      { tag: 'S1-1', title: 'SARSA의 수렴 조건 분석' },
                      { tag: 'M3-1', title: '단어 임베딩: GloVe' },
                      { tag: 'M4-1', title: '강화학습의 핵심, TD 학습' }
                    ].map((node, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        minHeight: '44px'
                      }}>
                        <div style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '3px',
                          background: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#090a0f',
                          fontSize: '9px',
                          fontWeight: 'bold'
                        }}>
                          ✓
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                          <span style={{ fontSize: '8px', fontWeight: '800', color: '#4285f4' }}>{node.tag}</span>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{node.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 2: 유형 및 개수 */}
                <div style={{ flex: 1.1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#cbd5e0' }}>
                    문제 유형 및 개수
                  </span>

                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    textAlign: 'center',
                    fontSize: '11px',
                    color: '#a0aec0',
                    fontWeight: '700'
                  }}>
                    전체 문제: <span style={{ color: '#ffffff' }}>0</span> / 20 개
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                    {/* OX Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#cbd5e0' }}>O,X 문제:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '3px 8px' }}>
                        <span style={{ color: '#718096', fontSize: '11px', fontWeight: '800', cursor: 'default' }}>-</span>
                        <span style={{ color: '#ffffff', fontSize: '11px', fontWeight: '800', width: '12px', textAlign: 'center' }}>0</span>
                        <span style={{ color: '#718096', fontSize: '11px', fontWeight: '800', cursor: 'default' }}>+</span>
                        <span style={{ color: '#718096', fontSize: '11px', marginLeft: '4px' }}>개</span>
                      </div>
                    </div>

                    {/* Multiple Choice Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#cbd5e0' }}>객관식:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '3px 8px' }}>
                        <span style={{ color: '#718096', fontSize: '11px', fontWeight: '800', cursor: 'default' }}>-</span>
                        <span style={{ color: '#ffffff', fontSize: '11px', fontWeight: '800', width: '12px', textAlign: 'center' }}>0</span>
                        <span style={{ color: '#718096', fontSize: '11px', fontWeight: '800', cursor: 'default' }}>+</span>
                        <span style={{ color: '#718096', fontSize: '11px', marginLeft: '4px' }}>개</span>
                      </div>
                    </div>

                    {/* Indented Calculation Sub-row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px', marginTop: '-4px' }}>
                      <div style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '3px',
                        border: '1.5px solid rgba(255,255,255,0.2)',
                        background: 'transparent'
                      }} />
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#a0aec0' }}>계산 문제 포함</span>
                    </div>

                    {/* Subjective Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#cbd5e0' }}>주관식:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '3px 8px' }}>
                        <span style={{ color: '#718096', fontSize: '11px', fontWeight: '800', cursor: 'default' }}>-</span>
                        <span style={{ color: '#ffffff', fontSize: '11px', fontWeight: '800', width: '12px', textAlign: 'center' }}>0</span>
                        <span style={{ color: '#718096', fontSize: '11px', fontWeight: '800', cursor: 'default' }}>+</span>
                        <span style={{ color: '#718096', fontSize: '11px', marginLeft: '4px' }}>개</span>
                      </div>
                    </div>

                    {/* Essay Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#cbd5e0' }}>서술형:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '3px 8px' }}>
                        <span style={{ color: '#718096', fontSize: '11px', fontWeight: '800', cursor: 'default' }}>-</span>
                        <span style={{ color: '#ffffff', fontSize: '11px', fontWeight: '800', width: '12px', textAlign: 'center' }}>0</span>
                        <span style={{ color: '#718096', fontSize: '11px', fontWeight: '800', cursor: 'default' }}>+</span>
                        <span style={{ color: '#718096', fontSize: '11px', marginLeft: '4px' }}>개</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 3: 난이도 */}
                <div style={{ flex: 0.8, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#cbd5e0' }}>
                    난이도
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, justifyContent: 'center' }}>
                    {/* Easy (Active) */}
                    <div style={{
                      background: 'linear-gradient(135deg, #00c292 0%, #08e3b2 100%)',
                      color: '#000000',
                      fontWeight: '900',
                      fontSize: '15px',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '42px',
                      boxShadow: '0 4px 15px rgba(0, 194, 146, 0.35)',
                      cursor: 'default'
                    }}>
                      하
                    </div>

                    {/* Medium */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1.5px solid rgba(255, 255, 255, 0.06)',
                      color: '#ffffff',
                      fontWeight: '800',
                      fontSize: '15px',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '42px',
                      opacity: 0.8,
                      cursor: 'default'
                    }}>
                      중
                    </div>

                    {/* Hard */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1.5px solid rgba(255, 255, 255, 0.06)',
                      color: '#ffffff',
                      fontWeight: '800',
                      fontSize: '15px',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '42px',
                      opacity: 0.8,
                      cursor: 'default'
                    }}>
                      상
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        } else {
          return (
            <div style={{
              width: '100%',
              height: '100%',
              background: '#090a0f',
              borderRadius: '20px',
              border: '1.5px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 15px 40px rgba(0, 0, 0, 0.5)',
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              textAlign: 'left',
              color: '#ffffff',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              {/* Header Area */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '16px' 
              }}>
                <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: '#ffffff' }}>
                  생성된 퀴즈
                </h2>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'rgba(255, 255, 255, 0.4)',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}>
                  5
                </div>
              </div>

              {/* Scrollable Quiz List */}
              <div className="custom-scrollbar" style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingRight: '4px'
              }}>
                {[
                  { difficulty: '하', count: 2 },
                  { difficulty: '상', count: 6 },
                  { difficulty: '상', count: 4 },
                  { difficulty: '중', count: 4 },
                  { difficulty: '상', count: 4 }
                ].map((quiz, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '16px',
                    padding: '12px 18px',
                    minHeight: '62px'
                  }}>
                    {/* Left details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>
                          DPM 손실 퀴즈
                        </span>
                        <Pencil size={11} style={{ color: 'rgba(255, 255, 255, 0.3)', marginTop: '1px' }} />
                      </div>
                      <span style={{ fontSize: '11px', color: '#718096', fontWeight: '600' }}>
                        {quiz.difficulty} · {quiz.count}문제
                      </span>
                    </div>

                    {/* Right action controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'rgba(255, 71, 87, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ff4757',
                        cursor: 'default'
                      }}>
                        <Trash2 size={14} />
                      </div>
                      <ChevronRight size={16} style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

      case 'summary':
        return (
          <div className="welcome-slide-inner" style={{ height: '100%', justifyContent: 'center', margin: 0 }}>
            <div className="welcome-logo-box" style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
              <FileText size={36} color="#fff" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', margin: '10px 0 4px 0', color: '#ffffff' }}>
              정리본 모드
            </h3>
            <p style={{ fontSize: '13px', color: '#a0aec0', margin: 0, textAlign: 'center', maxWidth: '340px' }}>
              학습이 끝난 후 핵심 요약본을 생성하고 다운로드하여 오프라인에서 활용하세요.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepText = () => {
    switch (activeTab) {
      case 'welcome':
        if (welcomeSubStep === 0) {
          return {
            title: '반갑습니다!',
            desc: 'Chat for Edu는 마인드맵 기반의 AI 보조 프로그램입니다. 책 아이콘을 언제든 다시 누르면 본 가이드를 볼 수 있습니다.'
          };
        } else {
          return {
            title: '👤 계정 및 프로필 관리',
            desc: '우측 상단의 프로필 아이콘(아바타)을 클릭하면 로그인된 계정 정보를 확인할 수 있습니다. 로그아웃을 하거나, 현재 계정을 영구적으로 삭제(계정 탈퇴)할 수 있습니다.'
          };
        }
      case 'search':
        if (searchSubStep === 0) {
          return {
            title: '🔍 메인 로비 통합 검색',
            desc: '메인 화면의 검색창에서 찾고 싶은 학습 키워드를 입력해 보세요. 생성된 전체 프로젝트 폴더와 해당 프로젝트 하위의 노드 문서까지 한꺼번에 찾아내 줍니다.'
          };
        } else {
          return {
            title: '🔍 프로젝트 내 노드 검색',
            desc: '개별 프로젝트 화면 내에서도 하위 개념을 검색할 수 있습니다. 수많은 마인드맵 노드 목록 중 입력한 키워드와 매칭되는 노드(예: M1-1 DPM 손실함수)를 바로 필터링해 줍니다.'
          };
        }
      case 'chat':
        if (chatSubStep === 0) {
          return {
            title: '💬 질문 노드 정보 및 제어 도구',
            desc: '선택된 개념 노드의 최상단에 나타나는 제어 바입니다. 대화나 개념 관리 시 유용하게 사용되는 기능들로 구성되어 있습니다.\n\n• ⭐ 즐겨찾기: 중요하거나 나중에 빠르게 복습하고 싶은 주요 개념 노드를 즐겨찾기 리스트에 등록합니다.\n• 📊 이해도 수치: 5단계 바를 눌러 해당 개념에 대한 본인의 실시간 이해 진척도를 기록해 둡니다.\n• 🔄 답변 재생성: 현재 노드의 질문 및 학습 상태를 기반으로 AI의 답변을 신규로 다시 출력 요청합니다.\n• ✏️ 편집: 노드의 이름이나 제목 텍스트를 마음대로 수정합니다.\n• 🗑️ 삭제: 학습 범위에서 불필요한 개념 블록 노드를 마인드맵에서 완전히 제거합니다.'
          };
        } else if (chatSubStep === 1) {
          return {
            title: '💬 스마트 채팅창 기본 기능',
            desc: '하단 입력창을 통해 AI와 자유롭게 대화하고 학습할 수 있습니다.\n\n📎 파일 첨부 아이콘으로 이미지나 텍스트 문서를 첨부할 수 있습니다.(대화당 1개)\n\n대화에 쓰일 ✨ AI 모델을 상황에 맞춰 고를 수 있습니다.'
          };
        } else if (chatSubStep === 2) {
          return {
            title: '↳ 연동 답변 모드 설정',
            desc: '입력창 우측의 ↳ 아이콘을 클릭하여 활성화합니다.\n\n이 모드가 활성화된 상태에서 질문을 전송(엔터키 입력 또는 종이비행기 아이콘 클릭)하면, AI가 도출한 상세 답변을 사전에 지정해둔 참조 노드(예: M1-1)의 하위 영역으로 자동으로 삽입하여 마인드맵 정보를 체계적으로 구조화합니다.'
          };
        } else if (chatSubStep === 3) {
          return {
            title: '[+] 신규 빈 노드 추가 모드',
            desc: '입력창 우측의 [+] 아이콘을 클릭하여 활성화합니다.\n\n이 모드는 AI가 따로 텍스트 답변을 출력하지 않도록 설계되었습니다. 활성화된 상태에서 입력창에 글을 작성하고 전송하면, 해당 텍스트 제목을 가진 새로운 빈 노드(개념 블록)를 마인드맵 화면 상에 즉시 신규로 추가하고 자유롭게 연결할 수 있도록 준비해 줍니다.'
          };
        } else {
          return {
            title: '✨ 다른 주제로 새 프로젝트 만들기',
            desc: '입력창 우측의 Sparkles(별무리) 아이콘을 클릭하여 실행합니다.\n\n현재 학습 중인 내용과 연관이 없거나 완전히 새로운 주제로 대화를 전개하고 싶을 때 사용합니다. 작성한 대화 텍스트 내용을 기반으로 새로운 독립 마인드맵 프로젝트를 즉시 개설하여 생성해 줍니다.'
          };
        }
      case 'node':
        if (nodeSubStep === 0) {
          return {
            title: '🧠 마인드맵 노드 구조 및 제어',
            desc: '학습 대화가 진행되면 핵심 지식이 노드 형태로 시각화됩니다. 각 노드의 구성 요소와 포트 연결 방식은 다음과 같습니다.\n\n• 🔴 좌측 상단 숫자 뱃지: 프로젝트에서 생성한 답변의 순서를 의미합니다.\n• ⭐ 좌측 별 아이콘 (즐겨찾기): 중요하거나 복습이 필요한 개념 노드를 마인드맵상에서 즐겨찾기로 등록하여 표시합니다.\n• 📊 상단 5단계 이해도 표시기: 동그라미를 직접 클릭하여 해당 개념에 대한 본인의 실시간 이해 수준(1~5단계)을 기록하고 관리합니다.\n• 🖱️ 노드 더블클릭: 노드를 더블클릭하면 해당 개념 노드의 상세 설명 및 메모 내용을 열람하고 편집할 수 있습니다.\n• 🗑️ 우측 상단 삭제 버튼: 필요 없는 개념 노드를 마인드맵 화면에서 즉시 삭제합니다.\n• 🔵 하단 포트 (아래 점): 현재 노드의 하위에 추가적인 세부 개념 블록을 새로 확장하여 연결할 때 사용합니다.\n• 🔵 우측 포트 (오른쪽 점): 동일 계층의 연계 개념이나 다음 학습 단계 노드로 개념을 이어서 연결할 때 사용합니다.'
          };
        } else if (nodeSubStep === 1) {
          return {
            title: '🔗 노드 간 연결 끊기 (관계 해제)',
            desc: '마인드맵에서 부모 노드와 연결되어 있는 자식 노드에 마우스 커서를 올리면(Hover), 해당 노드의 왼쪽 경계선에 🔴 빨간색 [X] 모양의 선 끊기 버튼이 나타납니다.\n\n• 🗑️ 관계 해제: [X] 버튼을 클릭하면 부모 개념과의 관계선이 즉시 해제됩니다.\n• 🌿 하위 연결 유지: 연결을 끊더라도, 해당 노드의 오른쪽이나 아래쪽으로 연결된 하위 노드들은 그대로 유지됩니다.\n• 🟦 B 블록 전환: 부모와의 관계가 끊어지며 최상위 독립 노드가 된 개념은 자동으로 B 블록(독립 루트 노드) 형태로 전환됩니다.'
          };
        } else {
          return {
            title: '🖍️ 마인드맵 필기 도구 (드로잉 툴바)',
            desc: '채팅창 좌측 상단에는 마인드맵 위에 직접 필기할 수 있는 드로잉 툴바가 제공됩니다.\n\n• ✏️ 펜: 마인드맵 캔버스 위에 자유롭게 선을 그리거나 중요한 내용을 필기할 수 있습니다. 아이콘을 클릭하여 색상 프리셋을 선택할 수 있습니다.\n• 🖍️ 형광펜: 반투명하고 굵은 마킹선으로 핵심 지식이나 키워드를 강조할 때 유용하게 쓰입니다. 동일하게 클릭 시 색상 변경이 가능합니다.\n• 🧹 지우개: 작성한 필기 선을 마우스로 문지르거나 클릭하여 개별적으로 깔끔하게 지울 수 있습니다.\n• ❌ 전체 삭제 (X 아이콘): 클릭하면 마인드맵 상에 그린 모든 필기(드로잉 선)를 한 번에 지우고 캔버스를 깨끗하게 비웁니다.'
          };
        }
      case 'quiz':
        if (quizSubStep === 0) {
          return {
            title: '✏️ 맞춤형 AI 퀴즈 출제 및 설정',
            desc: '원하는 학습 노드를 직접 출제 범위로 지정한 뒤, 원하는 문제 유형(O/X, 객관식, 주관식, 서술형)과 개수, 난이도를 골라 맞춤형 학습 점검 퀴즈를 생성할 수 있습니다.'
          };
        } else {
          return {
            title: '📋 생성된 퀴즈 목록 확인',
            desc: '퀴즈 설정 화면에서 생성을 누르면 생성 작업이 시작되며, 퀴즈 출제 완료 알림창이 팝업으로 나타납니다.\n\n그 후, 화면 오른쪽의 퀴즈 목록 탭에서 지금까지 생성된 모든 학습 퀴즈(난이도, 문제 수 등)를 한눈에 모아보고 복습하거나 삭제하여 관리할 수 있습니다.'
          };
        }
      case 'summary':
        return {
          title: '📄 한눈에 보는 핵심 정리본',
          desc: 'AI가 생성한 답변들을 종합해서 정리해 줍니다.\n\n• ⚡ 생성하기: 지금까지 학습한 대화 답변들을 취합하여 최신 핵심 정리본을 생성하거나 업데이트합니다.\n• 💾 다운로드: 정리 완료된 텍스트 요약본을 파일(.txt)로 다운로드하여 오프라인에서 활용하거나 소장할 수 있습니다.'
        };
      default:
        return { title: '', desc: '' };
    }
  };

  const { title, desc } = getStepText();

  return createPortal(
    <div className="tutorial-overlay-backdrop" onClick={onClose}>
      <div className="tutorial-overlay-window" onClick={(e) => e.stopPropagation()}>
        <button className="tutorial-close-btn" onClick={onClose} aria-label="닫기">
          <X size={20} />
        </button>

        {/* Sidebar */}
        <div className="tutorial-sidebar">
          <div className="tutorial-sidebar-header">
            <div className="tutorial-logo">
              <Sparkles size={20} color="#4285f4" />
              <span>Edu Guide</span>
            </div>
          </div>

          <div className="tutorial-tabs-list">
            <button 
              className={`tutorial-tab-btn ${activeTab === 'welcome' ? 'active' : ''}`}
              onClick={() => { setActiveTab('welcome'); setWelcomeSubStep(0); }}
            >
              💡 기본 소개
            </button>
            <button 
              className={`tutorial-tab-btn ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => { setActiveTab('search'); setSearchSubStep(0); }}
            >
              🔍 검색 기능
            </button>
            <button 
              className={`tutorial-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => { setActiveTab('chat'); setChatSubStep(0); }}
            >
              💬 채팅 모드
            </button>
            <button 
              className={`tutorial-tab-btn ${activeTab === 'node' ? 'active' : ''}`}
              onClick={() => { setActiveTab('node'); setNodeSubStep(0); }}
            >
              🧠 노드 모드
            </button>
            <button 
              className={`tutorial-tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
              onClick={() => setActiveTab('quiz')}
            >
              ✏️ 퀴즈 모드
            </button>
            <button 
              className={`tutorial-tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('summary')}
            >
              📄 정리본 모드
            </button>
          </div>

          <div className="tutorial-sidebar-footer">
            <span>v1.0.0 Stable</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="tutorial-content-area">
          <div className="tutorial-step-view">
            <div className="tutorial-text-desc">
              <h2>{title}</h2>
              <p style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>{desc}</p>
            </div>

            <div className="tutorial-mockup-container">
              {renderMockup()}
            </div>
          </div>

          {/* Navigation Footer */}
          <div className="tutorial-nav-footer">
            <div className="tutorial-dot-indicators">
              {slides.map((slide) => (
                <div 
                  key={slide} 
                  className={`tutorial-dot ${getSlideKey() === slide ? 'active' : ''}`} 
                  onClick={() => handleDotClick(slide)}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {!(activeTab === 'welcome' && welcomeSubStep === 0) && (
                <button className="tutorial-nav-btn prev" onClick={handlePrev}>
                  <ChevronLeft size={16} />
                  이전
                </button>
              )}
              <button className="tutorial-nav-btn next" onClick={handleNext}>
                {activeTab === 'summary' ? '완료' : '다음'}
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TutorialOverlay;
