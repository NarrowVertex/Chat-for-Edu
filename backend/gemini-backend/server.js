require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./db');
const path = require('path');
const multer = require('multer');

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
    
    // 1. 새 채팅 프로젝트 생성
    const title = text_content.substring(0, 20) + (text_content.length > 20 ? '...' : '');
    const [chatResult] = await db.execute(
      'INSERT INTO Chats (owner_id, title) VALUES (?, ?)', 
      [owner_id, title]
    );
    const chatId = chatResult.insertId;

    // 2. 첫 번째 노드(M1-1) 생성 - 질문과 답변 합본
    const nodeLabel = "M1-1";
    const nodeTitle = title;
    const mockAnswer = `분류된 '${title}'에 대한 학습 답변입니다.\n이 내용은 지식 카드 형태로 관리됩니다.`;

    await db.execute(
      'INSERT INTO Messages (chat_id, sender, node_label, node_title, question_text, answer_text, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [chatId, 'user', nodeLabel, nodeTitle, text_content, mockAnswer, photo_url]
    );

    res.status(201).json({ chatId, title });
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

    const nodeTitle = (text_content && text_content.trim() !== "") 
      ? (text_content.substring(0, 20) + (text_content.length > 20 ? '...' : '')) 
      : (answer_text ? answer_text.substring(0, 20) : "새 블록");
      
    const finalAnswer = answer_text || `'${node_label}'에 대한 심화 학습 내용입니다.`;

    const [result] = await db.execute(
      'INSERT INTO Messages (chat_id, parent_id, sender, node_label, node_title, question_text, answer_text, photo_url, node_type, understanding_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [chat_id, parent_id, 'user', node_label, nodeTitle, text_content || '', finalAnswer, photo_url, node_type || 'qa', 1]
    );

    res.status(201).json({ id: result.insertId, node_title: nodeTitle });
  } catch (error) {
    console.error("Add Node Error:", error);
    res.status(500).json({ error: "신규 노드 생성에 실패했습니다." });
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
