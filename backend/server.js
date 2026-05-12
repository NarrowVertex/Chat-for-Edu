require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const aiService = require('./ai-service');
const availableModels = aiService.availableModels;

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png': return 'image/png';
    case '.webp': return 'image/webp';
    case '.heic': return 'image/heic';
    case '.heif': return 'image/heif';
    default: return 'image/jpeg';
  }
}

// 트리 구조에서 상위 노드들을 추적하여 대화 히스토리를 구성하는 함수
async function getChatHistory(parentId) {
  let history = [];
  let currentId = parentId;

  while (currentId) {
    const [rows] = await db.execute(
      'SELECT parent_id, question_text, answer_text FROM Messages WHERE id = ?',
      [currentId]
    );

    if (rows.length === 0) break;
    const msg = rows[0];

    // 현재 노드의 질문과 답변을 히스토리에 추가 (역순으로 쌓이므로 나중에 뒤집음)
    // 1. 모델 답변 (AI)
    if (msg.answer_text) {
      history.push({
        role: "assistant",
        content: msg.answer_text,
      });
    }
    // 2. 사용자 질문 (User)
    if (msg.question_text) {
      history.push({
        role: "user",
        content: msg.question_text,
      });
    }

    currentId = msg.parent_id;
  }

  // 루트부터 현재까지 올바른 시간 순서로 정렬
  return history.reverse();
}

