# Done

## 2026-07-07
- [x] Fix responsive: file input di Import Database melebihi lebar container di mobile — stack vertikal + full-width (`src/views/pages/dashboard/settings.ejs`)
- [x] Fix responsive: action buttons (Edit, Lihat, Hapus) di tabel alumni overflow horizontal — stack vertikal di mobile (`src/views/pages/dashboard/alumni-list.ejs`)

## 2026-07-05
- [x] Proteksi role admin: tidak bisa mengubah role sendiri atau admin selevel — backend (`src/routes/admins.ts`) + frontend sembunyikan tombol (`src/views/pages/dashboard/admins.ejs`)
- [x] Add Reset Password & Jadikan Admin buttons to dashboard edit form (`src/views/pages/dashboard/alumni-form.ejs`) — section "Tindakan Admin" di paling bawah form, ganti confirm()/alert() native → modal konfirmasi + toast notification
- [x] Responsive layout: hamburger menu for all public pages (`/`, `/alumni`, `/alumni/baru`, `/alumni/:id`, `/statistik`)
- [x] Responsive layout: hamburger menu for all dashboard pages (index, alumni-list, alumni-form, admins, admin-form, password, settings)
- [x] Fix filter toolbar in `/alumni` — stack on mobile instead of overflow
- [x] Fix search/filter form in `/dashboard/alumni` — responsive stacking on mobile
- [x] Fix table in `/dashboard/admins` — overflow-x-auto scroll, hide secondary columns on mobile
- [x] Fix detail page buttons — wrap on mobile with shorter labels
- [x] Fix landing page hero buttons — wrap with `flex-wrap` and use smaller text
- [x] Feature: User role "user" — setiap alumni yang terdaftar (dengan email) otomatis mendapat akun admin role "user", password default "user123"
- [x] Login user: validasi isActive alumni, redirect ke `/alumni/:id` sendiri
- [x] Ubah password: tombol "Ubah Password" di detail alumni untuk pemilik data, redirect sesuai role
- [x] NIK disembunyikan dari publik dan user role — hanya admin/super_admin bisa lihat
- [x] Phone number: full untuk semua logged-in user, masked untuk publik
- [x] Dashboard redirect: user role dialihkan ke halaman detail alumninya
- [x] Button "Edit" hanya untuk admin/super_admin
- [x] Mobile menu: user role tidak lihat link Dashboard/Kelola Alumni, hanya Ubah Password + Keluar

## 2026-07-04
- [x] Fix `EMAXCONNSESSION` max clients — batasi pool size PrismaPg `max: 3` (Vercel) / `max: 5` (lokal) + `idleTimeoutMillis: 10000` (`src/utils/db.ts`)
- [x] Fix "invalid token" / sering minta login — ganti Supabase access_token (expiry 1 jam) dengan own JWT 7 hari (`src/routes/pages.ts`, `src/middleware/auth.ts`)
- [x] Setup deployment Vercel — `api/index.js` entry point, `vercel.json` (builds + routes + includeFiles), `vercel-build` script (prisma generate + tsc + copy views), `tsconfig.json` (CommonJS), build script cross-platform (node cpSync), guide.md section Deployment

