require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Gemini API 초기화 (안정적인 2.5 Flash 모델 사용)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// 이미지 데이터를 Gemini API용 포맷으로 변환하는 함수
function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType,
    },
  };
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
        role: "model",
        parts: [{ text: msg.answer_text }],
      });
    }
    // 2. 사용자 질문 (User)
    if (msg.question_text) {
      history.push({
        role: "user",
        parts: [{ text: msg.question_text }],
      });
    }

    currentId = msg.parent_id;
  }

  // 루트부터 현재까지 올바른 시간 순서로 정렬
  return history.reverse();
}

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

    res.json({ message: "로그인 성공", user: { id: user.id, user_id: user.user_id } });
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

// --- 채팅 관련 API ---

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

// 새로운 채팅 생성 및 첫 Q&A 노드 저장
app.post('/api/chats', upload.single('photo'), async (req, res) => {
  try {
    const { owner_id, text_content } = req.body;
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
한글로 답변하세요.`;

    let parts = [prompt];
    if (req.file) {
      parts.push(fileToGenerativePart(req.file.path, req.file.mimetype));
    }

    const result_ai = await model.generateContent(parts);
    const response_ai = await result_ai.response;
    const fullText = response_ai.text();

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
    res.status(500).json({ error: "채팅을 저장하지 못했습니다." });
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
    const { node_title, understanding_score, is_favorite } = req.body;

    let query = 'UPDATE Messages SET ';
    const fields = [];
    const values = [];

    if (node_title !== undefined) { fields.push('node_title = ?'); values.push(node_title); }
    if (understanding_score !== undefined) { fields.push('understanding_score = ?'); values.push(understanding_score); }
    if (is_favorite !== undefined) { fields.push('is_favorite = ?'); values.push(is_favorite); }

    if (fields.length === 0) return res.status(400).json({ error: "수정할 내용이 없습니다." });

    query += fields.join(', ') + ' WHERE id = ?';
    values.push(nodeId);

    await db.execute(query, values);
    res.json({ message: "노드가 업데이트되었습니다." });
  } catch (error) {
    console.error("Update Node Error:", error);
    res.status(500).json({ error: "노드 업데이트에 실패했습니다." });
  }
});

// 기존 노드에서 파생된 새로운 Q&A 노드 생성
app.post('/api/nodes', upload.single('photo'), async (req, res) => {
  try {
    let { chat_id, parent_id, text_content, node_label, node_type, answer_text } = req.body;
    const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

    // FormData 전송 시 "null" 문자열로 오는 경우 처리
    if (parent_id === "null" || parent_id === "" || parent_id === undefined) {
      parent_id = null;
    }

    // Gemini를 통해 제목과 답변 동시 생성 요청 (노드 확장용)
    let aiAnswer = answer_text;
    let aiTitle = (text_content && text_content.trim() !== "")
      ? (text_content.substring(0, 15))
      : "새 블록";

    if (!aiAnswer) {
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
한글로 답변하세요.`;

      // 2. 히스토리와 현재 질문 결합
      let contents = [...history];
      
      let currentPart = { text: prompt };
      let currentParts = [currentPart];
      
      if (req.file) {
        currentParts.push(fileToGenerativePart(req.file.path, req.file.mimetype));
      }
      
      contents.push({
        role: "user",
        parts: currentParts
      });

      // 3. gemini 호출 (generateContent를 사용하여 전체 문맥 전달)
      const result_ai = await model.generateContent({ contents });
      const response_ai = await result_ai.response;
      const fullText = response_ai.text();

      const titleMatch = fullText.match(/\[TITLE\]\s*(.*)/i);
      const answerMatch = fullText.match(/\[ANSWER\]\s*([\s\S]*)/i);

      if (titleMatch) aiTitle = titleMatch[1].split('\n')[0].trim();
      if (answerMatch) aiAnswer = answerMatch[1].trim();
      else aiAnswer = fullText;
    }

    const [result] = await db.execute(
      'INSERT INTO Messages (chat_id, parent_id, sender, node_label, node_title, question_text, answer_text, photo_url, node_type, understanding_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [chat_id, parent_id, 'user', node_label, aiTitle, text_content || '', aiAnswer, photo_url, node_type || 'qa', 1]
    );

    res.status(201).json({ id: result.insertId, node_title: aiTitle });
  } catch (error) {
    console.error("Add Node Error:", error);
    res.status(500).json({ error: "신규 노드 생성에 실패했습니다." });
  }
});


