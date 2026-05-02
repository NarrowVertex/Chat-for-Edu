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
        await connection.query(`
            ALTER TABLE Messages 
            ADD COLUMN position_x FLOAT DEFAULT NULL AFTER reference_node_id,
            ADD COLUMN position_y FLOAT DEFAULT NULL AFTER position_x;
        `);
        console.log('컬럼 추가 완료: position_x, position_y');

        // 2. 새로운 외래 키 제약 조건 설정
        await connection.query(`
            ALTER TABLE Messages
            ADD CONSTRAINT FK_Messages_Reference
            FOREIGN KEY (reference_node_id) REFERENCES Messages(id)
            ON DELETE SET NULL;
        `);
        console.log('외래 키 제약 조건 추가 완료: reference_node_id');

        console.log('모든 마이그레이션이 성공적으로 완료되었습니다.');
    } catch (error) {
        // 이미 컬럼이 존재하는 경우 등 에러 처리
        if (error.code === 'ER_DUP_COLUMN_NAME') {
            console.warn('이미 마이그레이션이 적용되어 있습니다.');
        } else {
            console.error('마이그레이션 도중 에러 발생:', error);
        }
    } finally {
        await connection.end();
    }
}

migrate();