# MediStock

**Medical Inventory Management System**

A full-stack web application for managing medical warehouse inventory with role-based access control, real-time stock tracking, purchase order workflows, and automated alerts — built for healthcare facilities that need a reliable, multi-user inventory solution.

![Preview](/public/images/preview.png)
**Live Demo:** [medistock-mh.vercel.app](https://medistock-mh.vercel.app)

---

## Overview

MediStock is designed around three distinct roles — **Admin**, **Employee**, and **Supplier** — each with a tailored dashboard and a specific set of permissions. Admins oversee the entire system, employees manage day-to-day stock operations, and suppliers track and update shipment status for their orders.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Auth | Clerk (invitation-only) |
| Database | PostgreSQL via Neon |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| UI | shadcn/ui + Tailwind CSS v4 |
| Charts | Recharts |
| Icons | Lucide React |
| Hosting | Vercel |

---

## Role-Based Permissions

| Feature | Admin | Employee | Supplier |
|---|:---:|:---:|:---:|
| Dashboard (personalized) | ✅ | ✅ | ✅ |
| Product Management (CRUD) | ✅ | ✅ | ❌ |
| Stock Movements (IN/OUT) | ✅ | ✅ | ❌ |
| Create Purchase Orders | ✅ | ✅ | ❌ |
| Approve / Reject Orders | ✅ | ❌ | ❌ |
| Mark Order as Shipped | ❌ | ❌ | ✅ |
| Confirm Order Delivery | ✅ | ✅ | ❌ |
| Category Management | ✅ | ❌ | ❌ |
| Supplier Management | ✅ | ❌ | ❌ |
| Reports & Analytics | ✅ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ |
| Send Invitations | ✅ | ❌ | ❌ |
| Alerts | ✅ (all) | ✅ (own) | ❌ |

---

## Features

**Inventory Management** — Full CRUD for products with category and supplier linking, unit tracking, minimum quantity thresholds, expiry date monitoring, and SKU-based identification.

**Stock Movements** — Every inbound and outbound movement is logged with a timestamp, responsible user, and optional note. Product quantities update automatically on each movement.

**Purchase Orders** — Employees and admins create orders against suppliers. Orders flow through a defined status lifecycle: `PENDING → APPROVED → SHIPPED → DELIVERED` (or `REJECTED`). Each role can only perform the actions assigned to it.

**Automated Alerts** — The system generates alerts for low stock, near-expiry products, order status changes, and general announcements. Admins see all alerts; employees see only their own.

**Reports & Analytics** — Admin-only dashboard with KPI cards, stock movement charts, order summaries, and inventory value breakdowns powered by Recharts.

**User Management** — Admins invite users via Clerk. Role assignment, user listing, and account removal are all handled within the app. A Clerk webhook keeps the database in sync with Clerk's user records.

---

## Project Structure

```
medistock/
├── prisma/
│   └── schema.prisma           
│
├── public/
│   └── images/
│       └── logo.svg
│
└── src/        
    ├── proxy.ts                  # Clerk auth + role-based route protection
    │
    ├── lib/
    │   ├── utils.ts                # cn() helper
    │   ├── prisma.ts               # Prisma client singleton
    │   └── auth.ts                 # getCurrentUser() — Clerk + Prisma
    │
    ├── hooks/
    │   └── use-mobile.ts
    │
    ├── components/
    │   ├── ui/                   # shadcn/ui components
    │   ├── auth/
    |   ├── dashboard/
    |   ├── providers/ 
    │   ├── layout/
    │   │   ├── AppNavbar.tsx
    │   │   └── AppSidebar.tsx    # Role-aware navigation
    │   └── theme/
    │
    └── app/
        ├── layout.tsx            # Root layout (ClerkProvider + ThemeProvider)
        ├── page.tsx              # Landing / redirect to dashboard
        │
        ├── (auth)/               # Clerk SignIn — invitation-only
        │
        ├── (root)/               # Protected routes 
        │   ├── layout.tsx        # AppSidebar + AppNavbar wrapper
        │   │
        │   ├── dashboard/        # Role-specific dashboard
        │   ├── products/           # List, detail, create, edit
        │   ├── stock/
        │   │   ├── movements/      # Movement history
        │   │   └── adjust/         # Record new IN/OUT movement
        │   ├── orders/             # Order list, detail, new order
        │   ├── alerts/             # Alert center
        │   ├── categories/         # Admin only
        │   ├── suppliers/          # Admin only
        │   ├── reports/            # Admin only
        │   └──  users/             # Admin only
        │
        ├── actions/
        │   └── demo-login.ts     # Server Actions لأزرار Demo
        │
        └── api/
            ├── webhooks/clerk/    
            ├── products/
            ├── stock/movements/
            ├── orders/
            ├── alerts/
            ├── categories/
            ├── suppliers/
            ├── users/
            └── reports/
```

---

## Database Schema

The Prisma schema defines seven models:

- **User** — linked to Clerk user IDs, with a `Role` enum (`admin`, `employee`, `supplier`)
- **Category** — product categories
- **Supplier** — supplier profiles, optionally linked to a `User` with the supplier role
- **Product** — inventory items with quantity, minimum threshold, price, and expiry tracking
- **StockMovement** — immutable log of every stock IN/OUT event
- **Order** — purchase orders with a full status lifecycle
- **OrderItem** — line items within an order
- **Alert** — system notifications with four types: `LOW_STOCK`, `EXPIRY`, `ORDER`, `GENERAL`

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) PostgreSQL database
- A [Clerk](https://clerk.com) application configured for invitation-only sign-up

### Installation

```bash
git clone https://github.com/m-92-h/medistock.git
cd medistock
npm install
```

### Environment Variables

Duplicate `.env.example` and rename it to `.env`, then update the variables with your own credentials:

```bash
cp .env.example .env
```

### Database Setup

```bash
npx prisma generate
npx prisma db push
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Demo Accounts

| Role | Email |
|---|---|
| Admin | demo.admin@medistock.com |
| Employee | demo.employee@medistock.com |
| Supplier | demo.supplier@medistock.com |

Use the demo buttons on the sign-in page — no invitation required for demo accounts.

---

## Author

**Mohamed Hussein**
[github.com/m-92-h](https://github.com/m-92-h) · [LinkedIn](https://linkedin.com/in/mohamedh92t)

---

## License

This project is private and not open for redistribution.