const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('마이그레이션을 시작합니다...');

        // 1. Messages 테이블 외래키 제약조건 수정
        try {
            await connection.query(`
                ALTER TABLE Messages 
                DROP FOREIGN KEY messages_ibfk_2; 
            `);
            console.log('기존 외래키 제약조건 삭제 완료: 제약조건(messages_ibfk_2)');
        } catch (err) {
            console.log('외래키 삭제 건너뜀 (이미 삭제되었거나 존재하지 않음)');
        }

        await connection.query(`
            ALTER TABLE Messages 
            ADD CONSTRAINT messages_ibfk_2
            FOREIGN KEY (parent_id) REFERENCES Messages(id) 
            ON DELETE SET NULL;
        `);
        console.log('Messages 테이블 외래키 제약 조건 변경 완료');

        // 2. Quizzes 테이블 생성
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
        console.log('Quizzes 테이블 확인/생성 완료');

        // 3. Questions 테이블 생성
        await connection.query(`
            CREATE TABLE IF NOT EXISTS Questions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                quiz_id INT NOT NULL,
                question_text TEXT,
                question_type VARCHAR(50),
                options JSON,
                correct_answer TEXT,
                explanation TEXT,
                FOREIGN KEY (quiz_id) REFERENCES Quizzes(id) ON DELETE CASCADE
            )
        `);
        console.log('Questions 테이블 확인/생성 완료');

        // 4. Questions 테이블 컬럼 추가 마이그레이션
        const [columns] = await connection.query(`SHOW COLUMNS FROM Questions`);
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('difficulty')) {
            await connection.query('ALTER TABLE Questions ADD COLUMN difficulty VARCHAR(50) AFTER explanation');
            console.log('Questions 테이블에 difficulty 컬럼 추가 완료');
        }

        if (!columnNames.includes('created_at')) {
            await connection.query('ALTER TABLE Questions ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER difficulty');
            console.log('Questions 테이블에 created_at 컬럼 추가 완료');
        }

        // 5. Chats 테이블 drawings 컬럼 추가
        const [chatColumns] = await connection.query(`SHOW COLUMNS FROM Chats`);
        const chatColumnNames = chatColumns.map(c => c.Field);

        if (!chatColumnNames.includes('drawings')) {
            await connection.query('ALTER TABLE Chats ADD COLUMN drawings LONGTEXT AFTER updated_at');
            console.log('Chats 테이블에 drawings 컬럼 추가 완료');
        }

        console.log('모든 마이그레이션이 성공적으로 완료되었습니다.');
    } catch (error) {
        console.error('마이그레이션 도중 에러 발생:', error);
    } finally {
        await connection.end();
    }
}

migrate();