// 데이터베이스 테이블 초기화
async function initDB() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Quizzes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chat_id INT NOT NULL,
        title VARCHAR(255),
        status VARCHAR(50) DEFAULT 'ready',
        config JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_id) REFERENCES Chats(id) ON DELETE CASCADE
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS Questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        quiz_id INT NOT NULL,
        question_text TEXT,
        question_type VARCHAR(50),
        options JSON,
        correct_answer TEXT,
        explanation TEXT,
        difficulty VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quiz_id) REFERENCES Quizzes(id) ON DELETE CASCADE
      )
    `);

    // [추가] 기존 테이블에 컬럼이 없을 경우를 대비한 자동 마이그레이션
    try {
      await db.execute('ALTER TABLE Questions ADD COLUMN difficulty VARCHAR(50) AFTER explanation');
      console.log('[DB Migration] Questions 테이블에 difficulty 컬럼을 추가했습니다.');
    } catch (err) {
      if (err.code !== 'ER_DUP_COLUMN_NAME') {
        console.error('[DB Migration] difficulty 추가 중 에러:', err.message);
      }
    }

    try {
      await db.execute('ALTER TABLE Questions ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER difficulty');
      console.log('[DB Migration] Questions 테이블에 created_at 컬럼을 추가했습니다.');
    } catch (err) {
      if (err.code !== 'ER_DUP_COLUMN_NAME') {
        console.error('[DB Migration] created_at 추가 중 에러:', err.message);
      }
    }

    // [추가] 서버 시작 시, 완료되지 못하고 'generating' 상태로 남은 유령 데이터 삭제
    const [cleanupResult] = await db.execute(`DELETE FROM Quizzes WHERE status = 'generating'`);
    if (cleanupResult.affectedRows > 0) {
      console.log(`[DB Cleanup] ${cleanupResult.affectedRows}개의 유령 퀴즈 데이터를 정리했습니다.`);
    }

    console.log('퀴즈 관련 테이블 및 데이터 정리 완료');
  } catch (err) {
    console.error('DB 초기화 에러:', err);
  }
}
initDB();

const app = express();
app.use(cors());
app.use(express.json());

// static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

// 회원가입 API
app.post('/api/auth/register', async (req, res) => {
  try {
    const { user_id, password } = req.body;
    if (!user_id || !password) {
      return res.status(400).json({ error: "아이디와 비밀번호를 모두 입력해주세요." });
    }

    const isValidString = (str) => /^[\x21-\x7E]+$/.test(str);
    if (!isValidString(user_id) || !isValidString(password)) {
      return res.status(400).json({ error: "아이디 비밀번호는 영어,숫자,특수문자만 가능합니다" });
    }

    const [existing] = await db.execute('SELECT * FROM Users WHERE user_id = ?', [user_id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "아이디 혹은 비밀번호를 다르게 생성하십시오" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await db.execute(
      'INSERT INTO Users (user_id, password_hash) VALUES (?, ?)',
      [user_id, hashedPassword]
    );

    res.status(201).json({ message: "회원가입이 완료되었습니다.", id: result.insertId });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ error: "서버 내부 오류가 발생했습니다." });
  }
});

// 로그인 API
app.post('/api/auth/login', async (req, res) => {
  try {
    const { user_id, password } = req.body;
    if (!user_id || !password) {
      return res.status(400).json({ error: "아이디와 비밀번호를 모두 입력해주세요." });
    }

    const [rows] = await db.execute('SELECT * FROM Users WHERE user_id = ?', [user_id]);
    if (rows.length === 0) {
      return res.status(401).json({ error: "존재하지 않는 정보입니다" });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: "존재하지 않는 정보입니다" });
    }

    res.json({
      message: "로그인 성공",
      user: {
        id: user.id,
        user_id: user.user_id,
        preferred_model: user.preferred_model
      }
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "서버 내부 오류가 발생했습니다." });
  }
});

// 계정 탈퇴 API
app.delete('/api/auth/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    await db.execute('DELETE FROM Users WHERE id = ?', [userId]);
    res.json({ message: "계정 맟 관련 정보가 모두 삭제되었습니다." });
  } catch (error) {
    console.error("Delete Account Error:", error);
    res.status(500).json({ error: "서버 내부 오류가 발생했습니다." });
  }
});

// --- AI 모델 관련 API ---

// 사용 가능한 모델 리스트 가져오기
app.get('/api/ai-models', (req, res) => {
  // API Key 환경변수명은 제외하고 클라이언트에 전달
  const clientModels = availableModels.map(({ apiKeyEnv, ...rest }) => rest);
  res.json(clientModels);
});

// 유저 선호 모델 업데이트
app.patch('/api/auth/user/:id/preferred-model', async (req, res) => {
  try {
    const userId = req.params.id;
    const { preferred_model } = req.body;

    // 모델 존재 여부 확인 (null인 경우는 리스트의 첫번째로 간주되게 함)
    const modelExists = availableModels.some(m => m.id === preferred_model);
    const modelToSave = modelExists ? preferred_model : (availableModels[0]?.id || null);

    await db.execute('UPDATE Users SET preferred_model = ? WHERE id = ?', [modelToSave, userId]);
    res.json({ message: "선호 모델이 업데이트되었습니다.", preferred_model: modelToSave });
  } catch (error) {
    console.error("Update Preferred Model Error:", error);
    res.status(500).json({ error: "선호 모델 업데이트에 실패했습니다." });
  }
});

// --- 채팅 관련 API ---

async function updateMainNodeLabels(chat_id) {
  try {
    const [allNodes] = await db.execute('SELECT * FROM Messages WHERE chat_id = ? ORDER BY created_at ASC', [chat_id]);
    if (allNodes.length === 0) return;

    // 1. 뿌리 노드들 처리 (1세대)
    const roots = allNodes.filter(n => !n.reference_node_id).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    let queue = [];

    for (let i = 0; i < roots.length; i++) {
      const root = roots[i];
      // 뿌리 정화
      await db.execute('UPDATE Messages SET parent_id = NULL WHERE id = ?', [root.id]);
      const label = (i === 0) ? "M1-1" : `B1-1(${root.id})`;
      await db.execute('UPDATE Messages SET node_label = ? WHERE id = ?', [label, root.id]);
      queue.push({ id: root.id, label: label });
    }

    // 2. 세대별 순차 처리 (BFS 방식)
    while (queue.length > 0) {
      const nextQueue = [];
      // 현재 세대의 모든 자식들을 수집
      let allChildren = [];
      for (const parent of queue) {
        const children = allNodes.filter(n => n.reference_node_id === parent.id);
        for (const child of children) {
          // 관계 판별 (핸들 로직)
          const isBottom = String(child.parent_id) === String(parent.id);
          let type, phase, prefix;

          const lastSegmentRegex = /([MSB])(\d+)-(\d+)(\(\d+\))?$/;
          const match = parent.label.match(lastSegmentRegex);
          const [full, pType, pPhase, pInstance, pFamilyId] = match || ["", "M", "1", "1", ""];
          const pPrefix = parent.label.substring(0, parent.label.length - full.length);

          if (isBottom) {
            // 하단 연결: Depth 증가 (S1-1)
            type = "S";
            phase = 1;
            prefix = parent.label + "-";
          } else {
            // 우측 연결: Phase 증가
            type = pType;
            phase = parseInt(pPhase) + 1;
            prefix = pPrefix;
          }

          allChildren.push({
            node: child,
            parentLabel: parent.label,
            prefix,
            type,
            phase,
            familyId: pFamilyId || ""
          });
        }
      }

      // 수집된 모든 자식들을 그룹핑하여 전역 순번 부여
      const groups = {};
      for (const item of allChildren) {
        const groupKey = `${item.prefix}${item.type}${item.phase}${item.familyId}`;
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push(item);
      }

      for (const key in groups) {
        const groupNodes = groups[key];
        // 정렬: 부모 라벨 순 -> 생성 시간 순
        groupNodes.sort((a, b) => {
          const cmp = a.parentLabel.localeCompare(b.parentLabel, undefined, { numeric: true });
          if (cmp !== 0) return cmp;
          return new Date(a.node.created_at) - new Date(b.node.created_at);
        });

        for (let i = 0; i < groupNodes.length; i++) {
          const item = groupNodes[i];
          const newLabel = `${item.prefix}${item.type}${item.phase}-${i + 1}${item.familyId}`;

          // DB 업데이트 (parent_id는 이미 관계 판별 시 사용했으므로 라벨만 업데이트)
          await db.execute('UPDATE Messages SET node_label = ? WHERE id = ?', [newLabel, item.node.id]);
          nextQueue.push({ id: item.node.id, label: newLabel });
        }
      }
      queue = nextQueue;
    }
  } catch (err) {
    console.error("updateMainNodeLabels Error:", err);
    throw err;
  }
}


// 특정 사용자의 채팅 목록 가져오기
app.get('/api/chats/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const [rows] = await db.execute(
      'SELECT * FROM Chats WHERE owner_id = ? ORDER BY updated_at DESC',
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error("Fetch Chats Error:", error);
    res.status(500).json({ error: "채팅 목록을 불러오지 못했습니다." });
  }
});

// 전역 검색 API
app.get('/api/search/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const query = req.query.q;

    if (!query || query.trim() === '') return res.json([]);

    const searchPattern = `%${query}%`;
    const results = [];

    // 1. 프로젝트 매칭 (Chats 테이블)
    const [chats] = await db.execute(
      'SELECT id, title FROM Chats WHERE owner_id = ? AND title LIKE ? ORDER BY updated_at DESC',
      [userId, searchPattern]
    );

    chats.forEach(chat => {
      results.push({
        type: 'chat',
        chatId: chat.id,
        chatTitle: chat.title,
        id: `chat-${chat.id}`,
        title: chat.title,
        snippet: ''
      });
    });

    // 2. 블록(노드) 매칭 (Messages 테이블 JOIN Chats 테이블)
    const [nodes] = await db.execute(`
      SELECT m.id as node_id, m.chat_id, c.title as chat_title, m.node_title, m.question_text, m.answer_text
      FROM Messages m
      JOIN Chats c ON m.chat_id = c.id
      WHERE c.owner_id = ? AND (
        m.node_title LIKE ? OR 
        m.question_text LIKE ? OR 
        m.answer_text LIKE ?
      )
      ORDER BY m.created_at DESC
      LIMIT 30
    `, [userId, searchPattern, searchPattern, searchPattern]);

    nodes.forEach(node => {
      let snippet = '';
      const lowerQuery = query.toLowerCase();
      const fields = [node.node_title || '', node.question_text || '', node.answer_text || ''];

      for (const text of fields) {
        const lowerText = text.toLowerCase();
        const idx = lowerText.indexOf(lowerQuery);
        if (idx !== -1) {
          const start = Math.max(0, idx - 20);
          const end = Math.min(text.length, idx + query.length + 20);
          snippet = text.substring(start, end).replace(/\n/g, ' ');
          if (start > 0) snippet = '...' + snippet;
          if (end < text.length) snippet = snippet + '...';
          break;
        }
      }

      results.push({
        type: 'node',
        chatId: node.chat_id,
        chatTitle: node.chat_title,
        id: `node-${node.node_id}`,
        nodeId: node.node_id,
        title: node.node_title || '(제목 없음)',
        snippet: snippet
      });
    });

    res.json(results);
  } catch (error) {
    console.error("Global Search Error:", error);
    res.status(500).json({ error: "검색 중 오류가 발생했습니다." });
  }
});

// 특정 채팅 상세 정보 가져오기 (드로잉 등 포함)
app.get('/api/chats/detail/:id', async (req, res) => {
  try {
    const chatId = req.params.id;
    const [rows] = await db.execute('SELECT * FROM Chats WHERE id = ?', [chatId]);
    if (rows.length === 0) return res.status(404).json({ error: "채팅을 찾을 수 없습니다." });
    res.json(rows[0]);
  } catch (error) {
    console.error("Fetch Chat Detail Error:", error);
    res.status(500).json({ error: "채팅 정보를 불러오지 못했습니다." });
  }
});

// 채팅 제목 수정 API
app.patch('/api/chats/:id', async (req, res) => {
  try {
    const chatId = req.params.id;
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: "제목을 입력해주세요." });

    await db.execute('UPDATE Chats SET title = ? WHERE id = ?', [title, chatId]);
    res.json({ message: "제목이 수정되었습니다." });
  } catch (error) {
    console.error("Update Chat Title Error:", error);
    res.status(500).json({ error: "제목 수정에 실패했습니다." });
  }
});

// 채팅 그림(드로잉) 데이터 저장 API
app.patch('/api/chats/:id/drawings', async (req, res) => {
  try {
    const chatId = req.params.id;
    const { drawings } = req.body; // JSON string expected

    await db.execute('UPDATE Chats SET drawings = ? WHERE id = ?', [drawings, chatId]);
    res.json({ message: "드로잉 데이터가 저장되었습니다." });
  } catch (error) {
    console.error("Update Chat Drawings Error:", error);
    res.status(500).json({ error: "드로잉 저장에 실패했습니다." });
  }
});

// 새로운 채팅 생성 및 첫 Q&A 노드 저장
app.post('/api/chats', upload.single('photo'), async (req, res) => {
  try {
    const { owner_id, text_content, model_id } = req.body;
    const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

    // 1. Gemini를 통해 제목과 답변 동시 생성 요청
    const prompt = `당신은 에듀테크 학습 도우미입니다. 
