import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Elysia } from "elysia";
import { authRoute } from "../../../src/modules/auth/auth.route";
import { authPlugin } from "../../../src/modules/auth/auth.guard";
import { sessionsRoute } from "../../../src/modules/sessions/sessions.route";
import { examsRoute } from "../../../src/modules/exams/exams.route";
import { reportsRoute } from "../../../src/modules/reports/reports.route";
import { seedDatabase } from "../../../src/db/seed";
import { db } from "../../../src/db/connection";
import {
  assessmentSessions,
  sessionParticipants,
  participantAnswers,
  questions,
  questionOptions,
  competencies,
} from "../../../src/db/schema";
import { eq, inArray } from "drizzle-orm";

const TEST_KODE_SESI = "SESI-REPORT-TEST";

async function cleanupTestReports() {
  const foundSessions = await db
    .select({ id: assessmentSessions.id })
    .from(assessmentSessions)
    .where(eq(assessmentSessions.kode_sesi, TEST_KODE_SESI));

  for (const s of foundSessions) {
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
}

describe("Modul Reports (Kalkulasi JPM & Radar Chart) — TDD Tahap 9", () => {
  let app: any;
  let adminToken: string;
  let pesertaToken: string;
  let pesertaUser: any;
  let sessionId: number;
  let participantId: number;

  beforeAll(async () => {
    // 1. Bersihkan sisa data test & seed demo database
    await cleanupTestReports();
    await seedDatabase();

    // 2. Setup server aplikasi uji dengan reportsRoute
    app = new Elysia({ prefix: "/api" })
      .use(authPlugin)
      .use(authRoute)
      .use(sessionsRoute)
      .use(examsRoute)
      .use(reportsRoute);

    // 3. Login Admin
    const adminLoginRes = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nip: "198501012010011001",
          password: "password123",
        }),
      })
    );
    const adminJson = (await adminLoginRes.json()) as any;
    adminToken = adminJson.token;

    // 4. Login Peserta ASN (Ahmad Pratama)
    const pesertaLoginRes = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nip: "199505122020121002",
          password: "password123",
        }),
      })
    );
    const pesertaJson = (await pesertaLoginRes.json()) as any;
    pesertaToken = pesertaJson.token;
    pesertaUser = pesertaJson.user;

    // 5. Admin membuat sesi & mendaftarkan peserta
    const now = new Date();
    const createSessionRes = await app.handle(
      new Request("http://localhost/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          judul: "Uji Kompetensi Pelaksana (Report Sesi)",
          kode_sesi: TEST_KODE_SESI,
          waktu_mulai: now.toISOString(),
          waktu_selesai: new Date(now.getTime() + 120 * 60 * 1000).toISOString(),
          durasi_menit: 90,
          target_jenjang: "PELAKSANA",
        }),
      })
    );
    const sessionJson = (await createSessionRes.json()) as any;
    sessionId = sessionJson.data.id;

    // Ubah status sesi ke BERJALAN
    await app.handle(
      new Request(`http://localhost/api/sessions/${sessionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: "BERJALAN" }),
      })
    );

    // Daftarkan peserta
    const regRes = await app.handle(
      new Request(`http://localhost/api/sessions/${sessionId}/participants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ user_ids: [pesertaUser.id] }),
      })
    );
    const regJson = (await regRes.json()) as any;
    participantId = regJson.data[0].id;
    const tokenAkses = regJson.data[0].token_akses;

    // 6. Peserta memulai ujian
    await app.handle(
      new Request("http://localhost/api/exams/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pesertaToken}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          token_akses: tokenAkses,
        }),
      })
    );

    // 7. Simulasikan pengerjaan soal: jawab semua 18 soal dengan opsi bernilai 4 (skor maksimal)
    const allQuestions = await db.select().from(questions);
    for (const q of allQuestions) {
      // Ambil opsi yang memiliki bobot tertinggi (4)
      const options = await db
        .select()
        .from(questionOptions)
        .where(eq(questionOptions.question_id, q.id));

      const bestOption = options.find((o) => o.bobot_nilai === 4) || options[0]!;

      await app.handle(
        new Request(`http://localhost/api/exams/${participantId}/answers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${pesertaToken}`,
          },
          body: JSON.stringify({
            question_id: q.id,
            selected_option_id: bestOption.id,
          }),
        })
      );
    }

    // 8. Submit final ujian
    await app.handle(
      new Request(`http://localhost/api/exams/${participantId}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${pesertaToken}` },
      })
    );
  }, 30000);

  afterAll(async () => {
    await cleanupTestReports();
  });

  describe("Akses & Role Guard (/api/reports)", () => {
    it("harus menolak request tanpa token dengan 401", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/reports/participant/${participantId}`)
      );
      expect(res.status).toBe(401);
    });

    it("Peserta tidak boleh mengakses rekapitulasi sesi keseluruhan (403 Forbidden)", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/reports/session/${sessionId}`, {
          headers: { Authorization: `Bearer ${pesertaToken}` },
        })
      );
      expect(res.status).toBe(403);
    });

    it("Admin diizinkan mengakses rekapitulasi sesi keseluruhan (200 OK)", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/reports/session/${sessionId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.session.id).toBe(sessionId);
    });
  });

  describe("GET /api/reports/participant/:participantId (Laporan Individu & Radar Chart)", () => {
    it("harus mengembalikan laporan lengkap individu dengan nilai JPM, kategori MS, dan 9 dimensi", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/reports/participant/${participantId}`, {
          headers: { Authorization: `Bearer ${pesertaToken}` },
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);

      const report = json.data;
      expect(report.participant.id).toBe(participantId);
      expect(report.participant.nip).toBe(pesertaUser.nip);
      expect(report.participant.status).toBe("SELESAI");

      // Verifikasi kalkulasi JPM dan kategori kelulusan
      // Karena semua dijawab opsi bobot 4, skor = 4.00, standar = 3.00, JPM = (4 / 3) * 100 > 100% -> Kategori MS
      expect(Number(report.jpm_percentage)).toBeGreaterThanOrEqual(80);
      expect(report.kategori_kelulusan).toBe("MS");
      expect(report.kategori_label).toBe("Memenuhi Syarat");

      // Verifikasi data 9 dimensi untuk Radar Chart
      expect(Array.isArray(report.radar)).toBe(true);
      expect(report.radar.length).toBe(9);

      for (const item of report.radar) {
        expect(item.kode).toBeDefined();
        expect(item.nama).toBeDefined();
        expect(item.kategori).toBeDefined();
        expect(item.skor).toBeDefined();
        expect(item.standar).toBeDefined();
        expect(item.gap).toBeDefined();
        expect(item.persentase_pemenuhan).toBeDefined();
      }
    });

    it("harus menolak peserta lain yang mencoba mengintip laporan (403 Forbidden)", async () => {
      // Login peserta lain (Siti Rahmawati - Eselon IV)
      const otherLoginRes = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nip: "198808172014032003",
            password: "password123",
          }),
        })
      );
      const otherToken = ((await otherLoginRes.json()) as any).token;

      const res = await app.handle(
        new Request(`http://localhost/api/reports/participant/${participantId}`, {
          headers: { Authorization: `Bearer ${otherToken}` },
        })
      );
      expect(res.status).toBe(403);
    });

    it("Admin diizinkan melihat laporan individu peserta manapun", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/reports/participant/${participantId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.participant.id).toBe(participantId);
    });
  });

  describe("GET /api/reports/session/:sessionId (Rekapitulasi Nilai Sesi Asesmen)", () => {
    it("harus mengembalikan statistik sesi, daftar peringkat, dan sebaran kategori kelulusan", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/reports/session/${sessionId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);

      const data = json.data;
      expect(data.session.id).toBe(sessionId);
      expect(data.summary.total_peserta).toBeGreaterThanOrEqual(1);
      expect(data.summary.total_selesai).toBeGreaterThanOrEqual(1);
      expect(data.summary.rata_rata_jpm).toBeDefined();
      expect(data.summary.distribusi_kelulusan.MS).toBeGreaterThanOrEqual(1);

      // Verifikasi daftar peringkat peserta
      expect(Array.isArray(data.participants)).toBe(true);
      expect(data.participants.length).toBeGreaterThanOrEqual(1);
      expect(data.participants[0].jpm_percentage).toBeDefined();
      expect(data.participants[0].kategori_kelulusan).toBe("MS");
    });
  });

  describe("POST /api/reports/participant/:participantId/recalculate", () => {
    it("Admin dapat memicu rekalkulasi nilai dan update record DB secara otomatis", async () => {
      const res = await app.handle(
        new Request(
          `http://localhost/api/reports/participant/${participantId}/recalculate`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${adminToken}` },
          }
        )
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.jpm_percentage).toBeDefined();
      expect(json.data.kategori_kelulusan).toBe("MS");

      // Verifikasi data di DB ikut terupdate
      const [updatedPart] = await db
        .select()
        .from(sessionParticipants)
        .where(eq(sessionParticipants.id, participantId));
      expect(Number(updatedPart!.jpm_percentage)).toBeGreaterThanOrEqual(80);
      expect(updatedPart!.kategori_kelulusan).toBe("MS");
    });
  });
});
