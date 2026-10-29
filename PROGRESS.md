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
| **11** | Frontend Admin | ✅ Selesai | — | Dashboard statistik, CRUD master data (pegawai & bank soal SJT), manajemen sesi & siklus, Live Proctoring tab-switch monitor, dan rekapitulasi JPM radar chart. |
| **12** | Frontend Peserta | ✅ Selesai | — | Portal peserta ujian ASN: dashboard jadwal sesi & input token akses, ruang ujian SJT fokus penuh dengan countdown timer & proctoring tab-switch counter, autosave real-time per respons, palet butir soal, dan laporan resmi JPM + visualisasi Spider Radar Chart 9 dimensi PermenPANRB 38/2017. |
| **13** | Integration Test End-to-End | ✅ Selesai | — | Pengujian siklus penuh asesmen ASN dari autentikasi admin/peserta, setup master data, verifikasi token akses, core engine autosave SJT, proctoring tab-switch counter, submit lembar jawaban, hingga laporan individual radar chart 9 dimensi dan rekapitulasi JPM sesi. |
| **14** | Kamus Kompetensi & Standar Level ASN | ✅ Selesai | — | Integrasi standar kompetensi jabatan PermenPANRB 38/2017: 4 tabel database baru (11 tabel fisik total), parser Excel mandiri (`Kamus_Kompetensi_ASN.xlsx`), seeder 14 jenjang & 126 pemetaan standar level, kalkulasi laporan dinamis berbasis standar jenjang sesi (Reports Service), dan REST API master jabatan & indikator perilaku. |
| **15** | Penyelarasan Frontend UI & Kamus ASN | ✅ Selesai | — | Penyesuaian skala Radar Chart & form Bank Soal (skala level 1–5 murni), integrasi 14 jenjang jabatan ASN pada master pegawai, modal penelusuran kamus indikator perilaku pada laporan individu peserta, serta penambahan halaman katalog Master Standar Jabatan & Kamus ASN (`/admin/standards`). |
| **16** | Model Token Sesi Kolektif (1 Sesi = 1 Token) | ✅ Selesai | — | Refaktor token ujian menjadi 1 token bersama per sesi (format 6 karakter kapital misal `TRG83K`), Banner Token Sesi Aktif di proctoring admin, fitur Salin Token, Refresh Token, Mode Proyektor Layar Penuh CAT, perapian menu navbar admin, dan modal input token peserta. |

---

## Rincian Teknis yang Telah Diimplementasikan

### 1. Database Relasional (MySQL via Drizzle ORM)
Database MySQL `ases_men` telah memiliki 11 tabel fisik (7 tabel inti + 4 tabel master Kamus ASN):
1. `users`: Menyimpan data akun Admin & ASN (NIP unik, password Bcrypt, role, jabatan, instansi, foreign key `jenjang_jabatan_id`).
2. `competencies`: 9 dimensi PermenPANRB (8 Manajerial + 1 Sosial Kultural).
3. `questions`: Skenario studi kasus birokrasi SJT dan target level jabatan (1-4).
4. `question_options`: Pilihan respon A, B, C, D dengan bobot nilai tepat 1 s.d. 4.
5. `assessment_sessions`: Sesi asesmen berbatas waktu dengan kode sesi unik, target jenjang foreign key `target_jenjang_id`, dan status siklus.
6. `session_participants`: Relasi peserta dengan sesi, token akses, catatan pelanggaran tab switch, total nilai, dan persentase JPM.
7. `participant_answers`: Catatan jawaban real-time (autosave), opsi terpilih, bobot nilai, dan status penandaan ragu-ragu.
8. `jenjang_jabatan`: 14 tingkatan hierarki jabatan ASN (JPT Utama, Madya, Pratama, Administrator, Pengawas, Pelaksana, JF Ahli Utama s.d. Pertama, JF Terampil).
9. `standar_kompetensi_jabatan`: Matriks pemetaan standar level (126 kombinasi = 14 jenjang $\times$ 9 kompetensi) sesuai Lampiran PermenPANRB 38/2017.
10. `competency_levels`: 45 deskripsi level kompetensi (9 kompetensi $\times$ level 1 s.d. 5).
11. `competency_indicators`: 135 butir indikator perilaku spesifik (3 indikator per level kompetensi).

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

