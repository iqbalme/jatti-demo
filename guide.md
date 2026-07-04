# AlumniLink — Panduan Penggunaan

## Persiapan Awal

```bash
pnpm install
```

Salin `.env.example` ke `.env` dan isi konfigurasi:

```bash
cp .env.example .env
```

---

## Database

### Pilih Provider

Cukup ganti `DATABASE_URL` di `.env`:

```env
# PostgreSQL (default)
DATABASE_URL=postgresql://postgres:password@localhost:5432/alumnilink

# atau MySQL
DATABASE_URL=mysql://root:password@localhost:3306/alumnilink
```

Provider **terdeteksi otomatis** dari prefix URL. Driver dan adapter sudah terinstall untuk keduanya.

### Migrasi

```bash
pnpm db:migrate
```

Perintah ini otomatis mendeteksi provider dari `DATABASE_URL`, memperbarui `prisma/schema.prisma`, lalu menjalankan migrasi.

### Seed Data

```bash
pnpm db:seed
```

### Studio (GUI data)

```bash
pnpm db:studio
```

### Push Schema (tanpa file migrasi)

```bash
pnpm db:push
```

---

## Authentication

Pilih provider auth di `.env`:

```env
# Supabase Auth — menggunakan akun Supabase (default)
AUTH_PROVIDER=supabase

# atau Local — password diverifikasi langsung ke database lokal
AUTH_PROVIDER=local
JWT_SECRET=your-random-secret-key
```

> **Catatan:** `JWT_SECRET` untuk local auth. Jika tidak diisi, fallback ke `SUPABASE_JWT_SECRET`. Di production wajib ganti dengan secret sendiri.

### Setup Super Admin (Local Auth)

Saat pertama `pnpm dev`, super admin dari `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` di `.env` otomatis dibuat di tabel `admins` dengan password di-hash (bcrypt). Langsung bisa login.

### Perbedaan Provider Auth

| Fitur | Supabase | Local |
|---|---|---|
| Login | via `supabase.auth.signInWithPassword()` | verifikasi bcrypt ke tabel `admins` |
| Session | JWT dari Supabase | JWT ditandatangani lokal |
| Password admin | dikelola Supabase Auth | disimpan (bcrypt) di tabel `admins` |
| Super admin seeding | buat user Supabase + record `admins` | langsung buat record `admins` dengan password hash |
| Dashboard password | ubah via Supabase Auth API | update hash di tabel `admins` |
| Ketergantungan | wajib `NEXT_PUBLIC_SUPABASE_*` | hanya perlu database |

---

## Storage Upload

```env
# Supabase Storage (default)
STORAGE_PROVIDER=supabase
SUPABASE_STORAGE_BUCKET=alumni-photos

# atau Local Filesystem
STORAGE_PROVIDER=local
UPLOAD_DIR=public/uploads
```

### Mode Local

File foto disimpan di `public/uploads/alumni/` dan diakses via `/uploads/alumni/...`.

---

## Menjalankan Aplikasi

```bash
# Development
pnpm dev

# Build & Production
pnpm build
pnpm start
```

Akses di `http://localhost:3000`.

---

## Struktur Script

| Perintah | Fungsi |
|---|---|
| `pnpm dev` | Development server (`tsx watch`) |
| `pnpm build` | Compile TypeScript + copy views ke `dist/` |
| `pnpm start` | Production server |
| `pnpm vercel-build` | Build untuk Vercel (prisma generate + tsc + copy views) |
| `pnpm db:generate` | Generate Prisma Client (deteksi provider otomatis) |
| `pnpm db:migrate` | Migrasi database (deteksi provider otomatis) |
| `pnpm db:push` | Push schema tanpa file migrasi (deteksi provider otomatis) |
| `pnpm db:seed` | Isi data contoh (alumni) |
| `pnpm db:seed-countries` | Isi data negara dari CSV `src/database/country_phone_codes-v2.csv` |
| `pnpm db:studio` | Prisma Studio |
| `pnpm lint` | Cek error TypeScript |
| `pnpm test` | Jalankan semua unit test (vitest) |

---

## Testing

Unit test menggunakan **Vitest v4** dengan pattern mocking `vi.hoisted()`:

```typescript
const prismaMock = vi.hoisted(() => { /* buat mock inline */ });
vi.mock('../utils/db', () => ({ prisma: prismaMock }));
```

> **Penting:** Di Vitest v4, `vi.mock` factory tidak bisa mereferensi variabel module-level (bahkan `let`). Semua mock object harus dibuat di dalam `vi.hoisted()`.

```bash
# Jalankan semua test
pnpm test

# Jalankan file spesifik
pnpm vitest run src/__tests__/alumni-api.test.ts

# Watch mode
pnpm vitest
```

### Pagination

Halaman daftar alumni (publik `/alumni` dan dashboard `/dashboard/alumni`) mendukung dropdown limit: **5, 10, 20, 50, 100**, default **10**. Nilai dikirim via query param `?limit=`. Server memvalidasi dengan `Math.min(100, Math.max(1, Number(...)))`.

Test files berada di `src/__tests__/`:
- `health.test.ts` — health check endpoint
- `alumni-api.test.ts` — alumni CRUD, bulk actions, isActive, proteksi admin
- `pages.test.ts` — public pages, protected pages, login/logout flow
- `auth-api.test.ts` — me, profile, password change
- `admins-api.test.ts` — admin CRUD, role change, built-in protection

---

## Catatan