## 2026-06-30
- [x] Alumni publik bisa tambah data, isActive=false menunggu aktivasi admin; admin langsung isActive=true (`src/routes/alumni.ts`, `src/middleware/auth.ts`)
- [x] Validasi NIK unik — error 409 "NIK sudah terdaftar" (`src/routes/alumni.ts`)
- [x] Publik hanya lihat alumni aktif; admin lihat semua + filter status (`src/routes/alumni.ts`, `src/routes/pages.ts`)
- [x] Admin toggle status aktif/nonaktif per-item + PATCH endpoint (`src/routes/alumni.ts`)
- [x] Halaman publik `/alumni/baru` — form input data alumni (`src/routes/pages.ts`, `src/views/pages/alumni/form.ejs`)
- [x] Dashboard alumni list: kolom status aktif, filter dropdown, tombol toggle (`src/views/pages/dashboard/alumni-list.ejs`)
- [x] Dashboard alumni form: toggle isActive untuk admin (`src/views/pages/dashboard/alumni-form.ejs`)
- [x] Optional auth middleware agar admin tetap dikenali tanpa wajib login (`src/middleware/auth.ts`)
- [x] Proteksi hapus: admin biasa tidak bisa hapus alumni yang juga admin; super admin bisa kecuali built-in (`src/routes/alumni.ts`)
- [x] Bulk delete: filter by role (admin biasa vs super admin) (`src/routes/alumni.ts`, `src/views/pages/dashboard/alumni-list.ejs`)
- [x] Bulk activate/deactivate (`src/routes/alumni.ts`, `src/views/pages/dashboard/alumni-list.ejs`)
- [x] Ganti semua alert()/confirm() native → toast Tailwind + modal konfirmasi (`semua file ejs di dashboard/`)
- [x] Create test for page routes — `src/__tests__/pages.test.ts`
- [x] Create test for auth API — `src/__tests__/auth-api.test.ts`
- [x] Create test for admins API — `src/__tests__/admins-api.test.ts`
- [x] Fix vitest v4 `vi.mock` hoisting issue — use `vi.hoisted()` instead of top-level `const` in factory
- [x] Add `"test": "vitest run"` script to `package.json`
- [x] All 74 tests pass across 5 test files (health, alumni-api, pages, auth-api, admins-api)
- [x] Update `guide.md` — add test command, testing section with vi.hoisted() pattern, test file list
- [x] Add instruction to AGENTS.md — always update `guide.md` when changes warrant documentation
- [x] Add limit (pagination size) dropdown to public `/alumni` and `/dashboard/alumni` — options 5/10/20/50/100, default 10

## 2026-07-04 (cont.)
- [x] Halaman publik `/statistik` — chart alumni per provinsi (bar chart desktop, doughnut chart mobile) + tabel data + link nav di semua halaman publik
- [x] Test: 2 test untuk /statistik

## 2026-07-04 (cont.)
- [x] Theme kustomisasi — brand color + gradient dari settings, CSS custom properties, color picker UI
- [x] Replace semua `text-blue-600` pada site name → `style="color: var(--brand-color)"`
- [x] Replace semua `.soft-gradient` dan `bg-gradient-to-r from-blue-600 to-teal-400` → `var(--gradient-from)` / `var(--gradient-to)`

## 2026-07-04
- [x] Fitur Pengaturan Website — model Setting, API CRUD, halaman dashboard (`prisma/schema.prisma`, `src/routes/settings.ts`, `src/index.ts`, `src/views/pages/dashboard/settings.ejs`)
- [x] Dynamic title/meta/favicon di header dari database (`src/views/partials/header.ejs`)
- [x] Backup & Restore database — export/import JSON (`src/routes/settings.ts`)
- [x] Middleware `loadSettings` — semua page routes punya `res.locals.settings` (`src/routes/pages.ts`, `src/routes/settings.ts`)
- [x] Seed default settings saat startup (`src/index.ts`)
- [x] Link "Pengaturan" di navigasi dashboard untuk super_admin (semua file EJS dashboard)
- [x] Update `guide.md` — dokumentasi fitur Pengaturan
- [x] Fix upload foto di form publik `/alumni/baru` — ganti middleware `requireAuth` → `optionalAuth` di `POST /api/v1/upload/alumni-photo` (`src/routes/upload.ts`)
- [x] Fix form publik tampilkan server-side error `NIK sudah terdaftar` / `Nama wajib diisi` (`src/views/pages/alumni/form.ejs`)
- [x] Dashboard `/dashboard` — tambah statistik alumni aktif dan non-aktif (`src/routes/pages.ts`, `src/views/pages/dashboard/index.ejs`)
- [x] Prisma schema: NIK `String?` → `String` (non-nullable) (`prisma/schema.prisma`)
- [x] Validasi server-side: name + nik wajib diisi (`src/routes/alumni.ts`, `src/routes/pages.ts`)
- [x] NIK format: hanya angka 16 digit — validasi client + server (`src/views/pages/alumni/form.ejs`, `src/views/pages/dashboard/alumni-form.ejs`, `src/routes/alumni.ts`, `src/routes/pages.ts`)
- [x] Hapus `novalidate` + tambah JS validation di form publik dan dashboard (`src/views/pages/alumni/form.ejs`, `src/views/pages/dashboard/alumni-form.ejs`)
- [x] Tambah `action`/`method` di `<form>` sebagai fallback (`src/views/pages/alumni/form.ejs`, `src/views/pages/dashboard/alumni-form.ejs`)
- [x] Page route POST /alumni/baru: tambah provinceCode, regencyCode, dll ke destructure + simpan (`src/routes/pages.ts`)