### 11. Frontend Admin (Pusat Manajemen Asesmen & Live Proctoring)
- **Role Guard & Sub-Navigasi** ([admin/+layout.svelte](file:///d:/Development/assessment/frontend/src/routes/admin/+layout.svelte)):
  - Proteksi rute khusus pengguna ber-role `ADMIN`, redirect otomatis ke `/login` bila tidak memiliki wewenang.
  - Sub-navigasi terintegrasi: Dashboard, Sesi & Proctoring, Bank Soal SJT, Pegawai ASN, dan Rekapitulasi JPM.
- **Admin Dashboard** ([admin/dashboard/+page.svelte](file:///d:/Development/assessment/frontend/src/routes/admin/dashboard/+page.svelte)):
  - Statistik live: Total Pegawai Terdaftar, Sesi Berjalan, Bank Soal SJT, Total Jadwal Sesi.
  - Tabel pemantauan ringkas sesi aktif dan tombol aksi cepat (*Quick Actions*).
- **Manajemen Sesi & Siklus Ujian** ([admin/sessions/+page.svelte](file:///d:/Development/assessment/frontend/src/routes/admin/sessions/+page.svelte)):
  - CRUD sesi asesmen berbatas waktu, form modal buat sesi (kode unik, durasi, rentang waktu, target jenjang).
  - Modal sunting / edit sesi asesmen dengan proteksi siklus hidup:
    - `DRAFT`: Parameter bebas diedit secara penuh (judul, target jenjang, durasi, rentang jadwal).
    - `BERJALAN`: Kode sesi dan target jenjang dikunci (read-only) demi mencegah diskualifikasi paket soal peserta yang sedang mengerjakan; waktu mulai dikunci; waktu selesai dapat diperpanjang secara aman.
    - `SELESAI`: Arsip aman; hanya judul dan deskripsi catatan yang dapat diperbarui.
  - Kontrol siklus instan (`DRAFT` → `BERJALAN` → `SELESAI`).
- **Live Proctoring Monitoring** ([admin/sessions/[id]/+page.svelte](file:///d:/Development/assessment/frontend/src/routes/admin/sessions/%5Bid%5D/+page.svelte)):
  - Polling sinkronisasi status ujian setiap 5 detik saat sesi `BERJALAN`.
  - Pendaftaran peserta baru via modal pencarian pegawai ASN (mencegah duplikasi).
  - Indikator pelanggaran integritas (*tab switch violation counter*) dengan highlight visual dan kode token akses unik peserta.
- **Bank Soal SJT PermenPANRB** ([admin/questions/+page.svelte](file:///d:/Development/assessment/frontend/src/routes/admin/questions/+page.svelte)):
  - Filter 9 dimensi kompetensi & target level jabatan (1-4).
  - Modal pembuatan dan modal penyuntingan (*Ubah / Edit*) soal studi kasus dengan validasi ketat 4 opsi berbobot unik {1, 2, 3, 4} dan penandaan opsi bernilai optimal.
  - Sinkronisasi tampilan atribut `bobot_nilai` dan `skenario_kasus`.
- **Master Data Pegawai ASN** ([admin/users/+page.svelte](file:///d:/Development/assessment/frontend/src/routes/admin/users/+page.svelte)):
  - Pencarian NIP / nama, filter jenjang (Pelaksana, Pengawas, Administrator, JPT) dan role.
  - Form modal tambah pegawai baru dengan password hash aman.
- **Rekapitulasi JPM & Radar Chart Modal** ([admin/reports/+page.svelte](file:///d:/Development/assessment/frontend/src/routes/admin/reports/+page.svelte)):
  - Agregasi statistik sesi: rata-rata nilai, nilai tertinggi/terendah, dan sebaran persentase kelulusan (MS, MMS, KMS).
  - Leaderboard pemeringkatan nilai peserta.
  - Modal interaktif Radar Chart 9 dimensi individu peserta lengkap dengan tabel rincian gap capaian riil vs standar.
  - Fitur rekalkulasi nilai otomatis dari database per peserta.

### 12. Modul Frontend Peserta Asesmen ASN (PENTA+)
- **Layout & Guard Portal Peserta** ([participant/+layout.svelte](file:///d:/Development/assessment/frontend/src/routes/participant/+layout.svelte)):
  - Autentikasi guard untuk peserta ASN dengan sub-navbar identitas pegawai (NIP, Nama, Jenjang).
- **Dashboard Jadwal Asesmen** ([participant/dashboard/+page.svelte](file:///d:/Development/assessment/frontend/src/routes/participant/dashboard/+page.svelte)):
  - Kartu profil ringkas ASN dan banner tata tertib pengerjaan Situational Judgment Test (SJT).
  - Daftar penugasan sesi asesmen terintegrasi `GET /api/sessions/my-sessions`.
  - Modal verifikasi Token Akses unik (`POST /api/exams/start`) untuk memulai ujian berstatus aktif.
  - Tautan langsung "Lanjutkan Ujian" jika sedang dikerjakan, dan "Lihat Laporan" jika sudah submit.
- **Ruang Ujian SJT Real-Time Terawasi** ([participant/exam/[id]/+page.svelte](file:///d:/Development/assessment/frontend/src/routes/participant/exam/%5Bid%5D/+page.svelte)):
  - Header ujian sticky: info sesi, nama ASN, indikator counter pelanggaran proctoring, dan countdown timer format `HH:MM:SS` (peringatan merah pulsasi saat &lt; 10 menit).
  - Proctoring live anti-kecurangan via `visibilitychange` & `window.blur` terhubung ke `POST /api/exams/:participantId/tab-switch`.
  - Area Soal SJT: Skenario kasus kerja birokrasi pemerintahan, target level, dan 4 opsi pilihan perilaku (A, B, C, D) dengan bobot nilai tersembunyi total demi validitas psikometri.
  - Autosave real-time per pemilihan jawaban (`POST /api/exams/:participantId/answers`) dengan notifikasi visual instan.
  - Checkbox penandaan ragu-ragu (warna kuning) dan tombol navigasi soal.
  - Palet navigasi butir soal interaktif 1..N dengan status visual (terjawab, ragu-ragu, belum dijawab).
  - Modal konfirmasi submit akhir dengan rekapitulasi jumlah soal terjawab vs belum vs ragu-ragu, serta penguncian lembar jawaban (`POST /api/exams/:participantId/submit`).
- **Laporan Individual Hasil Asesmen & Radar Chart** ([participant/reports/[id]/+page.svelte](file:///d:/Development/assessment/frontend/src/routes/participant/reports/%5Bid%5D/+page.svelte)):
  - Format dokumen resmi standar BKPSDM Pemkab Trenggalek berbasis PermenPANRB No. 38 Tahun 2017.
  - Banner skor utama Indeks Job Person Match (JPM) % dan kategori rekomendasi (MS / MMS / KMS).
  - Visualisasi interaktif Spider Radar Chart 9 Dimensi (Pure SVG): perbandingan Standar SKJ vs Capaian Riil ASN.
  - Tabel rincian 9 dimensi dengan analisis gap (+/-) dan persentase pemenuhan.
  - Analisis dimensi kekuatan utama (*Strength*) dan prioritas rencana pengembangan (*Need Improvement*).
  - Tombol cetak / simpan PDF teroptimasi `@media print` lengkap dengan format tanda tangan pengesahan.

### 13. Modul Integration Test End-to-End (E2E)
- **Suite Pengujian Siklus Penuh Asesmen ASN** ([backend/tests/integration/e2e-assessment-lifecycle.test.ts](file:///d:/Development/assessment/backend/tests/integration/e2e-assessment-lifecycle.test.ts)):
  - **Fase 1 (Autentikasi Admin & Setup Master Data)**: Login JWT Administrator, validasi `/auth/me`, registrasi ASN baru (`POST /api/users`), cek 9 dimensi SKJ, dan pembuatan butir soal SJT baru dengan 4 opsi berbobot 1 s.d. 4.
  - **Fase 2 (Penjadwalan Sesi & Pendaftaran Peserta)**: Pembuatan sesi berstatus `DRAFT`, pendaftaran pegawai dengan auto-generate token akses unik (`ASN-XXXXXX`), pencegahan duplikasi pendaftaran (400), dan aktivasi sesi ke status `BERJALAN`.
  - **Fase 3 (Login Peserta & Verifikasi Token)**: Login ASN dengan NIP & password, pengecekan jadwal di `/my-sessions`, penolakan token salah (400/422), dan start ujian dengan token valid (`status: SEDANG_MENGERJAKAN`).
  - **Fase 4 (Core Engine SJT, Autosave & Proctoring)**: Pengambilan paket butir soal deterministik (verifikasi bobot nilai 1-4 tidak bocor ke klien), pengerjaan ujian per butir dengan autosave real-time, penandaan ragu-ragu, simulasi deteksi perpindahan tab browser (`POST /tab-switch`), dan sinkronisasi countdown timer.
  - **Fase 5 (Submit Ujian & Penguncian)**: Pengumpulan lembar jawaban (`status: SELESAI`, pencatatan waktu submit), dan proteksi penolakan modifikasi jawaban pasca-submit (400).
  - **Fase 6 (Laporan Individual & Radar Chart 9 Dimensi)**: Pengambilan laporan JPM % individu, klasifikasi kategori (MS / MMS / KMS), dataset radar chart 9 dimensi (skor, standar SKJ, gap, pemenuhan), dan proteksi isolasi data laporan antar peserta (403 Forbidden).
  - **Fase 7 (Rekapitulasi Sesi & Auto-Recalculate)**: Laporan sesi agregat bagi Administrator (statistik, distribusi kelulusan, dan leaderboard peringkat), eksekusi trigger rekalkulasi otomatis, dan penutupan sesi menjadi `SELESAI`.

### 14. Modul Kamus Kompetensi & Standar Level ASN (PermenPANRB 38/2017)
- **Skema Database Relasional** ([backend/src/db/schema.ts](file:///d:/Development/assessment/backend/src/db/schema.ts)):
  - 4 tabel baru: `jenjang_jabatan` (14 tingkatan), `standar_kompetensi_jabatan` (126 matriks pemetaan), `competency_levels` (45 deskripsi level 1-5), dan `competency_indicators` (135 butir indikator perilaku).
  - Migrasi relasi pengguna dan sesi dari kolom enum statis menjadi foreign key integer (`jenjang_jabatan_id` dan `target_jenjang_id`) dengan referensi eksplisit dan constraint aman.
- **Parser Excel Mandiri** ([backend/src/utils/excel-parser.ts](file:///d:/Development/assessment/backend/src/utils/excel-parser.ts)):
  - Ekstraksi format berkas `.xlsx` (`Kamus_Kompetensi_ASN.xlsx`) secara in-memory menggunakan `node:zlib` (inflate) dan XML regex stream parsing tanpa ketergantungan library pihak ketiga.
  - Membaca sheet *'Level per Jabatan'*, *'Kamus Kompetensi'*, *'Ringkasan Level'*, dan *'Definisi Kompetensi'*.
- **Database Seeder Kamus ASN** ([backend/src/db/seed.ts](file:///d:/Development/assessment/backend/src/db/seed.ts)):
  - Injeksi otomatis 14 jenjang jabatan ASN beserta level standar umum.
  - Injeksi 126 standar kompetensi jabatan termasuk *edge cases* regulasi PermenPANRB No. 38 Tahun 2017:
    - **JF Ahli Utama**: Integritas (`KOMP-01`) & Perekat Bangsa (`KOMP-09`) level 5, 7 dimensi lainnya level 4.
    - **JF Terampil**: Integritas, Kerjasama & Perekat Bangsa level 2, 6 dimensi lainnya level 1.
  - Injeksi 45 deskripsi level kompetensi dan 135 butir indikator perilaku.
  - Idempotent dan teroptimasi batch insert berkecepatan tinggi (< 30ms).
- **Penilaian Berbasis Standar Jenjang Sesi** ([backend/src/modules/reports/reports.service.ts](file:///d:/Development/assessment/backend/src/modules/reports/reports.service.ts)):
  - Kalkulasi laporan individual mengambil standar level dinamis dari tabel `standar_kompetensi_jabatan` berdasarkan `target_jenjang_id` pada sesi asesmen yang diikuti peserta.
  - Mendukung fallback aman ke level standar 3.0 jika sesi tidak menentukan jenjang jabatan.
  - Menghitung gap analisis per dimensi dan kalkulasi persentase JPM riil terhadap standar jenjang jabatan target.
- **REST API Master Jabatan & Indikator** ([backend/src/modules/jabatan/](file:///d:/Development/assessment/backend/src/modules/jabatan)):
  - `GET /api/jabatan`: Mengambil daftar 14 tingkatan jabatan ASN.
  - `GET /api/jabatan/:id`: Mengambil informasi detail satu jenjang jabatan.
  - `GET /api/jabatan/:id/standards`: Mengambil matriks 9 standar kompetensi jabatan untuk jenjang yang dipilih.
  - `GET /api/competencies/:id/indicators`: Mengambil kamus 15 butir indikator perilaku per level 1-5 untuk dimensi kompetensi tertentu.
  - Pembaruan validasi skema Elysia pada `POST /api/sessions` (`target_jenjang_id`) dan `POST /api/users` (`jenjang_jabatan_id`).

### 15. Penyelarasan Frontend UI & Kamus ASN PermenPANRB No. 38 Tahun 2017
- **Skala Radar Chart & Bank Soal SJT** ([frontend/src/lib/components/ui/RadarChart.svelte](file:///d:/Development/assessment/frontend/src/lib/components/ui/RadarChart.svelte), [admin/questions](file:///d:/Development/assessment/frontend/src/routes/admin/questions/+page.svelte)):
  - Komponen SVG Radar Chart disesuaikan dengan prop `maxLevel = 5` default tanpa clipping polygon pada level 5.
  - Dropdown filter, modal create, dan modal edit butir soal SJT diperluas mengakomodasi level 1 s.d. 5 dengan penamaan ringkas murni: **Level 1**, **Level 2**, **Level 3**, **Level 4**, **Level 5** tanpa label deskriptif tambahan.
- **Integrasi 14 Jenjang Jabatan ASN pada Master Pegawai** ([admin/users](file:///d:/Development/assessment/frontend/src/routes/admin/users/+page.svelte)):
  - Menggantikan 4 pilihan enum statis dengan 14 tingkatan jenjang jabatan ASN riil (JPT Utama/Madya/Pratama, Administrator, Pengawas, Pelaksana, JF Keahlian Utama/Madya/Muda/Pertama, JF Keterampilan Penyelia/Mahir/Terampil/Pemula) yang dikelompokkan secara rapi dengan `<optgroup>`.
  - Filter dan modal tambah pegawai terhubung ke backend `jenjang_jabatan_id` dengan label nama jenjang ramah pengguna pada tabel.
- **Kamus Indikator Perilaku pada Laporan Individu Peserta** ([participant/reports/[id]](file:///d:/Development/assessment/frontend/src/routes/participant/reports/%5Bid%5D/+page.svelte)):
  - Menambahkan drawer/modal interaktif yang mengonsumsi endpoint `GET /api/competencies/:id/indicators`.
  - Menampilkan deskripsi kompetensi, perbandingan skor capaian vs standar level, gap analisis, serta butir indikator perilaku konkret level 1–5 dengan penanda visual khusus (*highlight*) pada target level standar jabatan.
  - Rekomendasi pengembangan (Area Prioritas / *Need Improvement*) dilengkapi tombol langsung untuk menginspeksi indikator perilaku target yang dipersyaratkan.
- **Halaman Katalog Master Standar Jabatan & Kamus ASN** ([admin/standards](file:///d:/Development/assessment/frontend/src/routes/admin/standards/+page.svelte)):
  - Rute baru `/admin/standards` yang terintegrasi pada menu navigasi layout Admin.
  - Tab 1: **Matriks Standar Level** interaktif (14 jenjang $\times$ 9 dimensi kompetensi PermenPANRB) dengan filter kelompok jabatan dan panel inspeksi rincian standar.
  - Tab 2: **Kamus Indikator Perilaku** yang menampilkan hierarki 9 dimensi $\times$ 5 level $\times$ 3 butir indikator perilaku per level secara terstruktur.

### 15. Refaktor Model Token Sesi Kolektif (Tahap 16)
- **1 Token per Sesi Asesmen**:
  - Kolom `token_sesi` (`varchar(20)`) ditambahkan ke tabel `assessment_sessions`.
  - Generator token alfanumerik kapital 6 karakter (misal `TRG83K`) otomatis dibuat saat sesi dibentuk dan diaktifkan.
  - Endpoint `POST /api/sessions/:id/refresh-token` memungkinkan Asesor mengganti token kapan saja jika diperlukan.
  - Verifikasi token ujian (`verifyToken` dan `startExam`) memvalidasi `token_sesi` kolektif dengan tetap mempertahankan validasi otorisasi bahwa pegawai terdaftar pada sesi tersebut.
- **Pembersihan Navigasi Admin & Active State Tab**:
  - Menghilangkan link menu ganda pada navbar atas di rute `/admin/*` sehingga panel administrator menjadi satu-satunya pusat navigasi admin.
  - Visual active state yang jelas (.is-active dengan latar deep navy dan aksen gold) pada tab yang sedang aktif.
- **Banner Proctoring & Mode Proyektor Layar Penuh CAT**:
  - Banner Token Sesi Aktif di halaman detail sesi admin dengan tombol **Salin Token**, **Refresh Token**, dan **Mode Proyektor Layar Penuh**.
  - Modal overlay layar penuh bergaya proyektor ruangan CAT dengan jam digital real-time dan teks token berukuran besar untuk diproyeksikan ke dinding/layar ruang ujian.
  - Dashboard peserta diperbarui memandu pengisian token sesi dari pengawas ruangan.

---

## Status Pengujian Otomatis (TDD Suite)

Semua pengujian berjalan menggunakan runner `bun test` dengan status **100% GREEN**:

```
tests/db/schema.test.ts                              12 pass (82 expect calls)
tests/db/seed.test.ts                                 8 pass (133 expect calls)
tests/utils/excel-parser.test.ts                      5 pass (11 expect calls)
tests/modules/auth/auth.test.ts                       9 pass (27 expect calls)
tests/modules/users/users.test.ts                    13 pass (49 expect calls)
tests/modules/competency/competency.test.ts          10 pass (32 expect calls)
tests/modules/questions/questions.test.ts            14 pass (44 expect calls)
tests/modules/sessions/sessions.test.ts              18 pass (59 expect calls)
tests/modules/exams/exams.test.ts                    10 pass (384 expect calls)
tests/modules/reports/reports.test.ts                 8 pass (99 expect calls)
tests/modules/reports/reports-standar-jabatan.test.ts 3 pass (4 expect calls)
tests/modules/jabatan/jabatan.test.ts                11 pass (45 expect calls)
tests/integration/e2e-assessment-lifecycle.test.ts   24 pass (351 expect calls)
---------------------------------------------------------------------------------
Total                                               145 pass, 0 fail (1515 assertions)
TypeScript / Svelte Compilation                       0 errors, 0 warnings (Exit code 0)
```