사용자의 질문: '${text_content}'

위 질문에 대해 다음 두 가지를 생성해주세요:
1. 질문의 핵심을 찌르는 10자 이내의 짧은 제목
2. 학습 도우미로서 사용자가 이해하기 쉽도록 체계적으로 구조화된 상세한 심화 학습 내용 (각 핵심 내용이나 단계 사이에는 반드시 두 줄의 빈 줄을 넣어 시각적으로 아주 명확히 구분되게 하세요. 문장이 길어지면 자동으로 줄바꿈이 되도록 두지 말고, 의미 단위로 직접 줄바꿈을 수행하여 각 줄을 짧고 명확하게 구성하세요. 수학 공식은 반드시 별도의 줄($$...$$)에 배치하여 독립된 칸처럼 보이게 하세요.)

응답 형식은 반드시 다음과 같이 작성하세요:
[TITLE] 제목 내용
[ANSWER] 답변 내용

[중요] 답변 본문에는 절대 HTML 태그(<br>, <p>, <div>, <span> 등)를 사용하지 마세요. 줄바꿈은 마크다운 줄바꿈(빈 줄)만 사용하세요. 한글로 답변하세요.`;

    // 사용자 선호 모델 조회 (model_id가 없을 경우 대비)
    let finalModelId = model_id;
    if (!finalModelId) {
      const [userRows] = await db.execute('SELECT preferred_model FROM Users WHERE id = ?', [owner_id]);
      finalModelId = userRows[0]?.preferred_model || availableModels[0]?.id;
    }

    const fullText = await aiService.generateResponse(finalModelId, {
      prompt,
      imagePath: req.file ? req.file.path : null,
      mimeType: req.file ? req.file.mimetype : null
    });

    // [TITLE]과 [ANSWER] 파싱
    let aiTitle = text_content.substring(0, 15); // Fallback
    let aiAnswer = fullText;

    const titleMatch = fullText.match(/\[TITLE\]\s*(.*)/i);
    const answerMatch = fullText.match(/\[ANSWER\]\s*([\s\S]*)/i);

    if (titleMatch) aiTitle = titleMatch[1].split('\n')[0].trim();
    if (answerMatch) aiAnswer = answerMatch[1].trim();

    // 2. 새 채팅 프로젝트 생성 (AI가 만든 제목 적용)
    const [chatResult] = await db.execute(
      'INSERT INTO Chats (owner_id, title) VALUES (?, ?)',
      [owner_id, aiTitle]
    );
    const chatId = chatResult.insertId;

    // 3. 첫 번째 노드(M1-1) 저장
    const nodeLabel = "M1-1";
    await db.execute(
      'INSERT INTO Messages (chat_id, sender, node_label, node_title, question_text, answer_text, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [chatId, 'user', nodeLabel, aiTitle, text_content, aiAnswer, photo_url]
    );

    res.status(201).json({ chatId, title: aiTitle });
  } catch (error) {
    console.error("Create Chat Error:", error);
    res.status(500).json({
      error: error.status === 429
        ? "AI 사용량 제한이 초과되었습니다. 약 30초 후 다시 시도해 주세요."
        : "채팅 프로젝트 생성에 실패했습니다."
    });
  }
});

// 특정 채팅의 모든 노드 가져오기
app.get('/api/chats/:chatId/nodes', async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const [rows] = await db.execute(
      'SELECT * FROM Messages WHERE chat_id = ? ORDER BY created_at ASC',
      [chatId]
    );
    res.json(rows);
  } catch (error) {
    console.error("Fetch Nodes Error:", error);
    res.status(500).json({ error: "노드 목록을 불러오지 못했습니다." });
  }
});

// 노드 정보 수정 (이해도, 별점, 제목 등)
app.patch('/api/nodes/:nodeId', async (req, res) => {
  try {
    const nodeId = req.params.nodeId;
    const { node_title, understanding_score, is_favorite, reference_node_id, position_x, position_y } = req.body;

    const [[nodeInfo]] = await db.execute('SELECT chat_id FROM Messages WHERE id = ?', [nodeId]);
    if (!nodeInfo) return res.status(404).json({ error: "노드를 찾을 수 없습니다." });

    let fields = [];
    let values = [];

    if (node_title !== undefined) { fields.push('node_title = ?'); values.push(node_title); }
    if (understanding_score !== undefined) { fields.push('understanding_score = ?'); values.push(understanding_score); }
    if (is_favorite !== undefined) { fields.push('is_favorite = ?'); values.push(is_favorite); }
    if (position_x !== undefined) { fields.push('position_x = ?'); values.push(position_x); }
    if (position_y !== undefined) { fields.push('position_y = ?'); values.push(position_y); }

    if (reference_node_id !== undefined) {
      fields.push('reference_node_id = ?');
      values.push(reference_node_id);

      if (reference_node_id === null) {
        fields.push('parent_id = NULL');
      }
    }

    if (fields.length === 0) return res.status(400).json({ error: "수정할 내용이 없습니다." });

    const query = `UPDATE Messages SET ${fields.join(', ')} WHERE id = ?`;
    values.push(nodeId);
    await db.execute(query, values);

    if (reference_node_id !== undefined) {
      await updateMainNodeLabels(nodeInfo.chat_id);
    }

    res.json({ message: "노드가 업데이트되었습니다." });
  } catch (error) {
    console.error("Update Node Error:", error);
    res.status(500).json({ error: "노드 업데이트에 실패했습니다." });
  }
});


// 수동 선 연결 및 트레이스 업데이트
app.post('/api/nodes/connect', async (req, res) => {
  try {
    const { source_id, target_id, connection_type } = req.body;

    const [sourceRows] = await db.execute('SELECT * FROM Messages WHERE id = ?', [source_id]);
    const [targetRows] = await db.execute('SELECT * FROM Messages WHERE id = ?', [target_id]);

    if (sourceRows.length === 0 || targetRows.length === 0) {
      return res.status(404).json({ error: "노드를 찾을 수 없습니다." });
    }

    const sourceNode = sourceRows[0];
    const targetNode = targetRows[0];

    // 0. 타겟 노드가 이미 다른 곳에 연결되어 있는지 확인
    if (targetNode.reference_node_id !== null) {
      return res.status(400).json({ error: "이미 연결된 노드입니다. 기존 연결을 먼저 끊어주세요." });
    }

    const [allNodes] = await db.execute('SELECT * FROM Messages WHERE chat_id = ?', [sourceNode.chat_id]);

    // 신규 라벨 결정 (Rightmost Segment 규칙 적용)
    let newLabel = '';
    const pLabel = sourceNode.node_label;

    if (connection_type === 'child') {
      const prefix = `${pLabel}-S1-`;
      const sameLevelNodes = allNodes.filter(n =>
        n.reference_node_id === source_id &&
        n.node_label.startsWith(prefix)
      );
      newLabel = `${prefix}${sameLevelNodes.length + 1}`;
    } else {
      const lastSegmentRegex = /([MSB])(\d+)-(\d+)(\(\d+\))?$/;
      const match = pLabel.match(lastSegmentRegex);

      if (match) {
        const [full, type, phase, instance, familyId] = match;
        const prefix = pLabel.substring(0, pLabel.length - full.length);
        const newPhase = parseInt(phase) + 1;
        const targetBase = `${prefix}${type}${newPhase}-`;

        const existingCount = allNodes.filter(n =>
          n.node_label.startsWith(targetBase) &&
          (familyId ? n.node_label.endsWith(familyId) : !n.node_label.includes('('))
        ).length;

        newLabel = `${targetBase}${existingCount + 1}${familyId || ''}`;
      } else {
        newLabel = `${pLabel}-R1`;
      }
    }

    // 1. 타겟 노드의 기준 노드 및 부모 ID 업데이트
    let updateParentId = connection_type === 'child' ? source_id : sourceNode.parent_id;

    await db.execute(
      'UPDATE Messages SET reference_node_id = ?, parent_id = ? WHERE id = ?',
      [source_id, updateParentId, target_id]
    );

    // 2. 메인 노드 재배열 수행 (전체 트리 질서 정렬)
    await updateMainNodeLabels(sourceNode.chat_id);

    res.json({ message: "연결 및 라벨 재배열 완료" });
  } catch (error) {
    console.error("Connect Node Error:", error);
    res.status(500).json({ error: "노드 연결에 실패했습니다." });
  }
});

// 기존 노드에서 파생된 새로운 Q&A 노드 생성
app.post('/api/nodes', upload.single('photo'), async (req, res) => {
  try {
    let { chat_id, parent_id, reference_node_id, text_content, node_label, node_type, answer_text, model_id } = req.body;
    const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

    if (parent_id === "null" || parent_id === "" || parent_id === undefined) parent_id = null;
    if (reference_node_id === "null" || reference_node_id === "" || reference_node_id === undefined) reference_node_id = null;

    // 이름표(node_label) 자동 생성 로직 (단순화: updateMainNodeLabels가 최종 확정함)
    if (!node_label || node_label === "undefined") {
      node_label = reference_node_id ? 'temp-node' : 'B1-1';
    }

    // Gemini를 통해 제목과 답변 동시 생성 요청 (노드 확장용)
    let aiAnswer = answer_text || "";
    let aiTitle = (text_content && text_content.trim() !== "")
      ? (text_content.substring(0, 15))
      : "새 블록";

    if (!aiAnswer && node_type !== 'content') {
      // 1. 이전 대화 내역(히스토리) 가져오기
      const history = await getChatHistory(parent_id);

      const prompt = `당신은 에듀테크 학습 도우미입니다. 
