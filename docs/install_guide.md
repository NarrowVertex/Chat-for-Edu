# Git 다운로드
- 직접 다운로드
    - https://git-scm.com/install/windows
    - ```Git for Windows/x64 Setup``` 다운로드
- 또는 윈도우 cmd 창 열어서 ```winget install --id Git.Git -e --source winget``` 명령어로 다운로드

# 프로젝트 다운로드
- 프로젝트 설치할 폴더에서 command 창 열기
- 다음 명령어 입력
```bash
git clone https://github.com/NarrowVertex/Chat-for-Edu.git
```

# 필요한 프로그램 다운로드
## Node.js
- https://nodejs.org/ko/download
- x64 아키텍쳐, Windows 환경 선택한 후에 ```Windows 설치 프로그램 (.msi)``` 다운로드
- 설치 진행

## MySQL
- https://dev.mysql.com/downloads/installer/
- ```Windows (x86, 32-bit), MSI Installer``` 둘중 하나 다운로드
- 설치 프로그램을 실행하고, MySQL Server만 선택해서 설치
- 설치 중 비밀번호 입력란에 비밀번호를 입력하고 비밀번호 기억해두기

## Gemini API
- https://aistudio.google.com/app/apikey
- API 키 발급

# 프로그램 초기 설정
## Backend
1. cmd 창에서 backend 폴더로 이동
2. cmd 창에 ```npm install``` 입력
3. backend 폴더 안에 .env 생성 (.env_template 참고)
    - .env 파일에 다음 내용 입력
    ```
    DB_HOST=127.0.0.1
    DB_PORT=3306
    DB_USER=root
    DB_PASSWORD=your_password
    DB_NAME=gemini_db
    PORT=5000
    GEMINI_API_KEY=your_key
    ```
    - your_password: MySQL을 설치할 때 설정한 비밀번호
    - your_key: https://aistudio.google.com/app/apikey 에서 발급받은 gemini api 키
4. command 창에 ```node init_db.js``` 입력

## Frontend
1. command 창에서 frontend 폴더로 이동
2. command 창에 ```npm install``` 입력

# 프로그램 실행
## Backend
1. command 창에서 backend 폴더로 이동
2. command 창에 ```node server.js``` 입력

## Frontend
1. command 창에서 frontend 폴더로 이동
2. command 창에 ```npm run dev``` 입력
3. 표시된 주소 http://localhost:5173/ 접속

> Backend와 Frontend의 ```node server.js```와 ```npm run dev```는 각각 다른 cmd 창에서 동시에 실행되고 있어야 함.