// AI 답변 재생성 API
app.put('/api/messages/:id/regenerate', async (req, res) => {
  const { id } = req.params;
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
한글로 답변하세요.`;

    let contents = [...history];
    let currentParts = [{ text: prompt }];

    // 사진이 있으면 경로를 찾아 절대 경로로 변환 (멀티모달 복구)
    if (msg.photo_url) {
      const photoPath = path.join(__dirname, msg.photo_url);
      if (fs.existsSync(photoPath)) {
        currentParts.push(fileToGenerativePart(photoPath, "image/jpeg"));
      }
    }

    contents.push({ role: "user", parts: currentParts });

    const result_ai = await model.generateContent({ contents });
    const response_ai = await result_ai.response;
    const fullText = response_ai.text();

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

// 노드 삭제 및 일련번호 정밀 재배열 API
app.delete('/api/nodes/:nodeId', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const nodeId = req.params.nodeId;

    // 1. 삭제할 노드 정보 획득
    const [[targetNode]] = await connection.execute(
      'SELECT chat_id, parent_id, node_label FROM Messages WHERE id = ?',
      [nodeId]
    );

    if (!targetNode) {
      await connection.rollback();
      return res.status(404).json({ error: "노드를 찾을 수 없습니다." });
    }

    const { chat_id, parent_id, node_label: oldTargetLabel } = targetNode;
    console.log(`[자동 삭제 시작] Target: ${oldTargetLabel} (ID: ${nodeId}), ParentID: ${parent_id}`);

    // 2. 노드 삭제 (CASCADE 설정에 의해 자식들도 삭제됨)
    await connection.execute('DELETE FROM Messages WHERE id = ?', [nodeId]);

    // 3. 남은 형제 노드들 재배열 (SQL NULL 이슈 해결을 위한 분기 처리)
    let siblingsQuery;
    let queryParams;
    if (parent_id === null || parent_id === "" || parent_id === undefined) {
      siblingsQuery = 'SELECT id, node_label FROM Messages WHERE chat_id = ? AND parent_id IS NULL';
      queryParams = [chat_id];
    } else {
      siblingsQuery = 'SELECT id, node_label FROM Messages WHERE chat_id = ? AND parent_id = ?';
      queryParams = [chat_id, parent_id];
    }

    const [siblings] = await connection.execute(siblingsQuery, queryParams);
    console.log(`[분석] 재배열 대상 형제 노드 수: ${siblings.length}`);

    // 사용자 정의 정렬 (알파벳-숫자 혼합)
    siblings.sort((a, b) => a.node_label.localeCompare(b.node_label, undefined, { numeric: true }));

    let currentStepCount = 0;
    let lastOriginalStepNum = -1;
    let currentVersionCount = 0;

    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      const oldLabel = sibling.node_label;
      const parts = oldLabel.split('-');

      // 마지막 두 파트 (예: "M4", "1") 분석
      const typeAndStep = parts[parts.length - 2];
      const type = typeAndStep.charAt(0); // 'M' or 'S'
      const stepNum = parseInt(typeAndStep.substring(1));

      // 새로운 스텝 단계인지 판단 (기존 수동 복구 로직 적용)
      if (stepNum !== lastOriginalStepNum) {
        currentStepCount++;
        currentVersionCount = 1;
        lastOriginalStepNum = stepNum;
      } else {
        currentVersionCount++;
      }

      // 접두사 유지하며 새로운 라벨 구성
      const prefixParts = parts.slice(0, parts.length - 2);
      const prefix = prefixParts.length > 0 ? prefixParts.join('-') + '-' : '';
      const newLabel = `${prefix}${type}${currentStepCount}-${currentVersionCount}`;

      if (oldLabel !== newLabel) {
        console.log(`[자동 재배열] ID: ${sibling.id}, ${oldLabel} -> ${newLabel}`);

        // 1) 본인 라벨 업데이트
        await connection.execute(
          'UPDATE Messages SET node_label = ? WHERE id = ?',
          [newLabel, sibling.id]
        );
        // 2) 자식들의 경로 접두사 일괄 치환 (Propagation)
        // 정확한 매칭을 위해 하이픈(-) 포함하여 REPLACE
        await connection.execute(
          `UPDATE Messages SET node_label = REPLACE(node_label, ?, ?) WHERE chat_id = ? AND node_label LIKE ?`,
          [oldLabel + "-", newLabel + "-", chat_id, oldLabel + "-%"]
        );
      }
    }

    await connection.commit();
    console.log("[자동 삭제 및 재배열 완료]");
    res.json({ message: "노드 삭제 및 정밀 재배열이 완료되었습니다." });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("[자동화 오류] Delete & Renumbering Error:", error);
    res.status(500).json({ error: "노드 삭제 중 서버 오류가 발생했습니다." });
  } finally {
    if (connection) connection.release();
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Gemini Backend Server running on port ${PORT}`);
});
