require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Gemini API 초기화 (안정적인 2.5 Flash-Lite 모델 사용)
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

async function updateMainNodeLabels(chat_id, connectionObj = null) {
  const connection = connectionObj || await db.getConnection();
  try {
    if (!connectionObj) await connection.beginTransaction();

    const [allNodes] = await connection.execute('SELECT * FROM Messages WHERE chat_id = ? ORDER BY created_at ASC', [chat_id]);
    
    // 메인 노드 필터링: M으로 시작하는 메인 노드이거나, 선이 연결되어 있어 번호를 새로 매겨야 하는 독립 노드(B1-1)만 포함
    const mainNodes = allNodes.filter(n => 
      (n.node_label.startsWith('M') && !n.node_label.includes('-S')) ||
      (n.reference_node_id && (n.node_label === 'B1-1' || n.node_label === 'temp-sibling'))
    );
    
    const nodeX = {};
    const getX = (nodeId) => {
      if (nodeX[nodeId]) return nodeX[nodeId];
      const node = allNodes.find(n => n.id === nodeId);
      if (!node || !node.reference_node_id) {
        nodeX[nodeId] = 1;
        return 1;
      }
      const x = getX(node.reference_node_id) + 1;
      nodeX[nodeId] = x;
      return x;
    };

    const nodesByPhase = {};
    let maxPhase = 0;
    
    for (const node of mainNodes) {
      if (node.node_type === 'content' && !node.reference_node_id) continue;
      
      const x = getX(node.id);
      if (!nodesByPhase[x]) nodesByPhase[x] = [];
      nodesByPhase[x].push(node);
      if (x > maxPhase) maxPhase = x;
    }
    
    for (let x = 1; x <= maxPhase; x++) {
      const phaseNodes = nodesByPhase[x];
      if (!phaseNodes || phaseNodes.length === 0) continue;
      
      phaseNodes.sort((a, b) => {
        // 1. 부모(Reference Node)의 이름표를 기준으로 먼저 정렬
        const refA = allNodes.find(n => n.id == a.reference_node_id);
        const refB = allNodes.find(n => n.id == b.reference_node_id);
        
        if (refA && refB) {
          // 부모 이름표가 다르면 부모 순서대로
          const cmp = refA.node_label.localeCompare(refB.node_label, undefined, { numeric: true });
          if (cmp !== 0) return cmp;
        } else if (refA && !refB) {
          return 1;
        } else if (!refA && refB) {
          return -1;
        }
        
        // 2. 부모가 같거나 둘 다 없으면 생성 시간 순으로
        return new Date(a.created_at) - new Date(b.created_at);
      });
      
      for (let i = 0; i < phaseNodes.length; i++) {
        const node = phaseNodes[i];
        const newLabel = `M${x}-${i + 1}`;
        const oldLabel = node.node_label;
        
        if (newLabel !== oldLabel) {
          await connection.execute('UPDATE Messages SET node_label = ? WHERE id = ?', [newLabel, node.id]);
          node.node_label = newLabel;
          
          const memoryNode = allNodes.find(n => n.id == node.id);
          if (memoryNode) memoryNode.node_label = newLabel;
          
          // 하단 자식(-S)들도 즉시 부모 이름을 따라가도록 업데이트
          await connection.execute(
            'UPDATE Messages SET node_label = CONCAT(?, SUBSTRING(node_label, ?)) WHERE chat_id = ? AND node_label LIKE ?',
            [newLabel, oldLabel.length + 1, chat_id, `${oldLabel}-%`]
          );
          
          // 메모리 상의 노드들도 동기화 (재귀적 처리를 위해 중요)
          for (const m of allNodes) {
             if (m.node_label.startsWith(`${oldLabel}-`)) {
                m.node_label = newLabel + m.node_label.substring(oldLabel.length);
             }
          }
        }
      }
    }
    
    if (!connectionObj) await connection.commit();
  } catch (err) {
    if (!connectionObj) await connection.rollback();
    console.error("updateMainNodeLabels Error:", err);
    throw err;
  } finally {
    if (!connectionObj) connection.release();
  }
}

/**
 * 특정 노드부터 시작하여 그 아래에 달린 모든 노드(형제, 자식)의 이름표를 
 * 현재 그래프 구조(reference_node_id)에 맞게 재귀적으로 동기화합니다.
 */
