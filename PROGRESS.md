# Progress Perkembangan Aplikasi Asesmen ASN (SJT PermenPANRB)

> **Stack Teknologi**: Bun v1.4.0 · ElysiaJS · Drizzle ORM · MySQL (`ases_men`) · SvelteKit (Svelte 5)  
> **Pendekatan Pengembangan**: Test-Driven Development (TDD Red → Green), Conventional Commits, GitHub Issues Tracking

---

## Ringkasan Pencapaian Modul

| Tahap | Modul / Fitur | Status | GitHub Issue | Detail Hasil |
| :---: | :--- | :---: | :---: | :--- |
| **1** | Project Scaffolding & DB Schema | ✅ Selesai | — | Inisialisasi Bun workspace, konfigurasi Drizzle ORM MySQL, 7 skema tabel relasional, koneksi pool aktif ke DB `ases_men`, migrasi SQL berhasil digenerate & push. |
| **2** | Seeder: 9 Kompetensi, Soal SJT & Akun Demo | ✅ Selesai | — | 9 dimensi kompetensi PermenPANRB 38/2017, 18 soal SJT kasus nyata (4 opsi berbobot 1-4), 4 akun demo (1 Admin, 3 ASN) ber-hash Bcrypt, lolos uji idempotency. |
| **3** | Modul Auth & Role Guard Middleware | ✅ Selesai | [#1](https://github.com/oktadhirga/asesmen/issues/1) | POST `/api/auth/login` (NIP + password), JWT signing/verifikasi, GET `/api/auth/me`, guard `requireAuth`, `requireAdmin` (403), dan `requirePeserta`. |
| **4** | Modul Users (CRUD ASN & Asesor) | ⏳ Siap Dikerjakan | — | Manajemen data pegawai oleh Admin (Paginasi, filter jenjang/role, proteksi NIP). |
| **5** | Modul Competency (9 Dimensi) | ⏳ Menunggu | — | Endpoint referensi 9 dimensi dan pembaruan bobot standar. |
| **6** | Modul Questions (Bank Soal SJT) | ⏳ Menunggu | — | CRUD bank soal dengan validasi ketat 4 opsi berbobot 1-4. |
| **7** | Modul Sessions (Sesi & Penjadwalan) | ⏳ Menunggu | — | Manajemen sesi, token akses unik peserta, status DRAFT/BERJALAN/SELESAI. |
| **8** | Modul Exams (Core Engine & Proctoring) | ⏳ Menunggu | — | Acak soal & opsi, timer tersinkron server, autosave per klik, deteksi tab switch. |
| **9** | Modul Reports (Kalkulasi JPM & Radar) | ⏳ Menunggu | — | Kalkulasi nilai per dimensi, persentase JPM, kategori kelulusan (MS/MMS/KMS). |
| **10** | Frontend Setup & Design System | ⏳ Menunggu | — | Inisialisasi SvelteKit, Vanilla CSS Design System bertema Portal Pemerintahan. |
| **11** | Frontend Admin | ⏳ Menunggu | — | Dashboard, CRUD master data, live monitoring proctoring ujian peserta. |
| **12** | Frontend Peserta | ⏳ Menunggu | — | Antarmuka ujian SJT terawasi, navigasi soal, timer, dan visualisasi Radar Chart. |
| **13** | Integration Test End-to-End | ⏳ Menunggu | — | Pengujian siklus penuh asesmen dari login, pengerjaan, hingga rekapitulasi. |

---

## Rincian Teknis yang Telah Diimplementasikan

### 1. Database Relasional (MySQL via Drizzle ORM)
Database MySQL `ases_men` telah memiliki 7 tabel fisik:
1. `users`: Menyimpan data akun Admin & ASN (NIP unik, password Bcrypt, role, jabatan, instansi, jenjang jabatan).
2. `competencies`: 9 dimensi PermenPANRB (8 Manajerial + 1 Sosial Kultural).
3. `questions`: Skenario studi kasus birokrasi SJT dan target level jabatan (1-4).
4. `question_options`: Pilihan respon A, B, C, D dengan bobot nilai tepat 1 s.d. 4.
5. `assessment_sessions`: Sesi asesmen berbatas waktu dengan kode sesi unik dan status siklus.
6. `session_participants`: Relasi peserta dengan sesi, token akses, catatan pelanggaran tab switch, total nilai, dan persentase JPM.
7. `participant_answers`: Catatan jawaban real-time (autosave), opsi terpilih, bobot nilai, dan status penandaan ragu-ragu.

### 2. Akun Demo Siap Uji
- **Admin / Asesor Utama**:
  - NIP: `198501012010011001`
  - Password: `password123`
  - Role: `ADMIN`
- **Peserta ASN (Jenjang Pelaksana)**:
  - NIP: `199505122020121002`
  - Password: `password123`
  - Role: `PESERTA` | Jenjang: `PELAKSANA`
- **Peserta ASN (Jenjang Pengawas / Eselon IV)**:
  - NIP: `198808172014032003`
  - Password: `password123`
  - Role: `PESERTA` | Jenjang: `PENGAWAS`
- **Peserta ASN (Jenjang Administrator / Eselon III)**:
  - NIP: `197903252005011004`
  - Password: `password123`
  - Role: `PESERTA` | Jenjang: `ADMINISTRATOR`

### 3. Modul Autentikasi & Otorisasi
- `AuthService.validateCredentials(nip, password)`: Verifikasi kredensial menggunakan Bcrypt hashing.
- `AuthService.sanitizeUser(user)`: Menjamin atribut sensitif `password_hash` tidak pernah terekspos ke respon HTTP.
- `authPlugin`: Scoped context Elysia yang mendekode Bearer JWT token secara otomatis.
- `requireAuth`: Memvalidasi keberadaan token aktif.
- `requireAdmin`: Mengisolasi route khusus admin (`403 Forbidden` untuk role non-admin).
- `requirePeserta`: Proteksi route khusus peserta asesmen.

---

## Status Pengujian Otomatis (TDD Suite)

Semua pengujian berjalan menggunakan runner `bun test` dengan status **100% GREEN**:

```
tests/db/schema.test.ts          8 pass (58 expect calls)
tests/db/seed.test.ts            5 pass (88 expect calls)
tests/modules/auth/auth.test.ts  9 pass (27 expect calls)
---------------------------------------------------------
Total                            22 pass, 0 fail (173 assertions)
TypeScript Compilation           0 errors (Exit code 0)
```