사용자의 질문: '${text_content}'
현재 노드 단계: '${node_label}'

위 질문에 대해 다음 두 가지를 생성해주세요:
1. 해당 단계의 학습 내용을 대표하는 10자 이내의 짧은 요약 제목
2. 학습 도우미로서 사용자가 이해하기 쉽도록 체계적으로 구조화된 상세한 심화 학습 내용이나 해결책 (각 핵심 내용이나 단계 사이에는 반드시 두 줄의 빈 줄을 넣어 시각적으로 아주 명확히 구분되게 하세요. 이전 대화 내용을 참고하여 문맥에 맞는 답변을 하세요. 문장이 길어지면 자동으로 줄바꿈이 되도록 두지 말고, 의미 단위로 직접 줄바꿈을 수행하여 각 줄을 짧고 명확하게 구성하세요. 수학 공식은 반드시 별도의 줄($$...$$)에 배치하여 독립된 칸처럼 보이게 하세요.)

응답 형식은 반드시 다음과 같이 작성하세요:
[TITLE] 제목 내용
[ANSWER] 답변 내용

[중요] 답변 본문에는 절대 HTML 태그(<br>, <p>, <div>, <span> 등)를 사용하지 마세요. 줄바꿈은 마크다운 줄바꿈(빈 줄)만 사용하세요. 한글로 답변하세요.`;

      // 모델 결정
      let finalModelId = model_id;
      if (!finalModelId) {
        const [[chatInfo]] = await db.execute('SELECT owner_id FROM Chats WHERE id = ?', [chat_id]);
        if (chatInfo) {
          const [userRows] = await db.execute('SELECT preferred_model FROM Users WHERE id = ?', [chatInfo.owner_id]);
          finalModelId = userRows[0]?.preferred_model;
        }
        finalModelId = finalModelId || availableModels[0]?.id;
      }

      // 3. AI 호출
      const fullText = await aiService.generateResponse(finalModelId, {
        prompt,
        history,
        imagePath: req.file ? req.file.path : null,
        mimeType: req.file ? req.file.mimetype : null
      });

      const titleMatch = fullText.match(/\[TITLE\]\s*(.*)/i);
      const answerMatch = fullText.match(/\[ANSWER\]\s*([\s\S]*)/i);

      if (titleMatch) aiTitle = titleMatch[1].split('\n')[0].trim();
      if (answerMatch) aiAnswer = answerMatch[1].trim();
      else aiAnswer = fullText;
    }

    const [result] = await db.execute(
      'INSERT INTO Messages (chat_id, parent_id, reference_node_id, sender, node_label, node_title, question_text, answer_text, photo_url, node_type, understanding_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [chat_id, parent_id, reference_node_id, 'user', node_label, aiTitle, text_content || '', aiAnswer, photo_url, node_type || 'qa', 1]
    );

    // 모든 신규 노드 추가 후에는 트리 전체의 정합성과 일련번호 부여를 위해 
    // 전역 재배열 엔진(updateMainNodeLabels)을 반드시 수행합니다.
    await updateMainNodeLabels(chat_id);

    res.status(201).json({ id: result.insertId, node_title: aiTitle });
  } catch (error) {
    console.error("Add Node Error:", error);
    res.status(500).json({
      error: error.status === 429
        ? "AI 사용량 제한이 초과되었습니다. 잠시 후 다시 시도해 주세요."
        : "신규 노드 생성에 실패했습니다."
    });
  }
});

// AI 답변 재생성 API
app.put('/api/messages/:id/regenerate', async (req, res) => {
  const { id } = req.params;
  const { model_id } = req.body;
  try {
    // 1. 기존 메시지 정보 조회 (질문 텍스트 및 부모 ID 확보)
    const [messages] = await db.execute('SELECT * FROM Messages WHERE id = ?', [id]);
    if (messages.length === 0) return res.status(404).json({ error: "Message not found" });

    const msg = messages[0];
    const text_content = msg.question_text || "이전 질문 내용을 불러올 수 없습니다.";
    const node_label = msg.node_label;
    const parent_id = msg.parent_id;

    // 2. 이전 대화 내역(히스토리) 가져오기
    const history = await getChatHistory(parent_id);

    // 3. Gemini를 통해 답변 재생성
    const prompt = `당신은 에듀테크 학습 도우미입니다. 
