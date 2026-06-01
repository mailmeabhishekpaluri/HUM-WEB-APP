# HUManity IOP

## Quick Start
1. Copy `.env.example` to `backend/.env` and fill values
2. `docker compose up -d` — starts PostgreSQL + MailHog
3. `cd backend && npm install && npx prisma migrate dev && npx prisma db seed`
4. `cd frontend && npm install && npm run dev`
5. Backend: http://localhost:4000 | Frontend: http://localhost:3000 | MailHog: http://localhost:8025
