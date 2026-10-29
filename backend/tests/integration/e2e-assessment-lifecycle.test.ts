import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Elysia } from "elysia";
import { authPlugin } from "../../src/modules/auth/auth.guard";
import { authRoute } from "../../src/modules/auth/auth.route";
import { usersRoute } from "../../src/modules/users/users.route";
import { competencyRoute } from "../../src/modules/competency/competency.route";
import { questionsRoute } from "../../src/modules/questions/questions.route";
import { sessionsRoute } from "../../src/modules/sessions/sessions.route";
import { examsRoute } from "../../src/modules/exams/exams.route";
import { reportsRoute } from "../../src/modules/reports/reports.route";
import { seedDatabase } from "../../src/db/seed";
import { db } from "../../src/db/connection";
import {
  users,
  assessmentSessions,
  sessionParticipants,
  participantAnswers,
  questions,
  questionOptions,
} from "../../src/db/schema";
import { eq, and } from "drizzle-orm";

const TEST_SESSION_CODE = "SESI-E2E-FULL-LIFECYCLE";
const TEST_PESERTA_NIP = "199708172021021005";
const TEST_QUESTION_CODE = "E2E-SJT-001";

async function cleanupE2EData() {
  // 1. Hapus jawaban pengerjaan dan peserta pada sesi test
  const testSessions = await db
    .select({ id: assessmentSessions.id })
    .from(assessmentSessions)
    .where(eq(assessmentSessions.kode_sesi, TEST_SESSION_CODE));

  for (const s of testSessions) {
    const parts = await db
      .select({ id: sessionParticipants.id })
      .from(sessionParticipants)
      .where(eq(sessionParticipants.session_id, s.id));

    for (const p of parts) {
      await db
        .delete(participantAnswers)
        .where(eq(participantAnswers.session_participant_id, p.id));
    }

    await db
      .delete(sessionParticipants)
      .where(eq(sessionParticipants.session_id, s.id));
    await db.delete(assessmentSessions).where(eq(assessmentSessions.id, s.id));
  }

  // 2. Hapus soal uji jika ada
  const testQuestions = await db
    .select({ id: questions.id })
    .from(questions)
    .where(eq(questions.kode_soal, TEST_QUESTION_CODE));

  for (const q of testQuestions) {
    await db.delete(questionOptions).where(eq(questionOptions.question_id, q.id));
    await db.delete(questions).where(eq(questions.id, q.id));
  }

  // 3. Hapus user test jika ada
  await db.delete(users).where(eq(users.nip, TEST_PESERTA_NIP));
}