async function syncSubTreeLabels(chat_id, startNodeId, startLabel) {
    const [allNodes] = await db.execute('SELECT * FROM Messages WHERE chat_id = ? ORDER BY created_at ASC', [chat_id]);
    
    const syncRecursive = async (nodeId, newLabel) => {
        // 현재 노드 업데이트
        await db.execute('UPDATE Messages SET node_label = ? WHERE id = ?', [newLabel, nodeId]);

        // 이 노드를 참조하는 자식/형제들 찾기
        const children = allNodes.filter(n => n.reference_node_id == nodeId);
        const siblings = children.filter(c => c.parent_id != nodeId);
        const subNodes = children.filter(c => c.parent_id == nodeId);

        // 형제 라벨링 (우측 연결)
        for (let i = 0; i < siblings.length; i++) {
            const s = siblings[i];
            let sLabel = "";
            if (newLabel.includes('-S')) {
                // 서브 노드의 형제: 버전 증가 (M1-1-S1-1 -> M1-1-S1-2)
                const lastDashIndex = newLabel.lastIndexOf('-');
                const prefix = newLabel.substring(0, lastDashIndex + 1);
                sLabel = `${prefix}${i + 2}`;
            } else if (newLabel.startsWith('M')) {
                // 메인 노드의 형제: 단계 증가 (M1-1 -> M2-1)
                const mMatch = newLabel.match(/^M(\d+)-(\d+)/);
                if (mMatch) {
                    const phase = parseInt(mMatch[1]);
                    sLabel = `M${phase + 1}-${i + 1}`;
                }
            } else if (newLabel.startsWith('B')) {
                // 독립 블럭의 형제: 단계 증가 및 가문 번호 유지 (B1-1(1) -> B2-1(1))
                const bMatch = newLabel.match(/^B(\d+)-(\d+)\((\d+)\)/);
                if (bMatch) {
                    const phase = parseInt(bMatch[1]);
                    const familyId = bMatch[3];
                    sLabel = `B${phase + 1}-1(${familyId})`;
                } else {
                    // 혹시 매칭 실패 시 안전 장치
                    sLabel = `${newLabel}-R${i + 1}`;
                }
            }
            await syncRecursive(s.id, sLabel);
        }

        // 자식 라벨링 (하단 연결)
        for (let i = 0; i < subNodes.length; i++) {
            const c = subNodes[i];
            const cLabel = `${newLabel}-S1-${i + 1}`;
            await syncRecursive(c.id, cLabel);
        }
    };

    await syncRecursive(startNodeId, startLabel);
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
    const { node_title, understanding_score, is_favorite, reference_node_id } = req.body;

    let query = 'UPDATE Messages SET ';
    const fields = [];
    const values = [];

    const [[nodeInfo]] = await db.execute('SELECT chat_id, node_label FROM Messages WHERE id = ?', [nodeId]);
    if (!nodeInfo) return res.status(404).json({ error: "노드를 찾을 수 없습니다." });

    if (node_title !== undefined) { fields.push('node_title = ?'); values.push(node_title); }
    if (understanding_score !== undefined) { fields.push('understanding_score = ?'); values.push(understanding_score); }
    if (is_favorite !== undefined) { fields.push('is_favorite = ?'); values.push(is_favorite); }
    
    if (reference_node_id !== undefined) { 
      fields.push('reference_node_id = ?'); 
      values.push(reference_node_id); 
      
      // 선 끊기(unlink) 발생 시, 노드 타입에 상관없이 고유한 B1-1(n) 부여
      if (reference_node_id === null) {
        // 현재 해당 채팅방에 있는 B1-1 계열의 최대 숫자 찾기
        const [[maxB]] = await db.execute(
          "SELECT node_label FROM Messages WHERE chat_id = ? AND node_label LIKE 'B1-1(%)'",
          [nodeInfo.chat_id]
        );
        
        // 정규식으로 숫자 추출 및 다음 번호 결정 (목록을 다 가져와서 체크)
        const [allB] = await db.execute(
          "SELECT node_label FROM Messages WHERE chat_id = ? AND node_label REGEXP '^B1-1\\\\([0-9]+\\\\)'",
          [nodeInfo.chat_id]
        );
        let maxNum = 0;
        allB.forEach(b => {
          const m = b.node_label.match(/\((\d+)\)/);
          if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
        });
        
        const nextLabel = `B1-1(${maxNum + 1})`;
        fields.push('node_label = ?');
        values.push(nextLabel);
      }
    }

    if (fields.length === 0) return res.status(400).json({ error: "수정할 내용이 없습니다." });

    query += fields.join(', ') + ' WHERE id = ?';
    values.push(nodeId);
    await db.execute(query, values);

    // 연결 관계가 변경된 경우(연결 또는 해제), 전체 재배열을 다시 수행합니다.
    if (reference_node_id !== undefined) {
      if (nodeInfo) {
        // 만약 선이 끊어진 것이라면(B1-1이 되었다면), 하위 자식들의 접두사도 B1-1로 바꿔줍니다.
        if (reference_node_id === null) {
           const [[finalNode]] = await db.execute('SELECT node_label FROM Messages WHERE id = ?', [nodeId]);
           const newLabel = finalNode.node_label; // 'B1-1(n)'
           
           // 하위 전체 연쇄 업데이트 실행
           await syncSubTreeLabels(nodeInfo.chat_id, nodeId, newLabel);
        }
        await updateMainNodeLabels(nodeInfo.chat_id);
      }
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

    // 0. 타겟 노드가 이미 다른 곳에 연결되어 있는지 확인 (한 노드는 부모가 하나여야 함)
    if (targetNode.reference_node_id !== null) {
      return res.status(400).json({ error: "이미 연결된 노드입니다. 기존 연결을 먼저 끊어주세요." });
    }
    
    let newLabel = '';
    const pLabel = sourceNode.node_label;
    const segments = pLabel.split('-');
    
    const [allNodes] = await db.execute('SELECT * FROM Messages WHERE chat_id = ?', [sourceNode.chat_id]);
    
    if (connection_type === 'child') {
      const prefix = `${pLabel}-S1-`;
      const expectedSegmentsLength = segments.length + 2;
      
      const sameLevelNodes = allNodes.filter(n => 
        n.node_label.startsWith(prefix) && 
        n.node_label.split('-').length === expectedSegmentsLength
      );
      newLabel = `${prefix}${sameLevelNodes.length + 1}`;
    } else {
      const lastPart = segments[segments.length - 2];
      const type = lastPart.charAt(0);
      const currentVal = parseInt(lastPart.substring(1));
      const newVal = currentVal + 1;
      
      const pPrefixSegments = segments.slice(0, segments.length - 2);
      const targetBase = (pPrefixSegments.length > 0 ? pPrefixSegments.join('-') + '-' : '') + type + newVal + '-';
      
      const expectedSegmentsLength = pPrefixSegments.length + 2;
      const existingCount = allNodes.filter(n => 
        n.node_label.startsWith(targetBase) && 
        n.node_label.split('-').length === expectedSegmentsLength
      ).length;
      newLabel = `${targetBase}${existingCount + 1}`;
    }
    
    const oldPrefix = targetNode.node_label;
    const exactPattern = oldPrefix;
    const likePattern = `${oldPrefix}-%`;
    const substringStartIndex = oldPrefix.length + 1;
    
    // 1. 하위 노드들을 포함하여 연쇄적으로 라벨 앞부분 교체
    await db.execute(
      'UPDATE Messages SET node_label = CONCAT(?, SUBSTRING(node_label, ?)) WHERE chat_id = ? AND (node_label = ? OR node_label LIKE ?)',
      [newLabel, substringStartIndex, sourceNode.chat_id, exactPattern, likePattern]
    );
    
    // 2. 타겟 노드의 기준 노드 및 부모 ID 업데이트
    // M 노드 간의 연결일 경우, 트리 구조를 유지하기 위해 parent_id도 업데이트합니다.
    let updateParentId = targetNode.parent_id;
    if (connection_type === 'child') {
      updateParentId = source_id;
    } else {
      updateParentId = sourceNode.parent_id;
    }

    await db.execute(
      'UPDATE Messages SET reference_node_id = ?, parent_id = ? WHERE id = ?',
      [source_id, updateParentId, target_id]
    );

    // 3. 타겟 노드가 들고 있던 서브 트리도 새 라벨 접두사에 맞춰 업데이트 (B1-1 -> M... 계열로 변신)
    // 이 시점에 targetNode.node_label은 이미 DB에서 바뀌었으므로, 바뀐 라벨을 다시 가져옴
    const [[updatedTarget]] = await db.execute('SELECT node_label FROM Messages WHERE id = ?', [target_id]);
    const finalNewLabel = updatedTarget.node_label;

    // 하위 전체 연쇄 업데이트 실행 (B계열 소속원들이 다시 M가문의 이름을 받음)
    await syncSubTreeLabels(sourceNode.chat_id, target_id, finalNewLabel);

    // 메인 노드 재배열 수행
    await updateMainNodeLabels(sourceNode.chat_id);

    res.json({ message: "연결 및 라벨 재배열 완료", newLabel: finalNewLabel });
  } catch (error) {
    console.error("Connect Node Error:", error);
    res.status(500).json({ error: "노드 연결에 실패했습니다." });
  }
});

