# KaryaFlow — Project Operations

Prototipe aplikasi manajemen proyek kontraktor berbasis Next.js. UI berbahasa Indonesia, fokus pada kontrol proyek, anggaran internal, pengeluaran lapangan, penagihan, dan dokumen dari template.

## Jalankan lokal

```bash
cd web
npm install
npm run dev
```

Tanpa `DATABASE_URL`, aplikasi memakai mode demo lokal dengan data contoh yang dapat diubah dari browser. Dengan Neon `DATABASE_URL`, API membuat tabel inti dan mengisi data demo hanya jika tabel proyek masih kosong. Untuk pengembangan lokal, isi `.env.local` dari `.env.example`, lalu jalankan `npm run db:push` jika ingin mengelola schema secara manual.

## Stack

- Next.js App Router / React / TypeScript
- Neon Postgres dengan `@neondatabase/serverless` dan Drizzle ORM
- Vercel Blob private store untuk foto nota dan logo kop surat
- Tesseract.js di browser untuk OCR awal; pengguna tetap mengoreksi hasil sebelum mengirim

## Deployment

Hubungkan repo GitHub ke Vercel dengan root directory `web`. Pasang Neon dari Vercel Marketplace untuk menyiapkan database. Jangan hubungkan database berisi data nyata atau menambahkan `DATABASE_URL` ke deployment publik sampai autentikasi dan pembatasan akses API diterapkan. Setelah tahap tersebut, sambungkan `DATABASE_URL` dan private Blob store melalui environment Vercel. Build memakai Node.js 22.x atau versi yang didukung Next.js.

## Batas prototipe

Autentikasi belum disertakan sesuai arahan. Sampai login dan hak akses aktif, jalankan hanya mode demo dengan data contoh; jangan memasukkan data keuangan atau dokumen klien yang sensitif. Endpoint mutasi belum dibatasi berdasarkan peran. Blob private menyimpan berkas, tetapi route aplikasi belum dapat membedakan pengguna karena login belum ada.