describe("End-to-End Integration Test: Siklus Lengkap Asesmen ASN (PENTA+) — Tahap 13", () => {
  let app: any;
  let adminToken: string;
  let createdUserId: number;
  let createdQuestionId: number;
  let createdSessionId: number;
  let participantId: number;
  let tokenAksesPeserta: string;
  let pesertaToken: string;

  beforeAll(async () => {
    // Bersihkan data dan pastikan database dalam kondisi seeded
    await cleanupE2EData();
    await seedDatabase();

    // Inisialisasi seluruh router modul di bawah group /api
    app = new Elysia({ prefix: "/api" })
      .use(authPlugin)
      .use(authRoute)
      .use(usersRoute)
      .use(competencyRoute)
      .use(questionsRoute)
      .use(sessionsRoute)
      .use(examsRoute)
      .use(reportsRoute);
  });

  afterAll(async () => {
    await cleanupE2EData();
  });

  // =========================================================================
  // FASE 1: Autentikasi Admin & Setup Master Data
  // =========================================================================
  describe("Fase 1: Autentikasi Administrator & Setup Master Data", () => {
    it("1.1 Administrator berhasil login dan mendapatkan JWT token valid", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nip: "198501012010011001",
            password: "password123",
          }),
        })
      );

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.token).toBeDefined();
      expect(json.user.role).toBe("ADMIN");
      adminToken = json.token;
    });

    it("1.2 Administrator memverifikasi sesi aktif via GET /api/auth/me", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/me", {
          method: "GET",
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.user.nip).toBe("198501012010011001");
    });

    it("1.3 Administrator mendaftarkan Pegawai ASN baru untuk asesmen", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nip: TEST_PESERTA_NIP,
            nama: "Ahmad Fauzi, S.Kom.",
            password: "password123",
            role: "PESERTA",
            jabatan: "Pranata Komputer Ahli Pertama",
            instansi: "Pemerintah Kabupaten Trenggalek",
            unit_kerja: "Dinas Komunikasi dan Informatika",
            jenjang_jabatan: "PELAKSANA",
          }),
        })
      );

      expect(res.status).toBe(201);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.nip).toBe(TEST_PESERTA_NIP);
      expect(json.data.password_hash).toBeUndefined(); // Proteksi keamanan
      createdUserId = json.data.id;
    });

    it("1.4 Administrator memeriksa 9 Dimensi Kompetensi PermenPANRB No. 38 Tahun 2017", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/competencies", {
          method: "GET",
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(9); // Tepat 9 Dimensi (8 Manajerial + 1 Sosio Kultural)
    });

    it("1.5 Administrator menambahkan butir soal SJT baru dengan 4 opsi berbobot 1-4", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/questions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            competency_id: 1, // Integritas
            kode_soal: TEST_QUESTION_CODE,
            skenario_kasus:
              "Anda mengetahui adanya rekan kerja satu tim yang memanipulasi presensi kehadiran fingerprint secara berulang demi tunjangan kinerja penuh. Sikap profesional Anda adalah...",
            target_level: 2,
            options: [
              {
                label: "A",
                teks_opsi: "Membiarkan karena merasa itu bukan wewenang Anda menegur rekan sebaya.",
                bobot_nilai: 1,
              },
              {
                label: "B",
                teks_opsi: "Menceritakan perilaku rekan tersebut kepada pegawai lain di ruang istirahat.",
                bobot_nilai: 2,
              },
              {
                label: "C",
                teks_opsi: "Menegur rekan tersebut secara pribadi agar tidak mengulangi tindakannya.",
                bobot_nilai: 3,
              },
              {
                label: "D",
                teks_opsi:
                  "Mengingatkan rekan terkait dan melaporkan pelanggaran disiplin sesuai prosedur whistleblowing kepada atasan langsung.",
                bobot_nilai: 4,
              },
            ],
          }),
        })
      );

      expect(res.status).toBe(201);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.kode_soal).toBe(TEST_QUESTION_CODE);
      expect(json.data.options.length).toBe(4);
      createdQuestionId = json.data.id;
    });
  });

  // =========================================================================
  // FASE 2: Penjadwalan Sesi & Pendaftaran Peserta
  // =========================================================================
  describe("Fase 2: Penjadwalan Sesi & Pendaftaran Peserta ASN", () => {
    it("2.1 Administrator membuat sesi asesmen baru dengan status awal DRAFT", async () => {
      const sekarang = new Date();
      const besok = new Date(sekarang.getTime() + 24 * 60 * 60 * 1000);

      const res = await app.handle(
        new Request("http://localhost/api/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            kode_sesi: TEST_SESSION_CODE,
            judul: "Uji Kompetensi Jabatan Pelaksana Diskominfo 2026",
            deskripsi: "Sesi penilaian kompetensi manajerial berbasis Situational Judgment Test.",
            waktu_mulai: sekarang.toISOString(),
            waktu_selesai: besok.toISOString(),
            durasi_menit: 90,
            target_jenjang: "PELAKSANA",
          }),
        })
      );

      expect(res.status).toBe(201);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("DRAFT");
      createdSessionId = json.data.id;
      if (json.data.token_sesi) {
        tokenAksesPeserta = json.data.token_sesi;
      }
    });

    it("2.2 Administrator mendaftarkan ASN ke dalam sesi", async () => {
      const res = await app.handle(
        new Request(
          `http://localhost/api/sessions/${createdSessionId}/participants`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({
              user_ids: [createdUserId],
            }),
          }
        )
      );

      expect(res.status).toBe(201);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data[0].status).toBe("TERDAFTAR");

      participantId = json.data[0].id;
    });

    it("2.3 Sistem menolak duplikasi pendaftaran pegawai yang sama pada satu sesi (400)", async () => {
      const res = await app.handle(
        new Request(
          `http://localhost/api/sessions/${createdSessionId}/participants`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({
              user_ids: [createdUserId],
            }),
          }
        )
      );

      expect(res.status).toBe(400);
      const json: any = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain("sudah terdaftar");
    });

    it("2.4 Administrator mengaktifkan status sesi menjadi BERJALAN", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/sessions/${createdSessionId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            status: "BERJALAN",
          }),
        })
      );

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("BERJALAN");
      if (json.data.token_sesi) {
        tokenAksesPeserta = json.data.token_sesi;
      }
    });
  });

  // =========================================================================
  // FASE 3: Login Peserta & Verifikasi Token Ujian
  // =========================================================================
  describe("Fase 3: Login Peserta & Verifikasi Token Akses", () => {
    it("3.1 Peserta ASN login ke portal asesmen dengan NIP dan password", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nip: TEST_PESERTA_NIP,
            password: "password123",
          }),
        })
      );

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.token).toBeDefined();
      expect(json.user.role).toBe("PESERTA");
      pesertaToken = json.token;
    });

    it("3.2 Peserta melihat sesi yang ditugaskan melalui GET /api/sessions/my-sessions", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/sessions/my-sessions", {
          method: "GET",
          headers: { Authorization: `Bearer ${pesertaToken}` },
        })
      );

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);

      const mySession = json.data.find(
        (s: any) => s.session_id === createdSessionId
      );
      expect(mySession).toBeDefined();
      expect(mySession.status_sesi).toBe("BERJALAN");
      expect(mySession.status_peserta).toBe("TERDAFTAR");
    });

    it("3.3 Sistem menolak jika token akses yang dimasukkan salah", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/exams/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${pesertaToken}`,
          },
          body: JSON.stringify({
            session_id: createdSessionId,
            token_akses: "ASN-SALAH99",
          }),
        })
      );

      expect(res.status).toBe(400);
      const json: any = await res.json();
      expect(json.success).toBe(false);
    });

    it("3.4 Peserta berhasil memulai ujian dengan token akses yang benar", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/exams/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${pesertaToken}`,
          },
          body: JSON.stringify({
            session_id: createdSessionId,
            token_akses: tokenAksesPeserta,
          }),
        })
      );

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("SEDANG_MENGERJAKAN");
      expect(json.data.sisa_waktu_detik).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // FASE 4: Core Engine Ujian SJT (Autosave, Ragu-ragu & Proctoring)
  // =========================================================================
  describe("Fase 4: Core Engine Ujian SJT (Autosave, Ragu-ragu & Proctoring)", () => {
    let examQuestions: any[] = [];

    it("4.1 Peserta mengambil paket soal & memverifikasi bobot nilai disembunyikan", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/exams/${participantId}/questions`, {
          method: "GET",
          headers: { Authorization: `Bearer ${pesertaToken}` },
        })
      );

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);

      examQuestions = json.data;

      // Uji keamanan psikometri: Bobot nilai 1-4 TIDAK boleh bocor di paket soal
      for (const q of examQuestions) {
        expect(q.options.length).toBe(4);
        for (const opt of q.options) {
          expect(opt.bobot_nilai).toBeUndefined();
        }
      }
    });

    it("4.2 Peserta menjawab seluruh soal secara real-time dengan autosave", async () => {
      // Jawab setiap soal dengan memilih opsi berbobot tinggi/sedang
      for (let i = 0; i < examQuestions.length; i++) {
        const q = examQuestions[i];
        // Pilih opsi terakhir (yang memiliki bobot optimal pada seed/data kita)
        const selectedOption = q.options[q.options.length - 1];

        const res = await app.handle(
          new Request(`http://localhost/api/exams/${participantId}/answers`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${pesertaToken}`,
            },
            body: JSON.stringify({
              question_id: q.id,
              selected_option_id: selectedOption.id,
              is_ragu: i === 0, // Tandai nomor 1 sebagai ragu-ragu
            }),
          })
        );

        expect(res.status).toBe(200);
        const json: any = await res.json();
        expect(json.success).toBe(true);
      }
    }, 15000);

    it("4.3 Proctoring mendeteksi dan mencatat pelanggaran tab-switch secara real-time", async () => {
      // Simulasi peserta berpindah tab browser 2 kali
      for (let i = 1; i <= 2; i++) {
        const res = await app.handle(
          new Request(`http://localhost/api/exams/${participantId}/tab-switch`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${pesertaToken}`,
            },
            body: JSON.stringify({}),
          })
        );

        expect(res.status).toBe(200);
        const json: any = await res.json();
        expect(json.success).toBe(true);
        expect(json.tab_switch_count).toBe(i);
        expect(json.warning).toBeDefined();
      }
    });

    it("4.4 Peserta memeriksa status sisa timer & catatan proctoring", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/exams/${participantId}/status`, {
          method: "GET",
          headers: { Authorization: `Bearer ${pesertaToken}` },
        })
      );

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("SEDANG_MENGERJAKAN");
      expect(json.data.tab_switch_count).toBe(2);
      expect(json.data.sisa_waktu_detik).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // FASE 5: Submit Ujian & Penguncian Lembar Jawaban
  // =========================================================================
  describe("Fase 5: Submit Ujian & Penguncian Lembar Jawaban", () => {
    it("5.1 Peserta mengumpulkan lembar jawaban & ujian berhasil diselesaikan", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/exams/${participantId}/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${pesertaToken}`,
          },
          body: JSON.stringify({}),
        })
      );

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("SELESAI");
      expect(json.data.waktu_submit).toBeDefined();
    });

    it("5.2 Peserta ditolak saat mencoba mengubah jawaban setelah submit dikunci (400)", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/exams/${participantId}/answers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${pesertaToken}`,
          },
          body: JSON.stringify({
            question_id: createdQuestionId,
            selected_option_id: 1,
          }),
        })
      );

      expect(res.status).toBe(400);
      const json: any = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain("sudah diselesaikan");
    });
  });

  // =========================================================================
  // FASE 6: Laporan Individual Hasil Asesmen & Radar Chart 9 Dimensi
  // =========================================================================
  describe("Fase 6: Laporan Individual Hasil Asesmen & Visualisasi Radar Chart", () => {
    it("6.1 Peserta dapat melihat laporan hasil asesmen miliknya secara lengkap", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/reports/participant/${participantId}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${pesertaToken}` },
        })
      );

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);

      // Verifikasi Identitas Peserta
      expect(json.data.participant.nip).toBe(TEST_PESERTA_NIP);
      expect(json.data.participant.status).toBe("SELESAI");
      expect(json.data.participant.tab_switch_count).toBe(2); // Rekam jejak tab-switch tercatat

      // Verifikasi Skor JPM & Kategori Kelulusan
      expect(Number(json.data.jpm_percentage)).toBeGreaterThan(0);
      expect(["MS", "MMS", "KMS"]).toContain(json.data.kategori_kelulusan);

      // Verifikasi Visualisasi Radar Chart 9 Dimensi
      const radar = json.data.radar;
      expect(radar.length).toBe(9); // Wajib memuat tepat 9 Dimensi
      for (const item of radar) {
        expect(item.kode).toBeDefined();
        expect(item.nama).toBeDefined();
        expect(item.skor).toBeGreaterThanOrEqual(0);
        expect(item.standar).toBeGreaterThan(0);
        expect(item.gap).toBeDefined();
        expect(item.persentase_pemenuhan).toBeGreaterThanOrEqual(0);
      }
    });

    it("6.2 Peserta lain dilarang melihat laporan peserta ini (403 Forbidden)", async () => {
      // Login sebagai peserta demo lain
      const otherLoginRes = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nip: "199505122020121002",
            password: "password123",
          }),
        })
      );
      const otherJson: any = await otherLoginRes.json();
      const otherToken = otherJson.token;

      // Coba akses laporan milik TEST_PESERTA_NIP
      const res = await app.handle(
        new Request(`http://localhost/api/reports/participant/${participantId}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${otherToken}` },
        })
      );

      expect(res.status).toBe(403);
      const json: any = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain("Akses ditolak");
    });
  });

  // =========================================================================
  // FASE 7: Rekapitulasi Sesi & Auto-Recalculate oleh Admin
  // =========================================================================
  describe("Fase 7: Rekapitulasi Sesi & Rekalkulasi oleh Administrator", () => {
    it("7.1 Administrator melihat rekapitulasi nilai sesi dan leaderboard", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/reports/session/${createdSessionId}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.session.id).toBe(createdSessionId);
      expect(json.data.summary.total_peserta).toBe(1);
      expect(json.data.summary.total_selesai).toBe(1);
      expect(json.data.participants.length).toBe(1);
      expect(json.data.participants[0].nip).toBe(TEST_PESERTA_NIP);
    });

    it("7.2 Administrator dapat memicu rekalkulasi nilai dan update record database", async () => {
      const res = await app.handle(
        new Request(
          `http://localhost/api/reports/participant/${participantId}/recalculate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({}),
          }
        )
      );

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain("Kalkulasi ulang nilai JPM berhasil");
    });

    it("7.3 Administrator menutup sesi asesmen menjadi SELESAI", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/sessions/${createdSessionId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            status: "SELESAI",
          }),
        })
      );

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("SELESAI");
    });
  });
});