## 2026-07-03
- [x] Fix race condition dropdown negara — `populateCountrySelect()` menunggu fetch selesai via promise (`src/views/pages/alumni/form.ejs`, `src/views/pages/dashboard/alumni-form.ejs`)
- [x] Jalankan `pnpm db:seed-countries` — 223 negara berhasil di-seed ke tabel countries
- [x] Update 6 record education dengan NULL `countryCode` → `'ID'`
- [x] Fitur Portofolio — model, form publik, form dashboard, detail view, seed data
- [x] Tambah model `Portfolio` ke Prisma schema + `db:push`
- [x] Handle portfolios di route alumni (create & update) — `src/routes/alumni.ts`
- [x] Form publik: section Portfolio dengan input Nama, Jenis (dropdown), Tahun (opsional), Link (opsional, target new tab) — `src/views/pages/alumni/form.ejs`
- [x] Form dashboard: section Portfolio dengan pola yang sama — `src/views/pages/dashboard/alumni-form.ejs`
- [x] Detail alumni: tampilkan portfolio — `src/views/pages/alumni/detail.ejs`
- [x] Include portfolios di query `pages.ts` (detail & edit)
- [x] Seed data: 2 portfolio per alumni — `src/database/seed.ts`
- [x] Update `guide.md` — dokumentasi model Portfolio
- [x] Ganti seed data alumni (nama islami, profil lulusan Timur Tengah) — `src/database/seed.ts`, fixtures, tests

## 2026-07-02
- [x] Tambah model `Country` ke Prisma schema (`prisma/schema.prisma`) — field: code (PK), name, dialCode, dialCode4
- [x] Buat seed script `src/database/seed-countries.ts` — baca CSV `country_phone_codes-v2.csv` dan upsert ke tabel countries
- [x] Tambah script `pnpm db:seed-countries` di `package.json`
- [x] Buat API endpoint `GET /api/v1/countries` (`src/routes/countries.ts`) — return semua negara urut nama
- [x] Daftarkan route countries di `src/index.ts`
- [x] Ubah field "Asal Negara" di form dashboard `alumni-form.ejs` dari text input → `<select>` dropdown yang terisi dari `/api/v1/countries`
- [x] Ubah field "Negara" di form publik `form.ejs` dari text input → `<select>` dropdown yang terisi dari `/api/v1/countries`
- [x] Update `guide.md` — dokumentasikan model Country dan perintah baru
- [x] Ubah `Education.country` (String) jadi `Education.countryCode` (relation ke Country) di schema
- [x] Tambah relasi balik `educations` di model Country
- [x] Update seed.ts — pakai `countryCode: 'ID'` bukan `country: 'Indonesia'`
- [x] Update fixtures — pakai `countryCode: 'ID'` bukan `country: 'Indonesia'`
- [x] Update form dashboard & publik: value dropdown = country code (bukan nama), field name = `countryCode`

