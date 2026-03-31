-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS react_flow_db;
USE react_flow_db;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (name, email, role) VALUES 
('John Doe', 'john@example.com', 'admin'),
('Jane Smith', 'jane@example.com', 'user')
ON DUPLICATE KEY UPDATE name=name;