사용자의 질문: '${text_content}'
현재 노드 단계: '${node_label}' (이 단계에 대해 답변을 다시 작성해주세요)

위 질문에 대해 다음 두 가지를 생성해주세요:
1. 해당 단계의 학습 내용을 대표하는 10자 이내의 짧은 요약 제목
2. 학습 도우미로서 사용자가 이해하기 쉽도록 체계적으로 구조화된 상세한 심화 학습 내용이나 해결책 (각 핵심 내용이나 단계 사이에는 반드시 두 줄의 빈 줄을 넣어 시각적으로 아주 명확히 구분되게 하세요. 수학 공식은 반드시 별도의 줄($$...$$)에 배치하여 독립된 칸처럼 보이게 하세요. 이전 대화 문맥을 고려하세요. 문장이 길어지면 자동으로 줄바꿈이 되도록 두지 말고, 의미 단위로 직접 줄바꿈을 수행하여 각 줄을 짧고 명확하게 구성하세요.)

응답 형식은 반드시 다음과 같이 작성하세요:
[TITLE] 제목 내용
[ANSWER] 답변 내용

[중요] 답변 본문에는 절대 HTML 태그(<br>, <p>, <div>, <span> 등)를 사용하지 마세요. 줄바꿈은 마크다운 줄바꿈(빈 줄)만 사용하세요. 한글로 답변하세요.`;

    // 모델 결정
    let finalModelId = model_id;
    if (!finalModelId) {
      const [[msgInfo]] = await db.execute('SELECT chat_id FROM Messages WHERE id = ?', [id]);
      if (msgInfo) {
        const [[chatInfo]] = await db.execute('SELECT owner_id FROM Chats WHERE id = ?', [msgInfo.chat_id]);
        if (chatInfo) {
          const [userRows] = await db.execute('SELECT preferred_model FROM Users WHERE id = ?', [chatInfo.owner_id]);
          finalModelId = userRows[0]?.preferred_model;
        }
      }
      finalModelId = finalModelId || availableModels[0]?.id;
    }

    const fullText = await aiService.generateResponse(finalModelId, {
      prompt,
      history,
      imagePath: msg.photo_url ? path.join(__dirname, msg.photo_url) : null,
      mimeType: "image/jpeg" // Assuming jpeg for stored photos
    });

    const titleMatch = fullText.match(/\[TITLE\]\s*(.*)/i);
    const answerMatch = fullText.match(/\[ANSWER\]\s*([\s\S]*)/i);

    let aiTitle = msg.node_title;
    let aiAnswer = fullText;

    if (titleMatch) aiTitle = titleMatch[1].split('\n')[0].trim();
    if (answerMatch) aiAnswer = answerMatch[1].trim();

    // 3. 데이터베이스 업데이트 (Messages 테이블)
    await db.execute(
      'UPDATE Messages SET node_title = ?, answer_text = ? WHERE id = ?',
      [aiTitle, aiAnswer, id]
    );

    res.json({ id, node_title: aiTitle, answer_text: aiAnswer });
  } catch (err) {
    console.error("Regenerate Error:", err);
    res.status(500).json({ error: "답변 재생성에 실패했습니다." });
  }
});

// 프로젝트 삭제 API
app.delete('/api/chats/:chatId', async (req, res) => {
  try {
    const chatId = req.params.chatId;
    await db.execute('DELETE FROM Chats WHERE id = ?', [chatId]);
    res.json({ message: "프로젝트가 삭제되었습니다." });
  } catch (error) {
    console.error("Delete Chat Error:", error);
    res.status(500).json({ error: "프로젝트 삭제에 실패했습니다." });
  }
});

// --- 퀴즈 관련 API ---

// --- 퀴즈 관련 API ---

// 퀴즈 생성 API
app.post('/api/quiz/generate', async (req, res) => {
  let quizId; // 에러 핸들링을 위해 스코프 상단에 선언
  try {
    const { chatId, selectedNodeIds, config } = req.body;
    const { types, difficulty, includeCalculation } = config;

    if (!selectedNodeIds || selectedNodeIds.length === 0) {
      return res.status(400).json({ error: "출제 범위를 선택해주세요." });
    }

    // 1. 선택된 노드들의 텍스트 데이터 수집
    const placeholders = selectedNodeIds.map(() => '?').join(',');
    const [nodes] = await db.execute(
      `SELECT question_text, answer_text, node_title FROM Messages WHERE id IN (${placeholders})`,
      selectedNodeIds
    );

    if (nodes.length === 0) {
      return res.status(404).json({ error: "학습 데이터를 찾을 수 없습니다." });
    }

    // 2. Quiz 마스터 레코드 생성 (생성 중 상태)
    const [quizResult] = await db.execute(
      `INSERT INTO Quizzes (chat_id, status, config) VALUES (?, 'generating', ?)`,
      [chatId, JSON.stringify(config)]
    );
    quizId = quizResult.insertId;

    try {
      const contextText = nodes.map(n =>
        `제목: ${n.node_title}\n질문: ${n.question_text}\n내용: ${n.answer_text}`
      ).join('\n\n---\n\n');

      // 난이도 및 계산 로직 구성
      let difficultyInstruction = "";
      if (difficulty === '하') {
        difficultyInstruction = "제공된 학습 내용에 명시된 사실을 그대로 확인하는 수준의 문제를 출제하세요.";
      } else if (difficulty === '중') {
        difficultyInstruction = "제공된 학습 내용을 실제 상황이나 새로운 사례에 적용하여 풀이해야 하는 응용 문제를 출제하세요.";
      } else if (difficulty === '상') {
        difficultyInstruction = "제공된 학습 내용을 기반으로 하되, 그 이상의 추론이나 관련 심화 지식을 연계하여 비판적 사고를 요구하는 확장형 문제를 출제하세요.";
      }

      let calculationInstruction = includeCalculation
        ? "주관식(short)과 서술형(descriptive) 문제는 반드시 제공된 수식이나 원리를 활용하여 직접 계산하거나 수치를 도출해야 하는 문제로 구성하세요."
        : "개념 설명 위주의 문제를 구성하세요.";

      const prompt = `당신은 에듀테크 전문 출제 위원입니다. 아래 제공된 [학습 내용]을 바탕으로 학생을 위한 맞춤형 퀴즈를 생성하세요.

