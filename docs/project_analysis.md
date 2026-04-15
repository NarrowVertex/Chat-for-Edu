# Project Analysis: Chat for Edu

This document provides a comprehensive overview of the "Chat for Edu" project architecture, API specifications, and database structure.

## 1. Overall Architecture

The project is a full-stack web application designed for educational purposes, allowing users to interact with an AI (Google Gemini) in a structured, hierarchical "node-based" chat format.

```mermaid
graph TD
    User((User))
    
    subgraph Frontend [React Frontend]
        UI[UI Components / Lucide Icons]
        State[React Hooks / State Management]
        RF[React Flow - Tree Visualization]
        RM[React Markdown / KaTeX]
    end
    
    subgraph Backend [Node.js Backend]
        API[Express API]
        Auth[Bcrypt Auth]
        Gemini[Google Gemini API]
        Multer[Multer - File Uploads]
    end
    
    subgraph Storage
        DB[(MySQL Database)]
        Files[Local File System - /uploads]
    end
    
    User <--> UI
    UI <--> State
    State <--> RF
    State <--> API
    API <--> Auth
    API <--> Gemini
    API <--> DB
    API <--> Multer
    Multer <--> Files
```

### Key Technologies:
- **Frontend**: React, Vite, React Flow (for tree view), Lucide React (icons), React Markdown, Remark Math/Rehype Katex (for formulas).
- **Backend**: Node.js, Express, MySQL (using `mysql2/promise`), Multer (image uploads), Bcryptjs (password hashing).
- **AI**: Google Generative AI (Gemini 2.5 Flash).

---

## 2. API Specification

### Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user with ID and password. |
| `POST` | `/api/auth/login` | Authenticate user and return user object. |
| `DELETE` | `/api/auth/user/:id` | Delete user account and associated data. |

### Chat Projects
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/chats/:userId` | Retrieve all chat projects for a specific user. |
| `POST` | `/api/chats` | Create a new chat project (supports text + image). Generates title via Gemini. |
| `PATCH` | `/api/chats/:id` | Update chat project title. |
| `DELETE` | `/api/chats/:chatId` | Delete an entire chat project. |

### Nodes (Messages)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/chats/:chatId/nodes` | Get all nodes (messages) within a specific chat. |
| `POST` | `/api/nodes` | Create a new node (child of another node or top-level). |
| `PATCH` | `/api/nodes/:nodeId` | Update node metadata (title, understanding score, favorite). |
| `PUT` | `/api/messages/:id/regenerate` | Regenerate the AI answer for a specific node. |
| `DELETE` | `/api/nodes/:nodeId` | Delete a node. Triggers recursive deletion of children and automatic re-labeling of siblings. |

---

## 3. Database Schema

The database consists of three main tables: `Users`, `Chats`, and `Messages`.

```mermaid
erDiagram
    Users ||--o{ Chats : "owns"
    Chats ||--o{ Messages : "contains"
    Messages ||--o{ Messages : "parent of"

    Users {
        int id PK
        string user_id "UNIQUE"
        string password_hash
        timestamp created_at
    }

    Chats {
        int id PK
        int owner_id FK
        string title
        timestamp created_at
        timestamp updated_at
    }

    Messages {
        int id PK
        int chat_id FK
        int parent_id FK "Recursive"
        enum sender "user, ai, system"
        string node_label "e.g., M1-1, M1-1-S1-1"
        string node_title
        text question_text
        text answer_text
        string photo_url
        int understanding_score
        boolean is_favorite
        enum node_type "qa, content"
        timestamp created_at
    }
```

### Key Data Patterns:
1.  **Hierarchical Structure**: The `Messages` table uses `parent_id` to create a tree structure. The `node_label` field (e.g., `M1-1`, `M1-1-S1-1`) represents the logical path in this hierarchy.
2.  **Multimodal Support**: `photo_url` in the `Messages` table stores the path to images uploaded via Multer, which are then sent to Gemini for context.
3.  **Automatic Re-labeling**: When a node is deleted, the backend logic in `server.js` re-calculates the `node_label` for remaining siblings to maintain numerical sequence.
