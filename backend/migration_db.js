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

        // 1. 기존 테이블 컬럼 추가 (Messages)
        try {
            await connection.query(`
                ALTER TABLE Messages 
                ADD COLUMN position_x FLOAT DEFAULT NULL AFTER reference_node_id,
                ADD COLUMN position_y FLOAT DEFAULT NULL AFTER position_x;
            `);
            console.log('Messages 컬럼 추가 완료: position_x, position_y');
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAME') console.log('Messages 컬럼이 이미 존재합니다.');
            else throw err;
        }

        // 2. 퀴즈 마스터 테이블 생성 (Quizzes)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS Quizzes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                chat_id INT NOT NULL,
                title VARCHAR(255) DEFAULT NULL,
                status VARCHAR(50) DEFAULT 'ready',
                config JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (chat_id) REFERENCES Chats(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('Quizzes 테이블 확인/생성 완료');

        // 3. Quizzes 테이블에 title 컬럼이 없는 경우를 위한 추가 체크
        try {
            await connection.query(`ALTER TABLE Quizzes ADD COLUMN title VARCHAR(255) AFTER chat_id`);
            console.log('Quizzes 테이블에 title 컬럼을 추가했습니다.');
        } catch (err) {
            if (err.code !== 'ER_DUP_COLUMN_NAME') console.log('title 컬럼이 이미 존재하거나 확인되었습니다.');
        }

        // 4. 개별 퀴즈 문제 테이블 생성 (Questions)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS Questions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                quiz_id INT NOT NULL,
                question_text TEXT,
                question_type VARCHAR(50),
                options JSON,
                correct_answer TEXT,
                explanation TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (quiz_id) REFERENCES Quizzes(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('Questions 테이블 확인/생성 완료');

        console.log('모든 마이그레이션이 성공적으로 완료되었습니다.');
    } catch (error) {
        console.error('마이그레이션 도중 에러 발생:', error);
    } finally {
        await connection.end();
    }
}

migrate();