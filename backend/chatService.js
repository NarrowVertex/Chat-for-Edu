const pool = require('./db');
const fs = require('fs').promises;
const path = require('path');

class ChatService {
  /**
   * DB와 테이블을 초기화합니다. 만약 DB를 생성해야하는 권한 이슈가 있다면
   * pool 쪽에서 DB 접속 없이 연결부터 하고 생성해야 하므로 별도로 처리합니다.
   * 여기서는 테이블 생성을 시도합니다.
   */
  async initializeDatabase() {
    try {
      // 1. 데이터베이스 생성 용 임시 커넥션
      const initPool = require('mysql2/promise').createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT
      });
      await initPool.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await initPool.end();

      // 2. 테이블 생성 (pool은 이미 DB를 바라보고 있음)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          email VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS chats (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          role ENUM('user', 'ai') NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      return true;
    } catch (err) {
      console.error('테이블 초기화 실패:', err.message);
      return false;
    }
  }

  // --- USER CRUD ---
  
  async createUser(username, email) {
    const [result] = await pool.query(
      'INSERT INTO users (username, email) VALUES (?, ?) ON DUPLICATE KEY UPDATE email = ?',
      [username, email, email]
    );
    // If it was newly inserted, insertId is > 0
    // If already exists, we select it
    const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    return rows[0].id;
  }

  // --- CHAT CRUD ---

  // CREATE
  async addChat(userId, role, message) {
    const [result] = await pool.query(
      'INSERT INTO chats (user_id, role, message) VALUES (?, ?, ?)',
      [userId, role, message]
    );
    return result.insertId;
  }

  // READ (All chats for a user)
  async getChatsByUserId(userId) {
    const [rows] = await pool.query(
      'SELECT id, role, message, created_at, updated_at FROM chats WHERE user_id = ? ORDER BY created_at ASC',
      [userId]
    );
    return rows;
  }

  // UPDATE (Modify a specific message)
  async updateChat(chatId, newMessage) {
    const [result] = await pool.query(
      'UPDATE chats SET message = ? WHERE id = ?',
      [newMessage, chatId]
    );
    return result.affectedRows > 0;
  }

  // DELETE (Remove a specific message)
  async deleteChat(chatId) {
    const [result] = await pool.query(
      'DELETE FROM chats WHERE id = ?',
      [chatId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = new ChatService();
