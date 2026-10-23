import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Elysia } from "elysia";
import { authRoute } from "../../../src/modules/auth/auth.route";
import { authPlugin } from "../../../src/modules/auth/auth.guard";
import { sessionsRoute } from "../../../src/modules/sessions/sessions.route";
import { examsRoute } from "../../../src/modules/exams/exams.route";
import { seedDatabase } from "../../../src/db/seed";
import { db } from "../../../src/db/connection";
import {
  assessmentSessions,
  sessionParticipants,
  participantAnswers,
  questions,
  questionOptions,
} from "../../../src/db/schema";
import { eq, inArray } from "drizzle-orm";

const TEST_KODE_SESI = "SESI-EXAM-TEST";

async function cleanupTestExam() {
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

describe("Modul Exams (Core Engine & Proctoring) — TDD Tahap 8", () => {
  let app: any;
  let adminToken: string;
  let pesertaToken: string;
  let pesertaUser: any;
  let sessionId: number;
  let participantId: number;
  let tokenAkses: string;

  beforeAll(async () => {
    // 1. Bersihkan sisa data test & seed demo database
    await cleanupTestExam();
    await seedDatabase();

    // 2. Setup server aplikasi uji dengan examsRoute
    app = new Elysia({ prefix: "/api" })
      .use(authPlugin)
      .use(authRoute)
      .use(sessionsRoute)
      .use(examsRoute);

    // 3. Login Admin untuk membuat sesi & mendaftarkan peserta
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

    // 4. Login Peserta ASN (Jenjang Pelaksana)
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

    // 5. Admin membuat sesi berstatus BERJALAN
    const now = new Date();
    const createSessionRes = await app.handle(
      new Request("http://localhost/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          judul: "Ujian Simulasi SJT PermenPANRB",
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

    // Ubah sesi langsung ke status BERJALAN
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

    // 6. Admin mendaftarkan peserta ke sesi
    const regPartRes = await app.handle(
      new Request(`http://localhost/api/sessions/${sessionId}/participants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ user_ids: [pesertaUser.id] }),
      })
    );
    const regJson = (await regPartRes.json()) as any;
    participantId = regJson.data[0].id;
    tokenAkses = regJson.data[0].token_akses;
  });

  afterAll(async () => {
    await cleanupTestExam();
  });

  describe("POST /api/exams/start (Mulai Pengerjaan Ujian)", () => {
    it("harus menolak request tanpa token otentikasi dengan status 401", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/exams/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            token_akses: tokenAkses,
          }),
        })
      );
      expect(res.status).toBe(401);
    });

    it("harus berhasil memulai ujian dan mengupdate status peserta ke SEDANG_MENGERJAKAN", async () => {
      const res = await app.handle(
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

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.session_participant_id).toBe(participantId);
      expect(json.data.status).toBe("SEDANG_MENGERJAKAN");
      expect(json.data.sisa_waktu_detik).toBeGreaterThan(0);
      expect(json.data.waktu_login).toBeDefined();
    });
  });

  describe("GET /api/exams/:participantId/questions (Bank Soal Ujian & Proteksi Bobot)", () => {
    it("harus mengembalikan daftar soal TANPA membocorkan atribut bobot_nilai", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/exams/${participantId}/questions`, {
          headers: { Authorization: `Bearer ${pesertaToken}` },
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(18);

      // Verifikasi proteksi keamanan: TIDAK BOLEH ada atribut bobot_nilai di opsi
      for (const q of json.data) {
        expect(q.id).toBeDefined();
        expect(q.skenario_kasus).toBeDefined();
        expect(q.options.length).toBe(4);
        for (const opt of q.options) {
          expect(opt.id).toBeDefined();
          expect(opt.label).toBeDefined();
          expect(opt.teks_opsi).toBeDefined();
          expect(opt.bobot_nilai).toBeUndefined(); // Bobot dirahasiakan dari peserta
        }
      }
    });

    it("harus menolak akses jika participantId bukan milik user login (403 Forbidden)", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/exams/999999/questions`, {
          headers: { Authorization: `Bearer ${pesertaToken}` },
        })
      );
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/exams/:participantId/answers (Autosave Jawaban Real-Time)", () => {
    let sampleQuestionId: number;
    let sampleOptionId: number;

    it("harus berhasil menyimpan jawaban per klik beserta bobot nilai yang dihitung otomatis di server", async () => {
      // 1. Ambil soal pertama
      const qRes = await app.handle(
        new Request(`http://localhost/api/exams/${participantId}/questions`, {
          headers: { Authorization: `Bearer ${pesertaToken}` },
        })
      );
      const qJson = (await qRes.json()) as any;
      const firstQ = qJson.data[0];
      sampleQuestionId = firstQ.id;
      sampleOptionId = firstQ.options[0].id;

      // 2. Simpan jawaban (autosave)
      const saveRes = await app.handle(
        new Request(`http://localhost/api/exams/${participantId}/answers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${pesertaToken}`,
          },
          body: JSON.stringify({
            question_id: sampleQuestionId,
            selected_option_id: sampleOptionId,
            is_ragu: true,
          }),
        })
      );

      expect(saveRes.status).toBe(200);
      const saveJson = (await saveRes.json()) as any;
      expect(saveJson.success).toBe(true);
      expect(saveJson.data.question_id).toBe(sampleQuestionId);
      expect(saveJson.data.selected_option_id).toBe(sampleOptionId);
      expect(saveJson.data.is_ragu).toBe(true);

      // 3. Verifikasi jawaban di DB tersimpan dengan bobot_diperoleh yang tepat
      const savedAns = await db
        .select()
        .from(participantAnswers)
        .where(
          eq(participantAnswers.session_participant_id, participantId)
        );
      expect(savedAns.length).toBe(1);
      expect(savedAns[0]!.bobot_diperoleh).toBeGreaterThanOrEqual(1);
      expect(savedAns[0]!.bobot_diperoleh).toBeLessThanOrEqual(4);
    });

    it("harus memperbarui jawaban yang sudah ada tanpa menduplikasi data (update in place)", async () => {
      // Ambil opsi kedua dari soal yang sama
      const qRes = await app.handle(
        new Request(`http://localhost/api/exams/${participantId}/questions`, {
          headers: { Authorization: `Bearer ${pesertaToken}` },
        })
      );
      const qJson = (await qRes.json()) as any;
      const firstQ = qJson.data[0];
      const secondOptionId = firstQ.options[1].id;

      // Update jawaban menjadi tidak ragu
      const updateRes = await app.handle(
        new Request(`http://localhost/api/exams/${participantId}/answers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${pesertaToken}`,
          },
          body: JSON.stringify({
            question_id: sampleQuestionId,
            selected_option_id: secondOptionId,
            is_ragu: false,
          }),
        })
      );

      expect(updateRes.status).toBe(200);
      const updateJson = (await updateRes.json()) as any;
      expect(updateJson.data.selected_option_id).toBe(secondOptionId);
      expect(updateJson.data.is_ragu).toBe(false);

      // Pastikan tetap hanya 1 record jawaban
      const allAns = await db
        .select()
        .from(participantAnswers)
        .where(
          eq(participantAnswers.session_participant_id, participantId)
        );
      expect(allAns.length).toBe(1);
    });
  });

  describe("POST /api/exams/:participantId/tab-switch (Proctoring Violation)", () => {
    it("harus mencatat penambahan pelanggaran perpindahan tab secara real-time", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/exams/${participantId}/tab-switch`, {
          method: "POST",
          headers: { Authorization: `Bearer ${pesertaToken}` },
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.tab_switch_count).toBe(1);
      expect(json.warning).toBeDefined();

      // Trigger switch tab kedua kali
      const res2 = await app.handle(
        new Request(`http://localhost/api/exams/${participantId}/tab-switch`, {
          method: "POST",
          headers: { Authorization: `Bearer ${pesertaToken}` },
        })
      );
      const json2 = (await res2.json()) as any;
      expect(json2.tab_switch_count).toBe(2);
    });
  });

  describe("GET /api/exams/:participantId/status (Sinkronisasi Timer & State Server)", () => {
    it("harus mengembalikan status pengerjaan, total terjawab, dan sisa waktu server", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/exams/${participantId}/status`, {
          headers: { Authorization: `Bearer ${pesertaToken}` },
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("SEDANG_MENGERJAKAN");
      expect(json.data.total_answered).toBe(1);
      expect(json.data.total_doubt).toBe(0);
      expect(json.data.tab_switch_count).toBe(2);
      expect(json.data.sisa_waktu_detik).toBeGreaterThan(0);
    });
  });

  describe("POST /api/exams/:participantId/submit (Kunci & Selesai Ujian)", () => {
    it("harus berhasil mengunci ujian dan mengubah status peserta ke SELESAI", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/exams/${participantId}/submit`, {
          method: "POST",
          headers: { Authorization: `Bearer ${pesertaToken}` },
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("SELESAI");
      expect(json.data.waktu_submit).toBeDefined();
    });

    it("harus menolak pengiriman jawaban setelah ujian berstatus SELESAI (400 Bad Request)", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/exams/${participantId}/answers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${pesertaToken}`,
          },
          body: JSON.stringify({
            question_id: 1,
            selected_option_id: 1,
          }),
        })
      );

      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.message).toContain("sudah diselesaikan");
    });
  });
});
