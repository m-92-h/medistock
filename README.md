# MediStock — Project Blueprint

نظام إدارة المخزون الطبي | Next.js 16 · Clerk · PostgreSQL/Neon · Prisma · shadcn/ui

---

اقوم ببناء موقع ويب لنظام مخزن طبي يديره 3 اشخاص وبلاحيات مختلفة لكل دور وكما يلي:

```
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
```

## وادناه المخطط الحالي للمشروع:

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
    │   ├── utils.ts              # cn() 
    │   ├── prisma.ts             
    │   └── auth.ts               # getCurrentUser() من Clerk + Prisma
    │
    ├── hooks/
    │   └── use-mobile.ts
    │
    ├── components/
    │   ├── ui/                   # shadcn/ui components
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

## واما بالنسبة لبيئة العمل فهي كالتالي:

```
{
  "name": "medistock",
  "version": "1.0.0",
  "author": {
    "name": "Mohamed_Hussein",
    "email": "mohamed.h92t@gmail.com"
  },
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "postinstall": "prisma generate",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@base-ui/react": "^1.6.0",
    "@clerk/nextjs": "^7.6.2",
    "@prisma/adapter-pg": "^7.9.1",
    "@prisma/client": "^7.9.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "dotenv": "^17.4.2",
    "lucide-react": "^1.27.0",
    "next": "16.2.12",
    "next-themes": "^0.4.6",
    "pg": "^8.22.0",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "recharts": "^3.10.1",
    "shadcn": "^4.16.0",
    "svix": "^1.99.1",
    "tailwind-merge": "^3.6.0",
    "tw-animate-css": "^1.4.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/pg": "^8.20.0",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.12",
    "prisma": "^7.9.1",
    "tailwindcss": "^4",
    "tsx": "^4.23.1",
    "typescript": "^5"
  }
}
```

وانا قمت ببناء اغلب صفحات المخطط وما اريده هو فقط ان تساعدني على اكمال الصفحات التي ساطلبها منك هل جاهز؟ واذا لديك بعض الاسئلة او تحتاج لمعرفة كود معين من الملفات اخبرني قبل البدء لتجنب الاخطاء 