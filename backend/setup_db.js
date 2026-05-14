const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * 지정된 테이블에 특정 컬럼이 존재하지 않을 경우에만 안전하게 추가하는 헬퍼 함수
 */
async function addColumnIfNotExists(connection, tableName, columnName, columnDefinition) {
  try {
    const [columns] = await connection.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE ?`, [columnName]);
    if (columns.length === 0) {
      await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDefinition}`);
      console.log(`  [Migration] ✅ \`${tableName}\` 테이블에 누락된 \`${columnName}\` 컬럼을 성공적으로 추가했습니다.`);
    } else {
      console.log(`  [Migration] ⏭️  \`${tableName}\` 테이블의 \`${columnName}\` 컬럼이 이미 존재합니다. (건너뜀)`);
    }
  } catch (err) {
    console.error(`  [Migration] ❌ \`${tableName}\`.\`${columnName}\` 점검 중 오류 발생:`, err.message);
  }
}

/**
 * 데이터베이스 통합 초기화 및 자동 마이그레이션 메인 함수
 */
async function setupDb() {
  // DB명을 명시하지 않고 루트 접속을 수행하여 DB 자체의 생성 여부를 안전하게 검사합니다.
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('\n==================================================');
    console.log('       🚀 데이터베이스 자동 점검 및 마이그레이션');
    console.log('==================================================\n');

    const dbName = process.env.DB_NAME || 'gemini_db';

    // 1. 데이터베이스 안전 생성 및 선택
    console.log(`[단계 1] 데이터베이스 상태 점검 (\`${dbName}\`)`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.query(`USE \`${dbName}\``);
    console.log(`  ✅ 데이터베이스 접속 및 활성화 완료.\n`);

    // 2. 핵심 5개 테이블 정의 (멱등성 보장 - 기존 데이터 절대 보존)
    console.log('[단계 2] 테이블 스키마 무결성 점검 (CREATE IF NOT EXISTS)');
    
    // Users 테이블
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        preferred_model VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✅ Users 테이블 준비 완료.');

    // Chats 테이블
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Chats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        drawings LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);
    console.log('  ✅ Chats 테이블 준비 완료.');

    // Messages 테이블
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chat_id INT NOT NULL,
        parent_id INT DEFAULT NULL,
        sender ENUM('user', 'ai', 'system') NOT NULL DEFAULT 'user',
        node_label VARCHAR(50),
        node_title VARCHAR(255),
        question_text TEXT,
        answer_text TEXT,
        photo_url VARCHAR(500),
        understanding_score INT DEFAULT 0,
        is_favorite BOOLEAN DEFAULT FALSE,
        node_type ENUM('qa', 'content') DEFAULT 'qa',
        reference_node_id INT DEFAULT NULL,
        position_x FLOAT DEFAULT NULL,
        position_y FLOAT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_id) REFERENCES Chats(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES Messages(id) ON DELETE SET NULL,
        FOREIGN KEY (reference_node_id) REFERENCES Messages(id) ON DELETE SET NULL
      )
    `);
    console.log('  ✅ Messages 테이블 준비 완료.');

    // Quizzes 테이블
    await connection.query(`
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
    console.log('  ✅ Quizzes 테이블 준비 완료.');

    // Questions 테이블
    await connection.query(`
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
    console.log('  ✅ Questions 테이블 준비 완료.\n');

    // 3. 누락된 컬럼 동적 감지 및 마이그레이션 (구버전 스키마 대응)
    console.log('[단계 3] 구버전 스키마 누락 컬럼 정밀 검사');
    
    // Users 테이블 확장 컬럼
    await addColumnIfNotExists(connection, 'Users', 'preferred_model', 'VARCHAR(255) DEFAULT NULL');

    // Chats 테이블 확장 컬럼
    await addColumnIfNotExists(connection, 'Chats', 'drawings', 'LONGTEXT AFTER updated_at');

    // Messages 테이블 확장 컬럼
    await addColumnIfNotExists(connection, 'Messages', 'node_type', "ENUM('qa', 'content') DEFAULT 'qa'");
    await addColumnIfNotExists(connection, 'Messages', 'reference_node_id', 'INT DEFAULT NULL');
    await addColumnIfNotExists(connection, 'Messages', 'position_x', 'FLOAT DEFAULT NULL');
    await addColumnIfNotExists(connection, 'Messages', 'position_y', 'FLOAT DEFAULT NULL');

    // Questions 테이블 확장 컬럼
    await addColumnIfNotExists(connection, 'Questions', 'difficulty', 'VARCHAR(50) AFTER explanation');
    await addColumnIfNotExists(connection, 'Questions', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER difficulty');
    console.log();

    // 4. 외래키 제약조건 안전 교정 (CASCADE -> SET NULL)
    console.log('[단계 4] 데이터 관계 안정성(외래키) 교정');
    try {
      // 제약조건이 존재하는지 삭제 시도 (없으면 에러 무시)
      await connection.query(`ALTER TABLE Messages DROP FOREIGN KEY messages_ibfk_2`);
    } catch (_) { 
      // 이미 삭제되었거나 존재하지 않는 경우 조용히 넘어갑니다.
    }

    try {
      // 올바른 정책(ON DELETE SET NULL)으로 외래키 재설정
      await connection.query(`
        ALTER TABLE Messages 
        ADD CONSTRAINT messages_ibfk_2 
        FOREIGN KEY (parent_id) REFERENCES Messages(id) ON DELETE SET NULL
      `);
      console.log('  ✅ Messages 테이블의 부모 노드 참조 제약조건(ON DELETE SET NULL) 교정 완료.');
    } catch (err) {
      // 이미 올바른 이름으로 설정되어 있거나 추가 실패 시 로그만 남깁니다.
      console.log('  ⏭️  외래키 제약조건이 이미 안정적으로 구성되어 있습니다.');
    }
    console.log();

    // 5. 잔여 더미/유령 데이터 청소 (서버 비정상 종료 시 남은 찌꺼기 정리)
    console.log('[단계 5] 시스템 잔여 유령 데이터 정리');
    const [cleanupResult] = await connection.query(`DELETE FROM Quizzes WHERE status = 'generating'`);
    if (cleanupResult.affectedRows > 0) {
      console.log(`  🧹 ${cleanupResult.affectedRows}개의 처리 중단된 더미 퀴즈 데이터를 안전하게 청소했습니다.`);
    } else {
      console.log('  ✅ 청소할 유령 퀴즈 데이터가 없습니다. (깨끗함)');
    }

    console.log('\n==================================================');
    console.log('    🎉 모든 데이터베이스 점검 및 세팅이 완료되었습니다!');
    console.log('==================================================\n');

  } catch (error) {
    console.error('\n❌ 데이터베이스 초기화 및 자동 마이그레이션 중 치명적 오류 발생:\n', error);
    throw error; // 호출부(server.js)로 예외를 전파하여 후속 조치가 가능하도록 합니다.
  } finally {
    await connection.end();
  }
}

module.exports = setupDb;
