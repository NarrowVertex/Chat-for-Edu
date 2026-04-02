-- 이 스크립트는 데이터베이스와 필요한 테이블을 초기화합니다.
CREATE DATABASE IF NOT EXISTS chat_history_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE chat_history_db;

-- Users 테이블 (사용자 정보 보관)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chats 테이블 (1:N 유저 관계, 채팅 내용 저장)
CREATE TABLE IF NOT EXISTS chats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  role ENUM('user', 'ai') NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
