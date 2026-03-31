# Project Collaboration Guide

This repository is split into three main components to allow clear separation of concerns and independent team collaboration.

## 📁 Repository Structure & Roles

### 1. `frontend/` - React & UI/UX Team
- **Responsibilities**: Develop the User Interface using React and ReactFlow. Send requests to the `backend/` for data persistence, retrieval, and AI processing.
- **Tech Stack**: React, Vite, ReactFlow, CSS/Tailwind.
- **How to start**:
  ```bash
  cd frontend
  npm install
  npm run dev
  ```

### 2. `backend/` - Node/Express & MySQL Team
- **Responsibilities**: Serve as the main gateway between the `frontend` and the database/AI logic. Provide a REST API to handle GET/POST requests from React(Flow), interact directly with the MySQL DB, and call the internal `ai-middleware` services for core data processing features.
- **Tech Stack**: Node.js, Express, MySQL.
- **How to start**:
  ```bash
  cd backend
  npm install
  npm start # or 'node index.js'
  ```

### 3. `ai-middleware/` - AI Integration Team
- **Responsibilities**: Develop AI/Prompt core functionalities. You will receive data/prompts from the `backend/`, send requests to the OpenAI API, process the results appropriately, and return structured data to the `backend/`.
- **Tech Stack**: Node.js, Express, OpenAI SDK (`openai`), dotenv.
- **How to start**:
  ```bash
  cd ai-middleware
  npm install
  npm start # Starts the internal AI service on port 5001
  ```

## 🤝 Workflow & Integration

1. A user interacts with the **Frontend** (ReactFlow).
2. The UI sends relevant data to the **Backend** routes (e.g. `POST /api/nodes`).
3. The **Backend** receives the payload. 
    - If it's a simple CRUD operation, it saves to **MySQL**.
    - If it requires AI enhancement or logic generation, it sends an internal HTTP request to the **AI-Middleware** service (e.g. `http://localhost:5001/generate`).
4. The **AI-Middleware** processes the prompt via the **OpenAI API**, structures the response, and sends it back to the **Backend**.
5. The **Backend** saves the AI-generated results to **MySQL** (if necessary) and returns the final response to the **Frontend** to display on the screen.

## 🛠️ Important Notes for the Team

- **Database Credentials (`.env`)**: DO NOT commit your `.env` files to git. Let your developers share `.env.example` templates instead.
- **Git Conflicts**: Since the folders are completely separated, Git merge conflicts should be minimal as long as everyone sticks to their designated directory! You only need to communicate explicitly when updating API endpoints across boundaries.
