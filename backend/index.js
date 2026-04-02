require('dotenv').config();
const chatService = require('./chatService');
const pool = require('./db');

async function run() {
  try {
    console.log('============================================');
    console.log('   채팅 기록 관리 CRUD 테스트 스크립트      ');
    console.log('============================================\n');

    console.log('[1/6] 데이터베이스 및 테이블 초기화 시작...');
    const initSuccess = await chatService.initializeDatabase();
    if (!initSuccess) {
      console.log('❌ 초기화에 실패하여 종료합니다.');
      process.exit(1);
    }
    console.log('✅ 초기화 완료\n');

    console.log('[2/6] 유저 생성 (Create User)...');
    const userId = await chatService.createUser('testuser', 'test@example.com');
    console.log(`✅ 유저 ID [${userId}] 생성 (또는 조회) 완료\n`);

    console.log('[3/6] 채팅 기록 남기기 (Create Chat)...');
    const chat1Id = await chatService.addChat(userId, 'user', '안녕하세요! 첫 질문입니다.');
    const chat2Id = await chatService.addChat(userId, 'ai', '안녕하세요, 무엇을 도와드릴까요?');
    console.log(`✅ 생성 완료 (메시지 ID: ${chat1Id}, ${chat2Id})\n`);

    console.log('[4/6] 현재 채팅 목록 조회 (Read Chat)...');
    let chats = await chatService.getChatsByUserId(userId);
    console.table(chats.map(c => ({ ID: c.id, 역할: c.role, 메시지: c.message, 수정일: c.updated_at })));
    console.log('');

    console.log('[5/6] AI 답변 수정 (Update Chat)...');
    const updateResult = await chatService.updateChat(chat2Id, '[수정됨] 안녕하세요. 테스트 답변이 업데이트 되었습니다.');
    console.log(`✅ 수정 ${updateResult ? '성공' : '실패'}! 수정 후 다시 조회합니다.`);
    chats = await chatService.getChatsByUserId(userId);
    console.table(chats.map(c => ({ ID: c.id, 역할: c.role, 메시지: c.message })));
    console.log('');

    console.log('[6/6] 유저 질문 삭제 (Delete Chat)...');
    const deleteResult = await chatService.deleteChat(chat1Id);
    console.log(`✅ 삭제 ${deleteResult ? '성공' : '실패'}! 삭제 후 최종 조회합니다.`);
    chats = await chatService.getChatsByUserId(userId);
    console.table(chats.map(c => ({ ID: c.id, 역할: c.role, 메시지: c.message })));
    console.log('\n모든 CRUD 과정이 성공적으로 완료되었습니다.');
    
  } catch (error) {
    console.error('❌ 실행 중 에러가 발생했습니다:', error.message);
  } finally {
    // 종료를 위해 커넥션 풀을 닫습니다.
    await pool.end();
  }
}

run();
