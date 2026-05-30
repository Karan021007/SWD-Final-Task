# Munchies Marketplace

A campus food marketplace where hostel students can browse stores run by their neighbours, place pickup orders, and pay in person. Store owners manage their menu, orders, and discount campaigns from a dedicated dashboard. Admins oversee the platform via a management panel.

---

## Project Overview

| Role | Capabilities |
|---|---|
| **User** | Browse stores, add items to cart, place and track pickup orders, request cancellations, apply coupon codes |
| **Store Owner** | Manage menu items, confirm/update order status, create discount campaigns, view store analytics |
| **Admin** | Approve/reject store owner applications, manage users (warn, block, unblock), view platform analytics |

Key features:
- JWT-based authentication with role-based access control
- Redis caching for stores and campaigns
- Cloudinary image uploads for store and item images
- Automated booking expiry via cron jobs (uncollected orders expire and issue warnings)
- Email notifications for bookings, cancellations, campaigns, and warnings
- Coupon/discount campaign system with usage limits

---

## Tech Stack

### Frontend
| | |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| State management | Zustand (with `persist` middleware) |
| Forms | React Hook Form + Zod |
| HTTP client | Axios |
| Icons | Lucide React |

### Backend
| | |
|---|---|
| Runtime | Node.js (ES Modules) |
| Framework | Express.js |
| ORM | Prisma |
| Database | PostgreSQL |
| Cache | Redis |
| Auth | JSON Web Tokens (`jsonwebtoken`) |
| File uploads | Multer + Cloudinary |
| Email | Nodemailer |
| Scheduled jobs | node-cron |
| Validation | express-validator |

---

## Prerequisites

Make sure the following are installed and running on your machine before setup:

- **Node.js** v18+
- **PostgreSQL** — a database named `munchies_db` (or update `DATABASE_URL` accordingly)
- **Redis** — running on the default port `6379`

---

## Environment Variables

### Backend — `backend/.env`

Create this file by copying the table below:

```env
# Server
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL="postgresql://<user>@localhost:5432/munchies_db"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET=your-secret-key-change-in-production

# Email (leave EMAIL_HOST unset to use Ethereal test SMTP automatically)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM="Munchies <your-email@gmail.com>"

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# File uploads
MAX_FILE_SIZE=5242880
```

> **Email tip:** If `EMAIL_HOST` is not set, the backend automatically uses [Ethereal](https://ethereal.email) — a fake SMTP service for development. Sent email previews are logged to the terminal.

### Frontend — `frontend/.env.local` *(optional)*

The frontend defaults to `http://localhost:5000` for the API. Override it only if your backend runs on a different port or host:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repo-url>
cd munchies-marketplace-javascript
```

### 2. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```


### 3. Set up the database

```bash
cd backend

# Run all migrations
npx prisma migrate dev

# Generate the Prisma client
npx prisma generate
```

---

## Running Locally

Open two terminal windows — one for each server.

### Backend (port 5000)

```bash
cd backend
npm run dev
```

Expected output:
```
Redis connected
Server running on port 5000
Cron jobs started
```

### Frontend (port 3000)

```bash
cd frontend
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.a