- **Session baru?** Jalankan `skill session-tracker` — saya akan baca `todo.md` & `done.md` untuk lanjut konteks.
- Semua konfigurasi via `.env` — tidak perlu ubah kode untuk ganti database, auth, atau storage.
- `Prisma 7` menggunakan driver adapter. Konfigurasi koneksi ada di `prisma.config.ts` (migrasi) dan `src/utils/db.ts` (runtime).
- Model `Country` berisi daftar negara dari CSV. Seed dengan `pnpm db:seed-countries`. API endpoint: `GET /api/v1/countries`.
- Model `Portfolio` — relasi ke Alumni. Field: `name`, `type` (Buku/Aplikasi/Website/Lainnya), `typeOther`, `year`, `link`.
- Field "Negara" di form pendidikan alumni menggunakan `<select>` dropdown dari API `/api/v1/countries`. Nilai disimpan sebagai `String` (nama negara).
- Provider database, auth, dan storage bisa dikombinasikan bebas (misal: PostgreSQL + local auth + supabase storage).
- Saat `AUTH_PROVIDER=local`, variabel Supabase (`NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`) tetap wajib diisi untuk kompatibilitas, meski tidak dipakai untuk auth.
- Untuk `AUTH_PROVIDER=local`, field `password` di tabel `admins` akan terisi hash bcrypt. Untuk `AUTH_PROVIDER=supabase`, field tersebut `NULL` (password dikelola Supabase Auth).

---

---

## Deployment

### Vercel

Aplikasi siap di-deploy ke Vercel. Hubungkan repo GitHub dan set **Root Directory** ke `/`.

**Environment variables** yang wajib diisi di Vercel Dashboard:
```
DATABASE_URL=postgresql://...
AUTH_PROVIDER=supabase
STORAGE_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
SUPABASE_STORAGE_BUCKET=alumni-photos
SUPER_ADMIN_EMAIL=...
SUPER_ADMIN_PASSWORD=...
PORT=3000
NODE_ENV=production
```

> **Catatan:** Storage lokal (`STORAGE_PROVIDER=local`) tidak bisa dipakai di Vercel karena filesystem ephemeral. Wajib pakai Supabase Storage.

**Database:** Pastikan sudah pakai connection pooling (contoh: Supabase Pooler atau Neon Pooler) agar tidak kehabisan koneksi di serverless.

**Migrasi database:** Jalankan `pnpm db:migrate` atau `pnpm db:push` secara terpisah (tidak otomatis di Vercel). Bisa via local pointing ke production DB, atau via GitHub Actions.

### VPS (Manual)

```bash
pnpm install
pnpm build        # tsc + copy views ke dist/
pnpm start        # node dist/index.js
```

Pastikan `.env` terisi lengkap dan database sudah siap.

### Catatan Build

- `pnpm build` — kompilasi TypeScript + copy folder `src/views` ke `dist/views` (agar EJS template bisa diakses runtime)
- `pnpm vercel-build` — otomatis dipakai Vercel (prisma generate + tsc + copy views)
- `tsconfig.json` menggunakan `module: "CommonJS"` karena codebase memakai `__dirname`

## Pengaturan Website

Halaman **Pengaturan** (`/dashboard/settings`) diakses oleh **super admin** untuk mengelola:

| Setting Key | Deskripsi | Default |
|---|---|---|
| `site_name` | Nama website, tampil di header dashboard | `AlumniLink` |
| `site_title` | Judul di browser tab (tag `<title>`) | `AlumniLink — Alumni Directory` |
| `site_description` | Meta description untuk SEO (tag `<meta name="description">`) | `Alumni Directory and Tracer Study Platform` |
| `favicon_url` | URL ikon favicon (tag `<link rel="icon">`) | (kosong) |
| `logo_url` | URL logo untuk header (disiapkan untuk penggunaan selanjutnya) | (kosong) |

### API Endpoints

| Method | Path | Auth | Fungsi |
|---|---|---|---|
| `GET` | `/api/v1/settings` | Publik | Ambil semua pengaturan |
| `PUT` | `/api/v1/settings` | super_admin | Update pengaturan (body: `{ key: value, ... }`) |
| `GET` | `/api/v1/settings/export` | super_admin | Download full database backup (JSON) |
| `POST` | `/api/v1/settings/import` | super_admin | Restore database dari file JSON backup (multipart form) |

### Pengaturan Default

Saat pertama aplikasi dijalankan, jika tabel `settings` kosong, 5 pengaturan default akan otomatis di-seed.

### Backup & Restore

- **Export**: Download semua data (settings, admins, alumni + relasi, countries) sebagai file JSON.
- **Import**: Upload file JSON backup untuk merestore database. **PERHATIAN:** Import akan menghapus semua data yang ada dan menggantinya dengan data dari file backup.

### Middleware `loadSettings`

Semua halaman page routes (`/`, `/alumni/*`, `/dashboard/*`) memiliki `res.locals.settings` yang berisi objek pengaturan. Digunakan di `src/views/partials/header.ejs` untuk render `<title>`, `<meta name="description">`, dan `<link rel="icon">` secara dinamis.

### Model Database

```prisma
model Setting {
  key       String   @id
  value     String?
  updatedAt DateTime @default(now()) @updatedAt
  @@map("settings")
}
```

### File Terkait

- `src/routes/settings.ts` — API route + middleware `loadSettings`
- `src/views/pages/dashboard/settings.ejs` — Halaman pengaturan dashboard
- `src/views/partials/header.ejs` — Dynamic title, meta description, favicon
- `src/index.ts` — Seed default settings saat startup
