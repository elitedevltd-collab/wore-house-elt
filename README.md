# Warehouse Management System (WMS)

نظام إدارة مخازن مستقل بالكامل (Backend + Frontend + Database حقيقيين)، مبني بمعمارية Modular قابلة للتوسع، ويعمل محليًا بالكامل من غير أي اعتماد على Cloud.

**Stack:** NestJS + TypeScript + Prisma + PostgreSQL (Backend) | React + Vite + TypeScript + Tailwind (Frontend)

---

## التشغيل السريع (الطريقة الموصى بها - Docker)

المتطلبات: [Docker Desktop](https://www.docker.com/products/docker-desktop/) مثبت على ويندوز (بيشغّل PostgreSQL + Backend + Frontend مع بعض، مفيش حاجة تانية تتثبت).

```bash
docker compose up --build
```

بعد ما الـ Containers تشتغل، افتح Terminal جديد ونفّذ الأوامر دي **مرة واحدة بس** لإنشاء الجداول وبيانات البداية:

```bash
docker compose exec backend npx prisma migrate dev --name init
docker compose exec backend npm run prisma:seed
```

بعدها:
- **الفرونت اند:** http://localhost:5173
- **الباك اند / API:** http://localhost:4000/api
- **توثيق الـ API (Swagger):** http://localhost:4000/api/docs
- **بيانات الدخول التجريبية:** `admin@warehouse.local` / `Admin@12345`

---

## التشغيل بدون Docker (npm مباشرة)

لو معندكش Docker، محتاج تثبت [PostgreSQL](https://www.postgresql.org/download/windows/) و[Node.js 20+](https://nodejs.org/) بنفسك.

### 1. قاعدة البيانات
اعمل database اسمها `warehouse_db` (أو استخدم أي database عندك وعدّل `DATABASE_URL`).

### 2. الباك اند
```bash
cd backend
cp .env.example .env
# عدّل DATABASE_URL في .env لو محتاج
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
```
الباك اند هيشتغل على http://localhost:4000

### 3. الفرونت اند (في Terminal تاني)
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
الفرونت اند هيشتغل على http://localhost:5173

---

## إيه اللي مبني بالكامل (Production-quality)

- **Auth:** JWT (Access + Refresh Token)، Bcrypt Hashing، Change Password، Logout بيلغي الـ Refresh Token
- **RBAC حقيقي:** الصلاحيات بتتفحص فعليًا في الـ Backend (مش بس تخفي زرار في الواجهة) عن طريق `PermissionsGuard` على كل Endpoint
- **Stock Engine:** كل حركة (استلام/صرف/تحويل/تسوية/جرد) بتعدّي من `StockService.postMovement()` في Transaction واحدة بتضمن تزامن `StockMovement` و`StockBalance` دايمًا، مع التحقق من الرصيد المتاح قبل أي صرف
- **Receipts, Issues, Transfers, Adjustments, Stock Counts:** كل واحدة فيها Workflow كامل (Draft → Confirm → إلخ) ومربوطة فعليًا بالـ Stock Engine
- **Audit Log:** بيتسجل تلقائي لكل عملية POST/PATCH/PUT/DELETE
- **الفرونت اند:** كل الشاشات دي بتتكلم مع API حقيقي (مفيش بيانات وهمية Hardcoded)، بتدعم عربي/إنجليزي (RTL/LTR) ووضع ليلي/نهاري

## إيه اللي "Scaffolded" بس (الهيكل جاهز، الـ Business Logic لسه مش متكاملة)

عشان نلتزم بجدول زمني واقعي، الحاجات دي جاهزة في الـ Database Schema وقابلة للتوسع بدون تعديل جوهري في الـ Core، بس مش متوصلة API/Frontend كاملة لحد دلوقتي:

- **Purchase Orders / Sales Orders:** الموديلز جاهزة، لسه مربوطاش بالـ Stock Engine (يعني اعتماد أمر شراء لسه مش بيعمل Receipt تلقائي)
- **Suppliers / Customers:** الموديلز جاهزة ومربوطة بالـ Receipts/Issues، لسه محتاجين CRUD screens مخصصة
- **Serial Numbers:** الموديل جاهز، لسه مافيش واجهة مخصصة لإدارتها (بخلاف الـ Lots اللي شغالة كاملة مع الاستلام)
- **Notifications:** الموديل جاهز بس مفيش نظام إرسال فعلي (Email/Push) لسه
- **Multi-company كامل:** فيه Company/Branch في الـ Schema، بس الفلترة التلقائية حسب الشركة لسه مش مطبقة على كل الاستعلامات

## الخطوات المقترحة للمرحلة الجاية
1. ربط Purchase Orders بعملية الاستلام (اعتماد أمر شراء ينشئ Receipt تلقائي)
2. شاشات Suppliers/Customers الكاملة
3. تفعيل Barcode Scanning في الفرونت اند (زي اللي عملناه في نسخة اودو)
4. نظام Notifications حقيقي
5. Multi-company / Multi-branch filtering كامل على مستوى الـ API
6. اختبارات آلية (Unit + E2E) للـ Stock Engine تحديدًا لأنه أهم جزء

## هيكل المشروع
```
warehouse-system/
├── docker-compose.yml
├── backend/            (NestJS + Prisma + PostgreSQL)
│   ├── prisma/schema.prisma   ← كل الـ Database Models
│   └── src/
│       ├── stock/              ← Stock Engine (أهم موديول)
│       ├── receipts/ issues/ transfers/ adjustments/ counts/
│       ├── auth/ users/ roles/
│       └── products/ warehouses/ audit/ reports/
└── frontend/           (React + Vite + Tailwind)
    └── src/
        ├── pages/       ← كل شاشة من شاشات النظام
        ├── context/     ← Auth + UI (لغة/وضع ليلي)
        └── layouts/
```