// 기존 노드에서 파생된 새로운 Q&A 노드 생성
app.post('/api/nodes', upload.single('photo'), async (req, res) => {
  try {
    let { chat_id, parent_id, reference_node_id, text_content, node_label, node_type, answer_text } = req.body;
    const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

    // FormData 전송 시 "null" 문자열로 오는 경우 처리
    if (parent_id === "null" || parent_id === "" || parent_id === undefined) {
      parent_id = null;
    }
    if (reference_node_id === "null" || reference_node_id === "" || reference_node_id === undefined) {
        reference_node_id = null;
    }

    // 이름표(node_label) 자동 생성 로직
    if (!node_label || node_label === "undefined") {
      if (!reference_node_id) {
        // 독립 노드 (B1-1(n) 형식)
        const [allB] = await db.execute(
          "SELECT node_label FROM Messages WHERE chat_id = ? AND node_label REGEXP '^B1-1\\\\([0-9]+\\\\)'",
          [chat_id]
        );
        let maxNum = 0;
        allB.forEach(b => {
          const m = b.node_label.match(/\((\d+)\)/);
          if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
        });
        node_label = `B1-1(${maxNum + 1})`;
      } else {
        const [[refNode]] = await db.execute('SELECT node_label FROM Messages WHERE id = ?', [reference_node_id]);
        if (refNode) {
          if (String(parent_id) === String(reference_node_id)) {
            // 자식 노드 (아래쪽 연결)
            const [[childCount]] = await db.execute(
              'SELECT COUNT(*) as count FROM Messages WHERE reference_node_id = ? AND node_label LIKE ?',
              [reference_node_id, `${refNode.node_label}-S1-%`]
            );
            node_label = `${refNode.node_label}-S1-${childCount.count + 1}`;
          } else {
            // 형제 노드 (우측 연결)
            node_label = 'temp-sibling'; // updateMainNodeLabels에서 확정됨
          }
        } else {
          node_label = 'B1-1';
        }
      }
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
      'INSERT INTO Messages (chat_id, parent_id, reference_node_id, sender, node_label, node_title, question_text, answer_text, photo_url, node_type, understanding_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [chat_id, parent_id, reference_node_id, 'user', node_label, aiTitle, text_content || '', aiAnswer, photo_url, node_type || 'qa', 1]
    );

    // 독립 메모 블럭인 경우 무조건 B1-1 부여
    if (node_type === 'content' && !reference_node_id) {
       // 이미 위에서 M1-1 등으로 계산되었을 수 있으므로 강제 덮어쓰기
       await db.execute('UPDATE Messages SET node_label = ? WHERE id = ?', ['B1-1', result.insertId]);
    } else if (node_label && node_label.startsWith('M') && !node_label.includes('-S')) {
      await updateMainNodeLabels(chat_id);
    }

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
    
    // 메인 노드(M) 재배열 로직 통합 (삭제 후 빈자리 채우기 및 정렬 유지)
    if (oldTargetLabel && oldTargetLabel.startsWith('M') && !oldTargetLabel.includes('-S')) {
      await updateMainNodeLabels(chat_id);
    }

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
