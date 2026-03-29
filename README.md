# SmartCart — AI-Powered E-Commerce Platform

A production-grade full-stack e-commerce platform with **AI-powered semantic search**, **RAG chatbot**, **real-time notifications**, **payment gateway integration**, and **comprehensive admin dashboard**. Built with modern technologies to demonstrate scalable architecture and industry best practices.

### [Live Demo](https://smartcart-rouge.vercel.app) | [API Docs](https://smartcart-api-ecdk.onrender.com/api/docs)

> **Note**: Backend is on Render free tier — first request may take ~30s (cold start). After that, it's instant.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?logo=tailwindcss&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?logo=socket.io&logoColor=white)
![Razorpay](https://img.shields.io/badge/Razorpay-Integration-0C2451?logo=razorpay&logoColor=white)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (React + Vite)                       │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│   │ Products │  │   Cart   │  │ Checkout │  │  Admin Dashboard │  │
│   │  Search  │  │ Wishlist │  │ Payment  │  │  Analytics/CRUD  │  │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│        │              │              │                  │            │
│   ┌────┴──────────────┴──────────────┴──────────────────┴────────┐  │
│   │          Axios (JWT interceptors + auto token refresh)       │  │
│   │          Socket.io Client (real-time notifications)          │  │
│   └──────────────────────────┬───────────────────────────────────┘  │
│                              │                                      │
│   Vercel (CDN + Edge)        │  HTTPS                               │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    API SERVER (Node.js + Express 5)                   │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐  │
│  │   Helmet    │  │ Rate Limiter │  │    CORS    │  │    XSS    │  │
│  │  Security   │  │  (per-route) │  │ Whitelist  │  │ Sanitize  │  │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘  └─────┬─────┘  │
│         └────────────────┴─────────────────┴───────────────┘        │
│                                    │                                 │
│  ┌─────────────────────────────────┴──────────────────────────────┐  │
│  │                      ROUTE HANDLERS                            │  │
│  │  Auth · Products · Cart · Orders · Payments · Reviews          │  │
│  │  Wishlist · Coupons · AI · StockAlerts · Notifications · Admin │  │
│  └───────────────────────────┬────────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────┴────────────────────────────────────┐  │
│  │                     SERVICE LAYER                              │  │
│  │                                                                │  │
│  │  ┌──────────┐  ┌────────────┐  ┌───────────┐  ┌───────────┐  │  │
│  │  │ Payment  │  │    AI      │  │  PubSub   │  │  Invoice   │  │  │
│  │  │ Strategy │  │ (OpenAI +  │  │  (Redis   │  │  (PDFKit)  │  │  │
│  │  │ Pattern  │  │  pgvector) │  │  Pub/Sub) │  │           │  │  │
│  │  │          │  │            │  │           │  │           │  │  │
│  │  │ Razorpay │  │ Embeddings │  │ 11 Event  │  │ Branded   │  │  │
│  │  │ Stripe   │  │ RAG Chat   │  │ Channels  │  │ PDF with  │  │  │
│  │  │ COD      │  │ Smart      │  │ Real-time │  │ GST calc  │  │  │
│  │  │          │  │ Fallback   │  │ Socket.io │  │           │  │  │
│  │  └──────────┘  └────────────┘  └───────────┘  └───────────┘  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Render (Web Service)                                                │
└────────┬──────────────────────┬──────────────────────┬───────────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐  ┌──────────────────┐  ┌───────────────────────┐
│   PostgreSQL    │  │      Redis       │  │       BullMQ          │
│   (Supabase)    │  │    (Upstash)     │  │  (Background Jobs)    │
│                 │  │                  │  │                       │
│ • Users/Auth    │  │ • Cache (5m TTL) │  │ • Embedding generation│
│ • Products      │  │ • Pub/Sub events │  │   (concurrency: 2,    │
│ • Orders/Cart   │  │ • Session store  │  │    rate limit: 5/sec) │
│ • Reviews       │  │ • Pattern        │  │ • Token cleanup       │
│ • pgvector      │  │   invalidation   │  │   (cron: every 6hr)   │
│   (embeddings)  │  │                  │  │ • Payment cleanup     │
│ • Full-text     │  │                  │  │   (expired payments)  │
│   search (GIN)  │  │                  │  │                       │
└─────────────────┘  └──────────────────┘  └───────────────────────┘
```

---

## Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **Node.js + Express 5** | REST API with TypeScript (strict mode) |
| **PostgreSQL 16 + pgvector** | Relational DB with vector similarity search |
| **Redis 7** | Caching layer + Pub/Sub for real-time events |
| **BullMQ** | Background job queue (embedding generation, token/payment cleanup) |
| **OpenAI API** | Embeddings (text-embedding-3-small) + GPT-4o-mini RAG chatbot |
| **Socket.io** | Real-time WebSocket for notifications and live updates |
| **Razorpay + Stripe** | Payment gateway with Strategy Pattern (UPI, Cards, Wallets, COD) |
| **PDFKit** | Invoice PDF generation with branded template |
| **JWT** | Access + Refresh token authentication with role-based access |
| **Zod** | Request validation schemas |
| **Helmet.js** | Security headers, CORS hardening, XSS sanitization |
| **Swagger/OpenAPI** | Auto-generated API documentation |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 19 + TypeScript** | SPA with Vite |
| **TailwindCSS v4** | Utility-first styling with dark mode support |
| **React Router v7** | Client-side routing with protected routes |
| **Recharts** | Admin dashboard analytics charts |
| **Socket.io Client** | Real-time notifications and live activity feed |
| **Axios** | HTTP client with interceptors (auto token refresh) |
| **React.lazy + Suspense** | Code splitting for optimized loading |
| **Error Boundaries** | Graceful error handling in UI |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| **Docker Compose** | Local dev: PostgreSQL, Redis, pgAdmin |
| **Supabase** | Production PostgreSQL (pgvector enabled) |
| **Upstash** | Production serverless Redis |
| **Vercel** | Frontend hosting with CDN |
| **Render** | Backend API hosting |
| **Jest + Supertest** | Integration + unit tests |

---

## Features

### Core E-Commerce
- User registration/login with JWT (access + refresh tokens)
- Product catalog with full-text search, category filters, pagination, sorting
- Shopping cart with stock validation, GST (18%) calculation, free shipping threshold
- Order management with status workflow: `PLACED → CONFIRMED → PREPARING → DISPATCHED → DELIVERED`
- Order cancellation with automatic stock restoration
- Product reviews & ratings with star distribution, helpful marking
- Wishlist (add/remove from product page, dedicated wishlist page)
- Coupon/discount system (percentage & flat, usage limits, min order value)
- Invoice PDF download (branded, itemized, GST breakdown)
- Recently viewed products (last 10, stored in localStorage)
- Search autocomplete with debounce

### Payment Gateway (Strategy Pattern)
- **Razorpay** — UPI, Cards, Wallets, Net Banking (Indian payments)
- **Stripe** — International card payments
- **Cash on Delivery** — Always available
- HMAC signature verification for payment authenticity
- Server-side amount calculation (prevents client-side tampering)
- Pending payment cleanup via background jobs

### AI-Powered Features
- **Semantic Search** — Natural language product search via OpenAI embeddings + pgvector cosine similarity
- **Product Recommendations** — "You might also like" using vector similarity
- **Smart Cart Suggestions** — AI analyzes cart and suggests complementary products
- **RAG Shopping Assistant** — Chatbot that understands your product catalog
- **Graceful Fallbacks** — All AI features work without OpenAI API key (keyword extraction, stop-word removal, category/price intent detection)

### Real-Time (Redis Pub/Sub + Socket.io)
- Instant order status notifications for customers
- Admin live activity feed (new orders, stock updates, cancellations)
- Back-in-stock alerts (subscribe to out-of-stock products, get notified when restocked)
- Notification bell with unread count and mark-as-read
- Low stock warnings for admin
- 11 event channels (order, payment, stock, product, user, review)

### Admin Dashboard
- Revenue analytics with daily charts
- Order management with status transitions
- Product CRUD with stock management
- User management (activate/deactivate)
- Live activity feed via WebSocket
- Top products and order distribution

### Security & Production-Ready
- Helmet.js security headers + CSP policy
- CORS with whitelist + credentials
- XSS input sanitization (recursive, strips all HTML)
- Rate limiting (general, auth, AI endpoints)
- Redis caching with pattern invalidation (5-min TTL)
- Structured error handling with correlation IDs
- Morgan HTTP logging with request tracking
- Background job processing with retry + exponential backoff
- Graceful shutdown handling
- Health check endpoint with all service statuses
- Error boundaries + code splitting in frontend
- Dark mode with system preference detection

---

## Project Structure

```
smartcart/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, Redis, Swagger, env config
│   │   ├── controllers/     # Auth, Product, Cart, Order, AI, Admin, Review,
│   │   │                    # Wishlist, Coupon, Payment, StockAlert, Notification
│   │   ├── services/        # Business logic layer
│   │   │   ├── ai.service.ts         # OpenAI embeddings, RAG chat, smart fallback
│   │   │   ├── payment/              # Strategy Pattern (Razorpay, Stripe, COD)
│   │   │   ├── pubsub.service.ts     # Redis Pub/Sub event system
│   │   │   ├── cache.service.ts      # Redis caching with pattern invalidation
│   │   │   ├── invoice.service.ts    # PDFKit branded invoice generation
│   │   │   ├── websocket.service.ts  # Socket.io real-time delivery
│   │   │   └── stockAlert.service.ts # Back-in-stock notification system
│   │   ├── models/          # Data access layer (PostgreSQL queries)
│   │   ├── routes/          # Express route definitions
│   │   ├── middlewares/     # Auth, validation, rate limiting, sanitize, httpLogger
│   │   ├── validations/    # Zod schemas
│   │   ├── queues/         # BullMQ workers (embeddings, cleanup)
│   │   ├── utils/          # JWT, logger, error classes
│   │   ├── app.ts          # Express app (separated for testing)
│   │   └── server.ts       # HTTP + WebSocket entry point
│   ├── scripts/
│   │   ├── migrations/     # SQL migrations (9 files)
│   │   └── seed-products.sql  # 49 products across 8 categories
│   └── tests/
│       ├── integration/    # Supertest API tests
│       └── unit/           # Service/validation unit tests
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios client with JWT interceptors
│   │   ├── contexts/       # Auth, Cart, Theme (dark mode)
│   │   ├── hooks/          # useDebounce, useRecentlyViewed
│   │   ├── components/     # Navbar, Footer, ChatBot, ReviewSection,
│   │   │                   # StockAlertButton, NotificationBell, ErrorBoundary,
│   │   │                   # RecentlyViewed, WishlistButton
│   │   └── pages/          # Home, Products, Cart, Checkout, Orders, Wishlist,
│   │                       # Admin (Dashboard, Products, Orders, Users)
│   └── vite.config.ts      # Vite + Tailwind + API proxy
└── docker-compose.yml       # PostgreSQL + Redis + pgAdmin
```

---

## Getting Started

### Prerequisites
- **Node.js 18+**
- **Docker Desktop** (for PostgreSQL + Redis)
- **OpenAI API Key** (optional — AI features fallback gracefully)

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/har5hit05/smartcart.git
cd smartcart

# 2. Start databases
docker compose up -d

# 3. Backend setup
cd backend
cp .env.example .env    # Configure your environment variables
npm install
npm run migrate         # Run database migrations
npm run dev             # Starts on http://localhost:3000

# 4. Seed products (run in pgAdmin or psql)
# Execute: backend/scripts/seed-products.sql

# 5. Frontend setup (new terminal)
cd frontend
npm install
npm run dev             # Starts on http://localhost:5173

# 6. Open http://localhost:5173
```

### Default Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@smartcart.com | Admin@123 |

### Enable AI Features (Optional)
Add your OpenAI API key to `backend/.env`:
```
OPENAI_API_KEY=sk-your-actual-key
```
Without the key, the app uses intelligent keyword-based fallback search (PostgreSQL full-text search + stop-word removal + category/price intent detection).

### Enable Payment Gateway (Optional)
Add Razorpay test keys to `backend/.env`:
```
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
```
Without keys, only Cash on Delivery is available.

---

## API Documentation

Visit **[Live API Docs](https://smartcart-api-ecdk.onrender.com/api/docs)** or `http://localhost:3000/api/docs` for interactive Swagger UI.

### Key Endpoints

| Category | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| **Auth** | POST | `/api/auth/register` | Register user |
| **Auth** | POST | `/api/auth/login` | Login (returns access + refresh token) |
| **Auth** | POST | `/api/auth/refresh` | Refresh access token |
| **Products** | GET | `/api/products` | List with filters, pagination, sorting |
| **Products** | GET | `/api/products/search?q=` | Full-text search |
| **Cart** | GET | `/api/cart` | Get cart with GST + shipping summary |
| **Cart** | POST | `/api/cart` | Add to cart |
| **Orders** | POST | `/api/orders` | Create order from cart |
| **Orders** | GET | `/api/orders/:id/invoice` | Download invoice PDF |
| **Payments** | POST | `/api/payments/initiate` | Start payment (Razorpay/Stripe/COD) |
| **Payments** | POST | `/api/payments/verify` | Verify payment signature |
| **Reviews** | POST | `/api/reviews` | Create product review |
| **Wishlist** | POST | `/api/wishlist` | Add to wishlist |
| **Coupons** | POST | `/api/coupons/validate` | Validate coupon code |
| **AI** | GET | `/api/ai/search?q=` | Semantic vector search |
| **AI** | GET | `/api/ai/recommendations/:id` | Product recommendations |
| **AI** | POST | `/api/ai/chat` | RAG shopping assistant |
| **Stock Alerts** | POST | `/api/stock-alerts/:id/subscribe` | Subscribe to back-in-stock |
| **Notifications** | GET | `/api/notifications` | Get user notifications |
| **Admin** | GET | `/api/admin/analytics/dashboard` | Dashboard analytics |
| **Admin** | PUT | `/api/admin/orders/:id/status` | Update order status |
| **Health** | GET | `/health` | Service health (DB, Redis, PubSub, WebSocket) |

---

## Testing

```bash
cd backend
npm test                    # Run all tests
npm run test:integration    # Integration tests only
npm run test:unit           # Unit tests only
npm run test:coverage       # With coverage report
```

---

## Deployment

This project is deployed using free-tier cloud services:

| Service | Platform | Purpose |
|---------|----------|---------|
| Frontend | **Vercel** | React SPA hosting with global CDN |
| Backend | **Render** | Node.js API server with auto-deploy |
| Database | **Supabase** | Managed PostgreSQL 16 with pgvector |
| Cache | **Upstash** | Serverless Redis with TLS |

### Environment Variables (Backend)
```
DATABASE_URL=postgresql://...         # Supabase connection string
REDIS_URL=rediss://...                # Upstash Redis URL (TLS)
FRONTEND_URL=https://...              # Vercel frontend URL
JWT_SECRET=...                        # Strong random secret
JWT_REFRESH_SECRET=...                # Strong random secret
OPENAI_API_KEY=sk-...                 # Optional
RAZORPAY_KEY_ID=rzp_test_...          # Optional
RAZORPAY_KEY_SECRET=...               # Optional
```

---

## Design Decisions

| Decision | Why |
|----------|-----|
| **Strategy Pattern for Payments** | Clean abstraction to add new payment providers without modifying existing code (Open/Closed Principle) |
| **Redis Pub/Sub over direct Socket.io** | Decouples event producers from consumers; scales horizontally if needed |
| **pgvector over external vector DB** | Keeps everything in one database; no extra service to manage |
| **BullMQ over in-process** | Background jobs survive server restarts; built-in retry with exponential backoff |
| **Graceful AI fallbacks** | App works fully without OpenAI key — keyword search, stop-word removal, intent detection |
| **JWT Access + Refresh tokens** | Short-lived access tokens (15min) for security; refresh tokens for UX |
| **Server-side payment calculation** | Prevents price tampering — client sends cart, server calculates total |

---

## License

MIT
