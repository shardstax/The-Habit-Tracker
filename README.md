# Personalized Goal-Driven Todo + Journal

### BTW this Complete App is Vibe Coded by codex with me providing little to no help in code bugs. Just wanted to test the limit and I think I could say these models are exceptionally good

## Prerequisites

- Node.js 20+ (tested on Node 24)
- MySQL 8.0+

## 1) Create database

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS ultimate_todo;"
```

## 2) Configure environment files

```bash
cd server
copy .env.example .env
```

Fill `server/.env` with your MySQL credentials and JWT secrets.

```bash
cd client
copy .env.example .env
```

## 3) Install dependencies

```bash
cd server
npm install
```

```bash
cd client
npm install
```

## 4) Run migrations and seed

```bash
cd server
npm run db:migrate
npm run db:seed
```

Note: the seed script truncates app tables before inserting demo data so it is safe to rerun.

## 5) Start backend and frontend

```bash
cd server
npm start
```

```bash
cd client
npm run dev -- --host 127.0.0.1 --port 5173
```

## 6) Run tests

```bash
cd server
npm test
```

If your environment blocks worker process spawning, run:

```bash
cd server
npm test -- --runInBand
```

## Demo login

- Email: `demo@example.com`
- Password: `demo1234` (or your `DEMO_PASSWORD` from `server/.env`)
