CREATE DATABASE IF NOT EXISTS gemini_db;
USE gemini_db;

CREATE TABLE IF NOT EXISTS Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Chats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES Users(id) ON DELETE CASCADE
);

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES Chats(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES Messages(id) ON DELETE CASCADE
);