[학습 내용]
${contextText}

[출제 요구사항]
1. 문제 유형 및 개수:
   - OX 문제: ${types.ox}개
   - 객관식: ${types.multiple}개
   - 주관식: ${types.short}개
   - 서술형: ${types.descriptive}개
2. 난이도 전략 [${difficulty}]: ${difficultyInstruction}
3. 계산 문제 포함 여부: ${calculationInstruction}
4. 모든 문제는 제공된 [학습 내용]의 범위를 벗어나지 않으면서도 난이도 전략에 충실해야 합니다.
5. 응답은 반드시 아래의 JSON 배열 형식으로만 작성하세요. 텍스트 설명은 포함하지 마세요.
6. [중요] 모든 문자열 값 내에서 백슬래시(\)를 사용할 때는 반드시 이중 백슬래시(\\)로 작성하여 JSON 파싱 에러가 나지 않게 하세요. (예: \theta -> \\theta, \mathbf -> \\mathbf)
7. 수학 기호나 수식은 가급적 텍스트로 표현하되, 꼭 필요하다면 반드시 이중 백슬래시를 사용하세요.

[응답 형식 예시]
[
  {
    "type": "ox",
    "question": "질문 내용 (예: $D_{KL}$은 항상 0 이상입니까?)",
    "answer": "O",
    "explanation": "해설 내용 (예: 항상 0 이상의 값을 가집니다.)"
  },
  {
    "type": "multiple",
    "question": "질문 내용",
    "options": ["보기1", "보기2", "보기3", "보기4"],
    "answer": "정답 내용(보기 중 하나)",
    "explanation": "해설 내용"
  },
  {
    "type": "short",
    "question": "질문 내용",
    "answer": "단답형 정답",
    "explanation": "해설 내용"
  },
  {
    "type": "descriptive",
    "question": "질문 내용",
    "answer": "모범 답안 핵심 키워드 또는 문장",
    "explanation": "상세 채점 기준 및 해설"
  }
]

