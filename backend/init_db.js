const mysql = require('mysql2/promise');
require('dotenv').config();

async function init() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    console.log("Connected to MySQL server.");

    // 데이터베이스 생성
    await connection.query('CREATE DATABASE IF NOT EXISTS gemini_db');
    console.log("Database 'gemini_db' created or already exists.");
    
    // 데이터베이스 선택
    await connection.query('USE gemini_db');

    // 테이블 초기화 (테스트를 위해 기존 테이블 삭제 후 재생성)
    await connection.query('DROP TABLE IF EXISTS Messages');
    await connection.query('DROP TABLE IF EXISTS Chats');
    await connection.query('DROP TABLE IF EXISTS Users');

    console.log("Existing tables dropped.");

    const createUsers = `
    CREATE TABLE Users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;

    const createChats = `
    CREATE TABLE Chats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES Users(id) ON DELETE CASCADE
    );`;

    const createMessages = `
    CREATE TABLE Messages (
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_id) REFERENCES Chats(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES Messages(id) ON DELETE CASCADE
    );`;

    await connection.query(createUsers);
    await connection.query(createChats);
    await connection.query(createMessages);

    console.log("All tables recreated with Q&A bundle structure successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Database initialization failed:", err);
    process.exit(1);
  }
}

init();
