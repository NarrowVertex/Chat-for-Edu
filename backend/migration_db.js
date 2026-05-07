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

        await connection.query(`
            ALTER TABLE Messages 
            DROP FOREIGN KEY messages_ibfk_2; 
        `);
        console.log('기존 외래키 제약조건 삭제 완료: 제약조건(messages_ibfk_2)')

        await connection.query(`
            ALTER TABLE Messages 
            ADD CONSTRAINT messages_ibfk_2
            FOREIGN KEY (parent_id) REFERENCES Messages(id) 
            ON DELETE SET NULL;
        `);
        console.log('새 외래키 제약 조건 변경 완료: 제약 조건(messages_ibfk_2)');

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