한글로 작성하세요.`;

      // 3. Gemini 호출
      const result_ai = await model.generateContent(prompt);
      const response_ai = await result_ai.response;
      let fullText = response_ai.text();

      console.log("--- AI Raw Response ---");
      console.log(fullText);
      console.log("--- End Raw Response ---");

      // JSON 추출 및 정제
      let cleaned = fullText.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      const jsonStartIndex = cleaned.indexOf('[');
      const jsonEndIndex = cleaned.lastIndexOf(']') + 1;
      if (jsonStartIndex === -1 || jsonEndIndex === 0) throw new Error('JSON 배열을 찾을 수 없습니다.');
      let jsonString = cleaned.substring(jsonStartIndex, jsonEndIndex);

      console.log("--- Cleaned JSON String ---");
      console.log(jsonString);
      console.log("--- End JSON String ---");

      // [수정] 불안정한 수동 정규식 정제를 제거하고 바로 파싱 시도
      // AI가 3.0 모델이므로 프롬프트 지시만으로도 충분히 깨끗한 JSON을 생성합니다.
      let quizData;
      try {
        quizData = JSON.parse(jsonString);
      } catch (e) {
        console.error("Primary JSON Parse Failed, attempting fallback cleaning...");
        // 파싱 실패 시에만 최소한의 안전 장치 가동 (줄바꿈 및 제어 문자 보정)
        const secondaryCleaned = jsonString
          .replace(/\n/g, "\\n")
          .replace(/\r/g, "\\r")
          .replace(/\t/g, "\\t");
        quizData = JSON.parse(secondaryCleaned);
      }

      // 개별 문제들 저장
      for (const q of quizData) {
        await db.execute(
          'INSERT INTO Questions (quiz_id, question_text, question_type, options, correct_answer, explanation, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [quizId, q.question, q.type, q.options ? JSON.stringify(q.options) : null, q.answer, q.explanation, difficulty]
        );
      }

      // 상태 완료로 변경
      await db.execute('UPDATE Quizzes SET status = ? WHERE id = ?', ['completed', quizId]);

      res.json({ quizId, quizData });

    } catch (innerErr) {
      console.error("Quiz Logic Error:", innerErr);
      // 실패 시 DB 레코드 즉시 삭제 (유령 데이터 방지)
      if (quizId) {
        await db.execute('DELETE FROM Quizzes WHERE id = ?', [quizId]);
      }
      res.status(500).json({ error: innerErr.message || "퀴즈 생성 중 오류가 발생했습니다." });
    }

  } catch (error) {
    console.error("Outer Quiz Error:", error);
    if (quizId) {
      await db.execute('DELETE FROM Quizzes WHERE id = ?', [quizId]);
    }
    res.status(500).json({
      error: error.status === 429
        ? "AI 사용량 제한이 초과되었습니다. 잠시 후 다시 시도해 주세요."
        : "퀴즈 생성에 실패했습니다."
    });
  }
});

// 퀴즈 목록 조회
app.get('/api/chats/:chatId/quizzes', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, status, config, created_at FROM Quizzes WHERE chat_id = ? ORDER BY created_at DESC',
      [req.params.chatId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Fetch Quizzes Error:", err);
    res.status(500).json({ error: "퀴즈 목록을 불러오지 못했습니다." });
  }
});

// 특정 퀴즈의 문제들 조회
app.get('/api/quizzes/:quizId/questions', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, question_type, question_text, options, correct_answer, explanation, difficulty FROM Questions WHERE quiz_id = ? ORDER BY id ASC',
      [req.params.quizId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Fetch Questions Error:", err);
    res.status(500).json({ error: "문제를 불러오지 못했습니다." });
  }
});

// 서술형 채점 API
app.post('/api/quiz/grade', async (req, res) => {
  try {
    const { question_text, correct_answer, explanation, user_answer } = req.body;
    if (!user_answer) return res.json({ score: 0, feedback: "답안이 비어있습니다." });

    const prompt = `당신은 채점자입니다. 다음 문제와 모범 답안을 기준으로 사용자의 답안을 채점하세요.
    문제: ${question_text}
    모범 답안 및 기준: ${correct_answer} (해설: ${explanation})
    사용자 제출 답안: ${user_answer}

    위 내용을 종합적으로 판단하여 0점에서 100점 사이의 점수를 매기고, 간략한 피드백(어느 부분이 맞았고 틀렸는지 1~2문장)을 작성하세요.
    응답은 아래 JSON 형식으로만 반환하세요.
    {
      "score": 점수숫자,
      "feedback": "피드백내용"
    }`;

    const result_ai = await model.generateContent(prompt);
    let fullText = (await result_ai.response).text().replace(/```json|```/g, '').trim();
    res.json(JSON.parse(fullText));
  } catch (err) {
    console.error("Grade Quiz Error:", err);
    res.status(500).json({ error: "채점 중 오류가 발생했습니다." });
  }
});

// 퀴즈 삭제
app.delete('/api/quizzes/:quizId', async (req, res) => {
  try {
    await db.execute('DELETE FROM Quizzes WHERE id = ?', [req.params.quizId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "삭제 실패" });
  }
});

// 퀴즈 제목 수정
app.put('/api/quizzes/:quizId/title', async (req, res) => {
  try {
    const { title } = req.body;
    await db.execute('UPDATE Quizzes SET title = ? WHERE id = ?', [title, req.params.quizId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "수정 실패" });
  }
});

// 프로젝트(채팅방) 삭제 API 복구
app.delete('/api/chats/:chatId', async (req, res) => {
  try {
    const chatId = req.params.chatId;
    // Chats 테이블 삭제 시 ON DELETE CASCADE 설정으로 인해 
    // Messages(노드)와 Quizzes(퀴즈) 테이블의 관련 데이터도 자동으로 삭제됩니다.
    await db.execute('DELETE FROM Chats WHERE id = ?', [chatId]);
    res.json({ message: "프로젝트가 삭제되었습니다." });
  } catch (error) {
    console.error("Delete Chat Error:", error);
    res.status(500).json({ error: "프로젝트 삭제에 실패했습니다." });
  }
});

// 노드 삭제 및 일련번호 정밀 재배열 API
app.delete('/api/nodes/:nodeId', async (req, res) => {
  const nodeId = req.params.nodeId;
  try {
    const [[targetNode]] = await db.execute(
      'SELECT chat_id FROM Messages WHERE id = ?',
      [nodeId]
    );

    if (!targetNode) {
      return res.status(404).json({ error: "노드를 찾을 수 없습니다." });
    }

    const { chat_id } = targetNode;

    await db.execute('DELETE FROM Messages WHERE id = ?', [nodeId]);

    await updateMainNodeLabels(chat_id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete Node Error:', err);
    res.status(500).json({ error: `삭제 실패: ${err.message}` });
  }
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Gemini Backend Server running on port ${PORT}`);
});
