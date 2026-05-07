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

        // 1. 새로운 컬럼들 추가 (기존 데이터 유지)
        try {
            await connection.query(`
                ALTER TABLE Messages 
                ADD COLUMN position_x FLOAT DEFAULT NULL AFTER reference_node_id,
                ADD COLUMN position_y FLOAT DEFAULT NULL AFTER position_x;
            `);
            console.log('컬럼 추가 완료: Messages.position_x, position_y');
        } catch (err) {
            if (err.code !== 'ER_DUP_COLUMN_NAME' && err.code !== 'ER_DUP_FIELDNAME') throw err;
        }

        // 2. 새로운 외래 키 제약 조건 설정
        try {
            await connection.query(`
                ALTER TABLE Messages
                ADD CONSTRAINT FK_Messages_Reference
                FOREIGN KEY (reference_node_id) REFERENCES Messages(id)
                ON DELETE SET NULL;
            `);
            console.log('외래 키 제약 조건 추가 완료: reference_node_id');
        } catch (err) {
            // Already exists or other error
        }

        // 3. Users 테이블에 선호 모델 컬럼 추가
        try {
            await connection.query(`
                ALTER TABLE Users 
                ADD COLUMN preferred_model VARCHAR(255) DEFAULT NULL;
            `);
            console.log('컬럼 추가 완료: Users.preferred_model');
        } catch (err) {
            if (err.code !== 'ER_DUP_COLUMN_NAME') throw err;
            console.warn('Users.preferred_model 컬럼이 이미 존재합니다.');
        }

        console.log('모든 마이그레이션이 성공적으로 완료되었습니다.');
    } catch (error) {
        console.error('마이그레이션 도중 에러 발생:', error);
    } finally {
        await connection.end();
    }
}

migrate();