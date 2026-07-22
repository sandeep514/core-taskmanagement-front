# TaskFlow Frontend

React + TypeScript + Vite client for the TaskFlow Laravel API.

## Setup

```bash
cd frontend
npm install
cp .env.example .env   # or edit .env
npm run dev
```

### Environment

```env
VITE_API_URL=http://127.0.0.1:8001/api
```

Start the Laravel API first:

```bash
cd backend
php artisan serve --port=8001
```

## Auth

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@taskflow.com | password |
| Employee | alex@taskflow.com | password |

Tokens from Sanctum are stored as Bearer tokens (`Authorization` header).

## Features

- Admin: dashboard, designations, departments, clients, employees, projects, Kanban
- Employee: my projects, Kanban, tasks, comments, attachments
- Role-aware task routes (`/admin/...` vs `/employee/...`)