## 2026-07-05 (Session Handoff)
### Ringkasan
Sesi ini fokus pada:
1. **Responsive layout** — hamburger menu, gradient divider, filter/search stacking, table scroll, button wrap untuk mobile di semua halaman publik dan dashboard.
2. **Detail page** — header gradient (tanpa blur), badge putih + border, NIK disembunyikan dari non-admin, phone di-mask untuk publik, Hubungi button hanya untuk logged-in user.
3. **User role "user"** — password disimpan di tabel Alumni langsung (bukan Admin table). Login user via bcrypt lokal (tidak pakai Supabase Auth). Default password "user123". Login memeriksa isActive alumni. Redirect ke `/alumni/:id` sendiri. NIK hanya admin/super_admin. Ubah password via `/dashboard/password`. Dashboard dialihkan. Reset password oleh admin via tombol di detail page.

### Perubahan Arsitektur
- `password` field ditambahkan ke model `Alumni` (prisma schema + db:push)
- Login user: verifikasi bcrypt langsung ke tabel Alumni, tanpa Admin table
- Login admin: tetap via Admin table (supabase auth atau local bcrypt)
- JWT token kini menyertakan `source: 'alumni' | 'admin'` untuk lookup table yang benar
- `requireAuth` / `optionalAuth` middleware: lookup alumni atau admin sesuai `source`
- `loadUser` (pages.ts): handle alumni source dari cookie token
- `ensureUserAccount` / `deleteUserAccount` dihapus (sudah tidak perlu buat admin record untuk user)

### File yang dimodifikasi
- `prisma/schema.prisma` — tambah field `password String?` di model Alumni
- `src/routes/alumni.ts` — set default password di POST/PUT, tambah endpoint reset-password, hapus ensureUserAccount
- `src/routes/auth.ts` — handle alumni source di password change
- `src/middleware/auth.ts` — lookup alumni atau admin berdasarkan source dari JWT
- `src/utils/jwt.ts` — tambah `source?: string` di signToken/verifyToken
- `src/routes/pages.ts` — login handler: admin dulu, baru fallback alumni; loadUser handle alumni source; hapus ensureUserAccount
- `src/views/pages/alumni/detail.ejs` — reset password button untuk admin, token passed ke template
- `src/views/pages/login.ejs` — password visibility toggle (icon mata)
- `src/views/pages/dashboard/password.ejs` — redirect sesuai role, admin link visibility
- `src/__tests__/pages.test.ts` — update error message expectation
- `guide.md` — dokumentasi User Role

### Next Steps
- Integration/E2E tests untuk user role flow (login, password change, NIK/phone visibility)
- Testing edge cases: alumni tanpa email, alumni nonaktif mencoba login
- Export helper functions ke shared utility jika perlu

## 2026-06-29
- [x] fix 500 error on POST /api/v1/admins — add password column to database (`pnpm db:push`)
- [x] handle "user already registered" error when adding admin — check existing Supabase Auth user before create (`src/routes/admins.ts`)
- [x] handle duplicate admin in local admins table — upsert instead of create (`src/routes/admins.ts`)
- [x] fix SWAP_ROLES text appearing on admin list — replace Material Symbols icon with Unicode arrows (`src/views/pages/dashboard/admins.ejs`)
- [x] add delete button for alumni with confirmation dialog (`src/views/pages/dashboard/alumni-list.ejs`, `src/routes/pages.ts`)
- [x] move upload max file size to .env — `UPLOAD_MAX_FILE_SIZE_KB` (`src/config/env.ts`, `src/routes/upload.ts`, `src/routes/pages.ts`, `src/views/pages/dashboard/alumni-form.ejs`)
- [x] show max file size info text on alumni photo upload field (`src/views/pages/dashboard/alumni-form.ejs`)
- [x] create session-tracker skill for cross-session context continuity (`.agents/skills/session-tracker/`, `todo.md`, `done.md`)
