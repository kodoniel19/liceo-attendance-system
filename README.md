# 🎓 Liceo QR Code Attendance Management System

A real-time QR Code–Based Attendance Management System for **Liceo de Cagayan University**, built with Angular 21, Node.js/Express, and MySQL.

---

## 📋 Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Node.js | ≥ 18.x | https://nodejs.org |
| MySQL | ≥ 8.0 | https://dev.mysql.com/downloads/ |
| npm | ≥ 9.x | (bundled with Node.js) |

---

## 🗄️ Step 1 — Database Setup (MySQL)

1. Open **MySQL Workbench** or your MySQL client
2. Run the schema file:

```sql
SOURCE C:/Users/lesle/Desktop/qr-code-system-razo/database/schema.sql;
```

Or paste the contents of `database/schema.sql` directly. This will:
- Create the `liceo_attendance` database
- Create all 7 tables (users, courses, class_sections, enrollments, class_sessions, qr_sessions, attendance, audit_logs, refresh_tokens)
- Insert sample data (admin, instructor, student accounts)

### Default Credentials (all share the same password)
| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@liceo.edu.ph` | `Admin@2024` |
| Instructor | `instructor@liceo.edu.ph` | `Admin@2024` |
| Student | `student@liceo.edu.ph` | `Admin@2024` |

---

## ⚙️ Step 2 — Backend Setup

```bash
cd backend
npm install
```

### Configure `.env`

Edit `backend/.env` with your MySQL credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password   # ← Change this
DB_NAME=liceo_attendance

JWT_SECRET=liceo_super_secret_jwt_key_change_in_production_2024
JWT_REFRESH_SECRET=liceo_refresh_token_secret_change_in_production_2024
QR_SECRET=liceo_qr_hmac_secret_key_change_in_production

# Email (optional — for password reset)
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
```

### Start Backend

```bash
npm run dev      # Development (auto-restart on change)
# or
npm start        # Production
```

Backend runs at → **http://localhost:3000**  
Health check → **http://localhost:3000/health**

---

## 🖥️ Step 3 — Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs at → **http://localhost:4200**

---

## 🚀 Quick Start (Windows — Double Click)

Run `start-dev.bat` in the project root to start both servers automatically.

---

## 📁 Project Structure

```
qr-code-system-razo/
├── backend/                    # Node.js + Express API
│   ├── src/
│   │   ├── controllers/        # Business logic
│   │   │   ├── auth.controller.js
│   │   │   ├── qr.controller.js
│   │   │   ├── session.controller.js
│   │   │   ├── attendance.controller.js
│   │   │   ├── section.controller.js
│   │   │   ├── course.controller.js
│   │   │   ├── report.controller.js
│   │   │   └── user.controller.js
│   │   ├── routes/             # Express route definitions
│   │   ├── middleware/         # JWT auth, error handling
│   │   ├── config/             # MySQL connection pool
│   │   └── utils/              # Email, Logger
│   ├── .env                    # Environment variables
│   └── package.json
│
├── frontend/                   # Angular 21 app
│   └── src/app/
│       ├── core/
│       │   ├── guards/         # Route protection (auth, role)
│       │   ├── interceptors/   # JWT auto-attach + refresh
│       │   ├── models/         # TypeScript interfaces
│       │   └── services/       # API, Auth, Toast services
│       ├── layouts/
│       │   ├── instructor-layout/  # Sidebar navigation
│       │   └── student-layout/     # Mobile bottom nav
│       └── pages/
│           ├── auth/           # Login, Register, Reset Password
│           ├── instructor/     # Dashboard, Sessions, Sections, Reports
│           └── student/        # Dashboard, QR Scanner, History
│
├── database/
│   └── schema.sql              # Full MySQL schema + seed data
│
└── start-dev.bat               # Windows quick-start script
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/register` | Register |
| POST | `/api/v1/auth/refresh` | Refresh JWT |
| POST | `/api/v1/auth/forgot-password` | Password reset email |
| GET | `/api/v1/sections` | Get class sections |
| POST | `/api/v1/sections` | Create section (instructor) |
| GET | `/api/v1/sessions` | Get sessions |
| POST | `/api/v1/sessions` | Create session |
| PATCH | `/api/v1/sessions/:id` | Update session status |
| POST | `/api/v1/qr/generate/:sessionId` | Generate QR code |
| POST | `/api/v1/qr/scan` | Scan QR (student) |
| GET | `/api/v1/attendance/my` | Student attendance history |
| GET | `/api/v1/reports/attendance` | Attendance report |
| GET | `/api/v1/reports/export/excel` | Export Excel |
| GET | `/api/v1/reports/export/pdf` | Export PDF |

---

## 🔑 Role-Based Access

| Feature | Student | Instructor | Admin |
|---------|---------|------------|-------|
| QR Scan | ✅ | ❌ | ❌ |
| View own attendance | ✅ | ❌ | ✅ |
| Generate QR | ❌ | ✅ | ✅ |
| Create sessions | ❌ | ✅ | ✅ |
| Manage sections | ❌ | ✅ | ✅ |
| Export reports | ❌ | ✅ | ✅ |
| View all users | ❌ | ❌ | ✅ |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 21, Angular Material, Signals |
| Backend | Node.js 18+, Express.js |
| Database | MySQL 8.0 |
| Auth | JWT (access 15m) + Refresh Token (7d) |
| QR Code | `qrcode` (backend), `jsQR` (frontend scanner) |
| Export | `xlsx`, `pdfkit` |
| Email | Nodemailer (Gmail SMTP) |
| Security | Helmet, bcryptjs, rate-limit, express-validator |

---

## 🛡️ Security Features

- JWT access tokens (15 minute expiry) with refresh token rotation
- bcrypt password hashing (12 rounds)
- HMAC-signed QR tokens to prevent forgery
- QR one-time enforcement per student per session
- Rate limiting (100 req/15min global, 20 req/15min for auth)
- Input validation with express-validator
- SQL injection prevention via parameterized queries
- CORS restricted to frontend origin

---

## 🎨 Design

University colors applied throughout:
- **Primary:** Burgundy Red `#8B1A1A`
- **Accent:** Gold `#C9A227`
- **Background:** Light Gray `#f5f5f7`
