# MediStock — Project Blueprint

نظام إدارة المخزون الطبي | Next.js 16 · Clerk · PostgreSQL/Neon · Prisma · shadcn/ui

---

## الأدوار والصلاحيات

| الصلاحية | Admin | Employee | Supplier |
|---|:---:|:---:|:---:|
| Dashboard (محتوى مخصص) | ✅ | ✅ | ✅ |
| إدارة المنتجات (CRUD) | ✅ | ✅ | ❌ |
| حركات المخزون (IN/OUT) | ✅ | ✅ | ❌ |
| إنشاء طلبات شراء | ✅ | ✅ | ❌ |
| الموافقة/رفض طلبات الشراء | ✅ | ❌ | ❌ |
| تحديث حالة الشحن | ❌ | ❌ | ✅ |
| تأكيد استلام البضاعة | ✅ | ✅ | ❌ |
| إدارة الفئات | ✅ | ❌ | ❌ |
| إدارة الموردين | ✅ | ❌ | ❌ |
| التقارير والإحصائيات | ✅ | ❌ | ❌ |
| إدارة المستخدمين | ✅ | ❌ | ❌ |
| إرسال دعوات | ✅ | ❌ | ❌ |
| التنبيهات | ✅ (كل) | ✅ (خاصة) | ❌ |

---

## هيكل المجلدات الكامل

```
medistock/
├── .env                          # DATABASE_URL + CLERK_* keys
├── .gitignore
├── components.json               # shadcn/ui config
├── next.config.ts
├── postcss.config.mjs
├── prisma.config.ts              # Prisma driver adapter config
├── tsconfig.json
│
├── prisma/
│   └── schema.prisma             # ✅ السكيما النهائية
│
├── public/
│   └── images/
│       └── logo.svg
│
└── src/
    ├── middleware.ts             # ⚠️ يجب أن يكون هذا الاسم (وليس proxy.ts)
    │                             # Clerk auth + role-based route protection
    │
    ├── lib/
    │   ├── utils.ts              # cn() + helpers
    │   ├── prisma.ts             # PrismaClient singleton مع pg adapter
    │   └── auth.ts               # getCurrentUser() من Clerk + Prisma
    │
    ├── hooks/
    │   └── use-mobile.ts
    │
    ├── components/
    │   ├── ui/                   # shadcn/ui components
    │   │   ├── alert.tsx
    │   │   ├── badge.tsx
    │   │   ├── breadcrumb.tsx
    │   │   ├── button.tsx
    │   │   ├── input.tsx
    │   │   ├── popover.tsx
    │   │   ├── separator.tsx
    │   │   ├── sheet.tsx
    │   │   ├── sidebar.tsx
    │   │   ├── skeleton.tsx
    │   │   └── tooltip.tsx
    │   │
    │   ├── auth/
    │   │   ├── DemoBanner.tsx
    │   │   └── DemoButtons.tsx
    │   │
    │   ├── layout/
    │   │   ├── AppNavbar.tsx
    │   │   └── AppSidebar.tsx    # يخفي/يظهر links بناءً على الدور
    │   │
    │   └── theme/
    │       └── theme-provider.tsx
    │
    └── app/
        ├── favicon.ico
        ├── globals.css
        ├── layout.tsx            # Root layout (ClerkProvider + ThemeProvider)
        ├── page.tsx              # Landing / redirect to dashboard
        │
        ├── generated/
        │   └── prisma/           # auto-generated بواسطة prisma generate
        │
        ├── (auth)/
        │   └── sign-in/
        │       └── [[...sign-in]]/
        │           └── page.tsx  # Clerk SignIn — invitation-only
        │
        ├── (root)/               # Protected routes — يتطلب تسجيل دخول
        │   ├── layout.tsx        # AppSidebar + AppNavbar wrapper
        │   │
        │   ├── dashboard/
        │   │   └── page.tsx      # Admin: KPIs + charts
        │   │                     # Employee: تنبيهاته + حركات اليوم
        │   │                     # Supplier: طلباته الأخيرة
        │   │
        │   ├── products/         # Admin + Employee فقط
        │   │   ├── page.tsx      # قائمة المنتجات مع بحث وفلتر
        │   │   ├── new/
        │   │   │   └── page.tsx  # إضافة منتج جديد
        │   │   └── [id]/
        │   │       ├── page.tsx  # تفاصيل المنتج + سجل الحركات
        │   │       └── edit/
        │   │           └── page.tsx  # تعديل المنتج
        │   │
        │   ├── stock/            # Admin + Employee فقط
        │   │   ├── movements/
        │   │   │   └── page.tsx  # سجل كل حركات الوارد والصادر
        │   │   └── adjust/
        │   │       └── page.tsx  # تسجيل حركة وارد/صادر جديدة
        │   │
        │   ├── orders/           # Admin + Employee + Supplier (مع فلترة)
        │   │   ├── page.tsx      # Admin/Employee: كل الطلبات
        │   │   │                 # Supplier: طلباته فقط
        │   │   ├── new/
        │   │   │   └── page.tsx  # Admin + Employee فقط
        │   │   └── [id]/
        │   │       └── page.tsx  # تفاصيل الطلب
        │   │                     # Admin: approve/reject
        │   │                     # Supplier: mark as shipped
        │   │                     # Employee: confirm delivery
        │   │
        │   ├── alerts/           # Admin + Employee فقط
        │   │   └── page.tsx      # Admin: كل التنبيهات
        │   │                     # Employee: تنبيهاته الخاصة
        │   │
        │   ├── categories/       # Admin فقط
        │   │   └── page.tsx      # CRUD الفئات
        │   │
        │   ├── suppliers/        # Admin فقط
        │   │   └── page.tsx      # قائمة الموردين + إدارتهم
        │   │
        │   ├── reports/          # Admin فقط
        │   │   └── page.tsx      # تقارير المخزون + الطلبات + الحركات
        │   │
        │   ├── users/            # Admin فقط
        │   │   └── page.tsx      # قائمة المستخدمين + تغيير الأدوار
        │   │
        │   └── invite/           # Admin فقط
        │       └── page.tsx      # إرسال دعوات Clerk للموظفين والموردين
        │
        ├── actions/
        │   └── demo-login.ts     # Server Actions لأزرار Demo
        │
        └── api/
            │
            ├── webhooks/
            │   └── clerk/
            │       └── route.ts  # user.created → upsert User في Prisma
            │                     # user.deleted → cleanup
            │
            ├── products/
            │   ├── route.ts          # GET (list+search+filter) | POST (new)
            │   └── [id]/
            │       └── route.ts      # GET | PATCH | DELETE
            │                         # guard: Admin+Employee فقط
            │
            ├── stock/
            │   └── movements/
            │       └── route.ts      # GET (list) | POST (new movement)
            │                         # POST يحدّث Product.quantity تلقائياً
            │                         # guard: Admin+Employee فقط
            │
            ├── orders/
            │   ├── route.ts          # GET (list — مفلتر حسب الدور) | POST (new)
            │   └── [id]/
            │       └── route.ts      # GET | PATCH (status update)
            │                         # PATCH guard حسب الدور:
            │                         #   Admin: approve/reject
            │                         #   Supplier: shipped
            │                         #   Employee: delivered
            │
            ├── alerts/
            │   ├── route.ts          # GET (list — مفلتر حسب userId) | POST
            │   └── [id]/
            │       └── route.ts      # PATCH (mark as read) | DELETE
            │
            ├── categories/
            │   └── route.ts          # GET | POST | (DELETE في route منفصل إذا احتجت)
            │                         # guard: Admin فقط للتعديل
            │
            ├── suppliers/
            │   ├── route.ts          # GET | POST
            │   └── [id]/
            │       └── route.ts      # GET | PATCH | DELETE
            │                         # guard: Admin فقط
            │
            ├── users/
            │   ├── route.ts          # GET (list) — Admin فقط
            │   ├── invite/
            │   │   └── route.ts      # POST — يرسل Clerk invitation
            │   │                     # guard: Admin فقط
            │   └── [id]/
            │       └── route.ts      # PATCH (role change) | DELETE
            │                         # guard: Admin فقط
            │
            └── reports/
                └── route.ts          # GET — تجميع بيانات للتقارير
                                      # guard: Admin فقط
```

