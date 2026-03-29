# SmartCart — AI-Powered E-Commerce Platform

A production-grade full-stack e-commerce platform with **AI-powered semantic search**, **RAG chatbot**, **real-time notifications**, **payment gateway integration**, and **comprehensive admin dashboard**. Built with modern technologies to demonstrate scalable architecture and industry best practices.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?logo=tailwindcss&logoColor=white)

---

## Tech Stack

### Backend
- **Node.js + Express 5** — REST API with TypeScript (strict mode)
- **PostgreSQL 15 + pgvector** — Relational DB with vector similarity search
- **Redis 7** — Caching layer + Pub/Sub for real-time events
- **BullMQ** — Background job queue (embedding generation, token/payment cleanup)
- **OpenAI API** — Embeddings (text-embedding-3-small) + GPT-4o-mini RAG chatbot
- **Socket.io** — Real-time WebSocket for notifications and live updates
- **Razorpay + Stripe** — Payment gateway with Strategy Pattern (UPI, Cards, Wallets, COD)
- **PDFKit** — Invoice PDF generation with branded template
- **JWT** — Access + Refresh token authentication with role-based access
- **Zod** — Request validation schemas
- **Helmet.js** — Security headers, CORS hardening, XSS sanitization
- **Swagger/OpenAPI** — Auto-generated API documentation

### Frontend
- **React 19 + TypeScript** — SPA with Vite
- **TailwindCSS v4** — Utility-first styling with dark mode support
- **React Router v7** — Client-side routing with protected routes
- **Recharts** — Admin dashboard analytics charts
- **Socket.io Client** — Real-time notifications and live activity feed
- **Axios** — HTTP client with interceptors (auto token refresh)
- **React.lazy + Suspense** — Code splitting for optimized loading
- **Error Boundaries** — Graceful error handling in UI

### Infrastructure
- **Docker Compose** — PostgreSQL, Redis, pgAdmin
- **Jest + Supertest** — Integration tests
- **Morgan + Correlation IDs** — Structured HTTP logging

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
- **Graceful Fallbacks** — All AI features work without OpenAI API key (falls back to PostgreSQL full-text search + intelligent keyword matching)

### Real-Time (Redis Pub/Sub + Socket.io)
- Instant order status notifications for customers
- Admin live activity feed (new orders, stock updates, cancellations)
- Back-in-stock alerts (subscribe to out-of-stock products, get notified when restocked)
- Notification bell with unread count and mark-as-read
- Low stock warnings for admin

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

## Architecture

```
smartcart/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, Redis, Swagger, env config
│   │   ├── controllers/     # Auth, Product, Cart, Order, AI, Admin, Review,
│   │   │                    # Wishlist, Coupon, Payment, StockAlert, Notification
│   │   ├── services/        # Business logic (AI, Cache, Invoice, Payment, PubSub,
│   │   │                    # StockAlert, WebSocket, Review, Order)
│   │   ├── models/          # Data access (PostgreSQL queries)
│   │   ├── routes/          # Express route definitions
│   │   ├── middlewares/     # Auth, validation, rate limiting, sanitize, httpLogger
│   │   ├── validations/    # Zod schemas
│   │   ├── queues/         # BullMQ workers (embeddings, cleanup)
│   │   ├── utils/          # JWT, logger, error classes
│   │   ├── app.ts          # Express app (separated for testing)
│   │   └── server.ts       # HTTP + WebSocket entry point
│   ├── scripts/
│   │   ├── migrations/     # SQL migrations (8 files)
│   │   └── seed-products.sql  # 60 products across 8 categories
│   └── tests/
│       └── integration/    # Supertest API tests
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios client with interceptors
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
git clone https://github.com/yourusername/smartcart.git
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
| Admin | admin@smartcart.com | admin123 |
| Customer | harshit@smartcart.com | harshit123 |

### Enable AI Features (Optional)
Add your OpenAI API key to `backend/.env`:
```
OPENAI_API_KEY=sk-your-actual-key
```

### Enable Payment Gateway (Optional)
Add Razorpay test keys to `backend/.env`:
```
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
```

---

## API Documentation

Visit **http://localhost:3000/api/docs** for interactive Swagger UI.

### Key Endpoints

| Category | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| **Auth** | POST | `/api/auth/register` | Register user |
| **Auth** | POST | `/api/auth/login` | Login (returns access + refresh token) |
| **Products** | GET | `/api/products` | List with filters, pagination, sorting |
| **Products** | GET | `/api/products/search?q=` | Full-text search |
| **Cart** | GET | `/api/cart` | Get cart with GST + shipping summary |
| **Cart** | POST | `/api/cart` | Add to cart |
| **Orders** | POST | `/api/orders` | Create order from cart |
| **Orders** | GET | `/api/orders/:id` | Order details + status history |
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

---

## Testing

```bash
cd backend
npm test                    # Run all tests
npm run test:integration    # Integration tests only
npm run test:coverage       # With coverage report
```

---

## Deployment

### Cloud Services (Free Tier)
| Service | Platform | Purpose |
|---------|----------|---------|
| Frontend | Vercel | React SPA hosting with CDN |
| Backend | Render | Node.js API server |
| Database | Neon | Managed PostgreSQL with pgvector |
| Cache | Upstash | Serverless Redis |

Set these environment variables on your deployment platform:
```
DATABASE_URL=postgresql://...    # From Neon
REDIS_URL=rediss://...           # From Upstash
FRONTEND_URL=https://...         # Your Vercel URL
JWT_SECRET=...                   # Generate a strong secret
JWT_REFRESH_SECRET=...           # Generate a strong secret
```

---

## License

MIT
