# Progress Perkembangan Aplikasi PENTA+ (Penilaian Kompetensi dan Potensi ASN)

> **Instansi**: Pemerintah Kabupaten Trenggalek (BKPSDM)  
> **Dasar Hukum**: PermenPANRB No. 38 Tahun 2017 tentang Standar Kompetensi Jabatan ASN  
> **Stack Teknologi**: Bun v1.4.0 · ElysiaJS · Drizzle ORM · MySQL (`ases_men`) · SvelteKit (Svelte 5)  
> **Pendekatan Pengembangan**: Test-Driven Development (TDD Red → Green), Conventional Commits, GitHub Issues Tracking

---

## Ringkasan Pencapaian Modul

| Tahap | Modul / Fitur | Status | GitHub Issue | Detail Hasil |
| :---: | :--- | :---: | :---: | :--- |
| **1** | Project Scaffolding & DB Schema | ✅ Selesai | — | Inisialisasi Bun workspace, konfigurasi Drizzle ORM MySQL, 7 skema tabel relasional, koneksi pool aktif ke DB `ases_men`, migrasi SQL berhasil digenerate & push. |
| **2** | Seeder: 9 Kompetensi, Soal SJT & Akun Demo | ✅ Selesai | — | 9 dimensi kompetensi PermenPANRB 38/2017, 18 soal SJT kasus nyata (4 opsi berbobot 1-4), 4 akun demo (1 Admin, 3 ASN) ber-hash Bcrypt, lolos uji idempotency. |
| **3** | Modul Auth & Role Guard Middleware | ✅ Selesai | [#1](https://github.com/oktadhirga/asesmen/issues/1) | POST `/api/auth/login` (NIP + password), JWT signing/verifikasi, GET `/api/auth/me`, guard `requireAuth`, `requireAdmin` (403), dan `requirePeserta`. |
| **4** | Modul Users (CRUD ASN & Asesor) | ✅ Selesai | — | CRUD master user lengkap via Drizzle ORM, paginasi, pencarian nama/NIP, filter jenjang/role, proteksi NIP unik, auto-hash password Bcrypt, dan proteksi self-deletion akun Admin. |
| **5** | Modul Competency (9 Dimensi) | ✅ Selesai | — | Endpoint referensi 9 dimensi PermenPANRB 38/2017 (8 Manajerial + 1 Sosio Kultural), filter kategori, detail dimensi, dan pembaruan bobot standar & deskripsi oleh Admin. |
| **6** | Modul Questions (Bank Soal SJT) | ✅ Selesai | — | CRUD bank soal SJT lengkap via Drizzle ORM, validasi ketat 4 opsi berbobot unik 1 s.d. 4, filter competency/target level, pencarian kasus, dan cascade delete opsi. |
| **7** | Modul Sessions (Sesi & Penjadwalan) | ✅ Selesai | — | Manajemen jadwal sesi berbatas waktu, token akses unik per peserta (`ASN-XXXXXX`), pencegahan duplikasi, endpoint verifikasi token peserta, dan siklus status `DRAFT` → `BERJALAN` → `SELESAI`. |
| **8** | Modul Exams (Core Engine & Proctoring) | ✅ Selesai | — | Engine pelaksanaan ujian SJT, pengacakan deterministik butir & opsi jawaban, penyembunyian bobot nilai dari klien, autosave real-time per klik, pencatatan pelanggaran tab-switch proctoring, dan penguncian lembar submit. |
| **9** | Modul Reports (Kalkulasi JPM & Radar) | ✅ Selesai | — | Kalkulasi skor 9 dimensi, gap analisis, persentase JPM, visualisasi radar chart dataset, kategori kelulusan (MS/MMS/KMS), rekap sesi, dan rekalkulasi otomatis. |
| **10** | Frontend Setup & Design System | ✅ Selesai | — | SvelteKit (Svelte 5 runes) + Vanilla CSS Design Tokens bertema Portal Pemerintahan (Indonesian Royal Navy & Heritage Gold), A11y WCAG 2.1 AA, pure SVG Radar Chart 9 Dimensi, Auth Store, API Client, dan komponen UI modular lengkap. |
| **11** | Frontend Admin | ⏳ Siap Dikerjakan | — | Dashboard, CRUD master data, live monitoring proctoring ujian peserta. |
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

### 4. Modul Users (CRUD ASN & Asesor)
- `UsersService.listUsers(params)`: Mendukung paginasi (`page`, `limit`), pencarian teks pada nama atau NIP, dan filter `role` serta `jenjang_jabatan`.
- `UsersService.getUserById(id)`: Mengambil detail satu pegawai (tanpa `password_hash`).
- `UsersService.createUser(data)`: Validasi keunikan NIP (mencegah duplikasi), auto-hash password Bcrypt, dan default role/jenjang.
- `UsersService.updateUser(id, data)`: Pembaruan fleksibel profil pegawai, jabatan, unit kerja, role, atau re-hashing password baru jika diubah.
- `UsersService.deleteUser(id)`: Penghapusan akun dengan proteksi anti self-deletion bagi Administrator yang sedang login.
- `usersRoute`: Seluruh endpoint diisolasi di bawah middleware `requireAdmin` (403 Forbidden bagi Peserta).

### 5. Modul Competency (9 Dimensi PermenPANRB)
- `CompetencyService.listCompetencies(filter)`: Mengambil 9 dimensi (8 Manajerial + 1 Sosio Kultural) terurut kode, dengan filter kategori `MANAJERIAL` atau `SOSIO_KULTURAL`.
- `CompetencyService.getCompetencyById(id)`: Mengambil detail satu dimensi kompetensi (404 jika ID tidak valid).
- `CompetencyService.updateCompetency(id, data)`: Mengizinkan pembaruan nama, deskripsi, dan `bobot_standar` oleh Asesor/Admin.
- `competencyRoute`: Endpoint baca (`GET`) dilindungi `requireAuth` (dapat diakses Admin dan Peserta), sedangkan mutasi (`PUT`) dilindungi `requireAdmin` (403 Forbidden bagi Peserta).

### 6. Modul Questions (Bank Soal SJT)
- `QuestionsService.listQuestions(params)`: Mengambil daftar soal dengan join dimensi kompetensi, 4 opsi pilihan, filter `competency_id`, `target_level`, dan pencarian teks `search`.
- `QuestionsService.getQuestionById(id)`: Mengambil detail satu butir soal SJT beserta 4 opsi jawaban.
- `QuestionsService.createQuestion(data)`: Validasi ketat aturan SJT PermenPANRB (wajib tepat 4 opsi dengan kombinasi bobot unik {1, 2, 3, 4}), membuat soal dan seluruh opsi secara relasional.
- `QuestionsService.updateQuestion(id, data)`: Pembaruan skenario kasus, target level jabatan, atau opsi pilihan jawaban.
- `QuestionsService.deleteQuestion(id)`: Penghapusan soal disertai pembersihan (*cascade delete*) opsi jawaban terkait.
- `questionsRoute`: Seluruh endpoint bank soal diproteksi khusus Administrator/Asesor (`requireAdmin`).

### 7. Modul Sessions (Sesi & Penjadwalan Asesmen)
- `SessionsService.listSessions(params)`: Mengambil daftar sesi asesmen terpaginasi beserta kalkulasi dinamis jumlah peserta terdaftar.
- `SessionsService.getSessionById(id)`: Mengambil detail sesi lengkap dengan profil peserta terdaftar.
- `SessionsService.createSession(data)`: Validasi keunikan `kode_sesi`, validasi rentang waktu (`waktu_selesai > waktu_mulai`), dan inisialisasi status `DRAFT`.
- `SessionsService.updateSession(id, data)`: Mengubah metadata jadwal atau memperbarui status siklus sesi (`DRAFT` → `BERJALAN` → `SELESAI`).
- `SessionsService.deleteSession(id)`: Menghapus sesi asesmen beserta *cascade delete* peserta dan jawaban terkait.
- `SessionsService.addParticipants(sessionId, userIds)`: Mendaftarkan ASN ke sesi tertentu dengan membuat `token_akses` unik (`ASN-XXXXXX`) dan mencegah duplikasi peserta.
- `SessionsService.verifyToken(userId, kodeSesi, tokenAkses)`: Memvalidasi hak akses peserta terhadap sesi yang berstatus `BERJALAN` sebagai gerbang masuk ujian.
- `SessionsService.getMySessions(userId)`: Mengambil daftar jadwal ujian yang diikuti oleh ASN yang sedang login.

### 8. Modul Exams (Core Engine & Proctoring)
- `ExamsService.startExam(userId, sessionId, tokenAkses)`: Memvalidasi sesi `BERJALAN` dan mencatat waktu mulai ujian per peserta, menghitung sisa waktu server, serta mengubah status peserta ke `SEDANG_MENGERJAKAN`.
- `ExamsService.getExamQuestions(userId, participantId)`: Mengambil bank butir soal dengan mengacak urutan butir dan opsi secara deterministik (*seeded shuffle*) per peserta, serta **merahasiakan atribut bobot nilai** (hanya ID, label, dan teks opsi yang dikirim ke klien).
- `ExamsService.saveAnswer(userId, participantId, data)`: Fitur autosave per klik yang memetakan jawaban peserta langsung ke bobot skor 1–4 di server dan menandai status ragu-ragu.
- `ExamsService.recordTabSwitch(userId, participantId)`: Engine proctoring yang mencatat dan menambah log pelanggaran perpindahan tab/jendela browser secara *real-time*.
- `ExamsService.getExamStatus(userId, participantId)`: Sinkronisasi waktu aktif server, menghitung sisa durasi pengerjaan, jumlah terjawab, dan status ragu-ragu.
- `ExamsService.submitExam(userId, participantId)`: Mengunci lembar jawaban, mengkalkulasi skor perolehan sementara, dan mengubah status peserta ke `SELESAI` (menolak pengiriman jawaban susulan).

### 9. Modul Reports (Kalkulasi JPM & Radar Chart)
- `ReportsService.calculateParticipantReport(participantId)`:
  - Mengambil seluruh jawaban peserta dan memetakan ke 9 dimensi kompetensi PermenPANRB 38/2017.
  - Menghitung perolehan skor per dimensi, standar kompetensi jabatan peserta, dan selisih (*gap analysis*).
  - Menghitung akumulasi skor total dan persentase **JPM (Jumlah Pemenuhan Standar)**:
    $$\text{Persentase JPM} = \frac{\sum \text{Skor Riil}}{\sum \text{Skor Standar}} \times 100\%$$
  - Mengkategorisasikan predikat kelulusan asesmen sesuai regulasi ASN:
    - **MS (Memenuhi Syarat)**: $\ge 80.0\%$
    - **MMS (Masih Memenuhi Syarat)**: $68.0\% - 79.9\%$
    - **KMS (Kurang Memenuhi Syarat)**: $< 68.0\%$
  - Menyiapkan format dataset siap konsumsi untuk komponen grafik radar (*Radar Chart data points*).
- `ReportsService.getSessionReport(sessionId)`:
  - Mengagregasi seluruh peserta dalam satu sesi asesmen: peringkat nilai, rata-rata nilai sesi, nilai tertinggi & terendah, serta statistik sebaran kategori kelulusan (jumlah & persentase peserta MS, MMS, dan KMS).
- `ReportsService.recalculateParticipantScore(participantId)`:
  - Memicu kalkulasi ulang berbasis jawaban tersimpan di database dan memperbarui kolom `total_nilai`, `persentase_jpm`, dan `status` secara atomik di tabel `session_participants`.
- `reportsRoute`:
  - `GET /api/reports/participant/:participantId`: Dilindungi `requireAuth`, dengan otorisasi mandiri (peserta hanya dapat melihat laporannya sendiri, admin dapat melihat semua peserta).
  - `GET /api/reports/session/:sessionId`: Dilindungi `requireAdmin` (403 Forbidden bagi peserta).
### 10. Frontend Setup & Design System (Portal Pemerintahan Modern)
- **Framework & Core Stack**: SvelteKit 3 / Svelte 5 (Runes `$state`, `$derived`, `$props`), TypeScript, Vite, Vanilla CSS Design System.
- **Design Tokens & Identitas Visual** ([design-tokens.css](file:///d:/Development/assessment/frontend/src/styles/design-tokens.css), [global.css](file:///d:/Development/assessment/frontend/src/styles/global.css)):
  - Palet warna resmi portal pemerintahan: *Deep Indonesian Royal Navy* (`#0a2540`), *Heritage Gold / Prestise Birokrasi* (`#c99738`), *Clean Bureaucracy Slate* (`#f8fafc`), dan warna semantik standar ASN (MS Emerald `#059669`, MMS Amber `#d97706`, KMS Crimson `#dc2626`).
  - Tipografi Google Fonts: `Plus Jakarta Sans` & `Inter`.
  - Micro-animations, subtle multi-layered elevations (`box-shadow`), glassmorphism, custom accessibility focus ring (`:focus-visible`).
- **Aksesibilitas (WCAG 2.1 Level AA)**:
  - 4 status visual wajib di setiap komponen: *Idle/Default*, *Loading/Pending* (dengan animated spinner), *Error/Validation* (`aria-invalid`), dan *Disabled*.
  - Keyboard navigation (ESC key handler pada Modal, focus trap, navigasi tab).
- **Komponen UI Modular** ([src/lib/components/ui/](file:///d:/Development/assessment/frontend/src/lib/components/ui)):
  - `Button.svelte`: Varian `primary`, `gold`, `secondary`, `outline`, `danger`, `ghost` dengan indikator loading spinner.
  - `Input.svelte`: Label, helper text, error message, ARIA describedby & invalid.
  - `Badge.svelte`: Varian semantik status kelulusan (`MS`, `MMS`, `KMS`, `ADMIN`, `PESERTA`) dengan status dot.
  - `Card.svelte`: Kontainer kartu berstruktur header, content body, dan footer.
  - `Alert.svelte`: Banner pemberitahuan sistem (`info`, `success`, `warning`, `error`).
  - `Modal.svelte`: Accessible dialog modal dengan backdrop blur dan ESC keyboard listener.
  - `Navbar.svelte`: Header portal resmi pemerintahan lengkap dengan lambang perisai/garuda emas, subtitle regulasi PermenPANRB, link navigasi dinamis berbasis role, profil NIP/jabatan pengguna, dan tombol keluar.
  - `RadarChart.svelte`: Komponen grafik radar berbasis SVG murni (tanpa dependensi eksternal) untuk memetakan capaian riil 9 dimensi kompetensi vs standar level jabatan, polygon transparan, node interaktif, dan kartu tooltip detail nilai & gap.
- **State Management & Networking**:
  - `auth.svelte.ts`: Reactive auth store Svelte 5 mengelola token JWT, identitas profil pengguna, state role (`isAdmin`, `isPeserta`), login, dan logout.
  - `client.ts`: Type-safe HTTP client dengan injeksi otomatis Authorization Bearer header, penanganan error jaringan, dan unwrap format `ApiResponse<T>`.
- **Halaman Aktif**:
  - `+page.svelte`: Landing page interaktif & showcase live design system tokens.
  - `login/+page.svelte`: Formulir autentikasi resmi dengan validasi, proteksi error, dan tombol akses cepat 1-klik untuk 4 akun demo ASN.

---

## Status Pengujian Otomatis (TDD Suite)

Semua pengujian berjalan menggunakan runner `bun test` dengan status **100% GREEN**:

```
tests/db/schema.test.ts          8 pass (58 expect calls)
tests/db/seed.test.ts            5 pass (88 expect calls)
tests/modules/auth/auth.test.ts  9 pass (27 expect calls)
tests/modules/users/users.test.ts 13 pass (49 expect calls)
tests/modules/competency/competency.test.ts 10 pass (32 expect calls)
tests/modules/questions/questions.test.ts 14 pass (44 expect calls)
tests/modules/sessions/sessions.test.ts 16 pass (53 expect calls)
tests/modules/exams/exams.test.ts 10 pass (384 expect calls)
tests/modules/reports/reports.test.ts 8 pass (99 expect calls)
---------------------------------------------------------
Total                            93 pass, 0 fail (834 assertions)
TypeScript Compilation           0 errors (Exit code 0)
```