---

## Middleware — حماية المسارات

```
src/middleware.ts   ← الاسم الصحيح الذي يقرأه Next.js
```

منطق الحماية:

```
/dashboard          → أي مستخدم مسجل دخول
/products/*         → admin | employee
/stock/*            → admin | employee
/orders             → admin | employee | supplier
/orders/new         → admin | employee
/orders/[id]        → admin | employee | supplier (مع فلتر في الـ API)
/alerts             → admin | employee
/categories         → admin
/suppliers          → admin
/reports            → admin
/users              → admin
/invite             → admin
```

---

## lib/prisma.ts — الصيغة الصحيحة مع pg adapter

```ts
import { PrismaClient } from "@/app/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

---

## lib/auth.ts — helper لقراءة المستخدم الحالي

```ts
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function getCurrentUser() {
  const { userId } = await auth()
  if (!userId) return null

  return prisma.user.findUnique({
    where: { id: userId },
    include: { supplier: true },
  })
}
```

---

## ترتيب خطوات الـ Migration

```bash
# 1. استبدل prisma/schema.prisma بالملف المرفق

# 2. تأكد من .env
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"

# 3. تأكد من prisma.config.ts
#    (earlyAccess: true إذا كنت تستخدم Prisma 7)

# 4. Generate أولاً للتحقق من صحة السكيما
npx prisma generate

# 5. Migration
npx prisma migrate dev --name init

# 6. تحقق بصري
npx prisma studio
```

---

## ملاحظات مهمة

- **`proxy.ts`** يجب إعادة تسميته إلى **`middleware.ts`** وإلا Next.js لن يعترف به
- **Webhook Clerk** في `/api/webhooks/clerk/route.ts` هو المسؤول الوحيد عن إنشاء `User` في Prisma — لا تنشئ users يدوياً
- **`Alert.userId = null`** تعني تنبيه للأدمن، و`userId = موجود` تعني تنبيه للموظف المحدد
- **`OrderItem.unitPrice`** يحتفظ بسعر المنتج وقت الطلب بغض النظر عن تغيير السعر لاحقاً — هذا مقصود
- **`StockMovement` onDelete: Restrict** يمنع حذف منتج أو مستخدم إذا كان له حركات مخزون — مناسب لنظام طبي