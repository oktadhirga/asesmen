import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Elysia } from "elysia";
import { authRoute } from "../../../src/modules/auth/auth.route";
import { authPlugin } from "../../../src/modules/auth/auth.guard";
import { sessionsRoute } from "../../../src/modules/sessions/sessions.route";
import { seedDatabase } from "../../../src/db/seed";
import { db } from "../../../src/db/connection";
import {
  assessmentSessions,
  sessionParticipants,
  participantAnswers,
  users,
} from "../../../src/db/schema";
import { eq, inArray } from "drizzle-orm";

const TEST_KODE_SESI = ["SESI-TEST-001", "SESI-TEST-002", "SESI-TEST-003"];

async function cleanupTestSessions() {
  const foundSessions = await db
    .select({ id: assessmentSessions.id })
    .from(assessmentSessions)
    .where(inArray(assessmentSessions.kode_sesi, TEST_KODE_SESI));

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

describe("Modul Sessions (Sesi & Penjadwalan Asesmen) — TDD Tahap 7", () => {
  let app: any;
  let adminToken: string;
  let pesertaToken: string;
  let pesertaUser: any;
  let createdSessionId: number;

  beforeAll(async () => {
    // 1. Bersihkan sisa data test & seed demo database
    await cleanupTestSessions();
    await seedDatabase();

    // 2. Setup server aplikasi uji dengan sessionsRoute
    app = new Elysia({ prefix: "/api" })
      .use(authPlugin)
      .use(authRoute)
      .use(sessionsRoute);

    // 3. Login Admin untuk dapatkan token
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

    // 4. Login Peserta untuk pengujian otorisasi
    const pesertaLoginRes = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nip: "199505122020121002", // Ahmad Pratama (PELAKSANA)
          password: "password123",
        }),
      })
    );
    const pesertaJson = (await pesertaLoginRes.json()) as any;
    pesertaToken = pesertaJson.token;
    pesertaUser = pesertaJson.user;
  });

  afterAll(async () => {
    await cleanupTestSessions();
  });

  describe("Akses & Role Guard (/api/sessions)", () => {
    it("harus menolak request tanpa token dengan status 401", async () => {
      const res = await app.handle(new Request("http://localhost/api/sessions"));
      expect(res.status).toBe(401);
    });

    it("harus menolak akses role PESERTA ke manajemen sesi admin dengan 403 Forbidden", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/sessions", {
          headers: { Authorization: `Bearer ${pesertaToken}` },
        })
      );
      expect(res.status).toBe(403);
    });

    it("harus mengizinkan role ADMIN mengakses daftar sesi dengan status 200 OK", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/sessions", {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.pagination).toBeDefined();
    });
  });

  describe("POST /api/sessions (Buat Sesi Asesmen Baru)", () => {
    it("harus berhasil membuat sesi baru dengan status DRAFT", async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 jam lagi
      const endTime = new Date(startTime.getTime() + 90 * 60 * 1000); // durasi 90 menit

      const sessionPayload = {
        judul: "Uji Kompetensi SJT Jenjang Pelaksana 2026",
        deskripsi: "Sesi penilaian kompetensi manajerial & sosio kultural ASN.",
        kode_sesi: "SESI-TEST-001",
        waktu_mulai: startTime.toISOString(),
        waktu_selesai: endTime.toISOString(),
        durasi_menit: 90,
        target_jenjang: "PELAKSANA",
      };

      const res = await app.handle(
        new Request("http://localhost/api/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(sessionPayload),
        })
      );

      expect(res.status).toBe(201);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.kode_sesi).toBe("SESI-TEST-001");
      expect(json.data.status).toBe("DRAFT");
      expect(json.data.target_jenjang).toBe("PELAKSANA");
      createdSessionId = json.data.id;
    });

    it("harus berhasil membuat sesi baru dengan target_jenjang level: 1-5 (level_standar_umum)", async () => {
      await db.delete(assessmentSessions).where(eq(assessmentSessions.kode_sesi, "SESI-TEST-LVL3"));
      const now = new Date();
      const startTime = new Date(now.getTime() + 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 90 * 60 * 1000);

      try {
        const res = await app.handle(
          new Request("http://localhost/api/sessions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({
              judul: "Sesi Uji Level 3 Standar Umum",
              kode_sesi: "SESI-TEST-LVL3",
              waktu_mulai: startTime.toISOString(),
              waktu_selesai: endTime.toISOString(),
              durasi_menit: 60,
              target_jenjang: "3", // Level 3 -> Administrator (level_standar_umum: 3)
            }),
          })
        );

        expect(res.status).toBe(201);
        const json = (await res.json()) as any;
        expect(json.success).toBe(true);
        expect(json.data.target_jenjang).toBe("ADMINISTRATOR");
        expect(json.data.target_level).toBe(3);
      } finally {
        await db.delete(assessmentSessions).where(eq(assessmentSessions.kode_sesi, "SESI-TEST-LVL3"));
      }
    });

    it("harus menolak sesi jika kode_sesi sudah terdaftar (400 Bad Request)", async () => {
      const duplicatePayload = {
        judul: "Sesi Duplikat",
        kode_sesi: "SESI-TEST-001",
        waktu_mulai: new Date().toISOString(),
        waktu_selesai: new Date(Date.now() + 3600000).toISOString(),
        durasi_menit: 60,
      };

      const res = await app.handle(
        new Request("http://localhost/api/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(duplicatePayload),
        })
      );

      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
      expect(json.message).toContain("Kode sesi sudah terdaftar");
    });

    it("harus menolak sesi jika waktu_selesai lebih awal dari waktu_mulai (400 Bad Request)", async () => {
      const invalidTimePayload = {
        judul: "Sesi Waktu Salah",
        kode_sesi: "SESI-TEST-002",
        waktu_mulai: new Date(Date.now() + 7200000).toISOString(),
        waktu_selesai: new Date(Date.now() + 3600000).toISOString(), // Lebih awal!
        durasi_menit: 60,
      };

      const res = await app.handle(
        new Request("http://localhost/api/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(invalidTimePayload),
        })
      );

      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
      expect(json.message).toContain("Waktu selesai harus setelah waktu mulai");
    });
  });

  describe("GET /api/sessions/:id (Detail Sesi & Peserta)", () => {
    it("harus mengembalikan detail sesi beserta ringkasan peserta", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/sessions/${createdSessionId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(createdSessionId);
      expect(json.data.kode_sesi).toBe("SESI-TEST-001");
      expect(Array.isArray(json.data.participants)).toBe(true);
    });

    it("harus mengembalikan 404 jika ID sesi tidak ditemukan", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/sessions/999999", {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(404);
    });
  });

  describe("Manajemen Peserta Sesi (/api/sessions/:id/participants)", () => {
    let participantId: number;
    let participantTokenAkses: string;

    it("harus berhasil mendaftarkan peserta ASN dan meng-generate token akses unik", async () => {
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
              user_ids: [pesertaUser.id],
            }),
          }
        )
      );

      expect(res.status).toBe(201);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(1);
      expect(json.data[0].user_id).toBe(pesertaUser.id);
      expect(json.data[0].token_akses).toBeDefined();
      expect(json.data[0].status).toBe("TERDAFTAR");

      participantId = json.data[0].id;
      participantTokenAkses = json.data[0].token_akses;
    });

    it("harus menolak duplikasi pendaftaran peserta yang sama pada satu sesi", async () => {
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
              user_ids: [pesertaUser.id],
            }),
          }
        )
      );

      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
      expect(json.message).toContain("sudah terdaftar");
    });

    it("harus dapat mengambil daftar peserta dalam sesi (GET /participants)", async () => {
      const res = await app.handle(
        new Request(
          `http://localhost/api/sessions/${createdSessionId}/participants`,
          {
            headers: { Authorization: `Bearer ${adminToken}` },
          }
        )
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(1);
      expect(json.data[0].user.nip).toBe(pesertaUser.nip);
    });

    it("Peserta dapat memverifikasi token akses untuk memulai ujian (POST /verify-token)", async () => {
      // 1. Ubah status sesi ke BERJALAN agar token dapat digunakan
      await app.handle(
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

      // 2. Peserta verifikasi token
      const verifyRes = await app.handle(
        new Request("http://localhost/api/sessions/verify-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${pesertaToken}`,
          },
          body: JSON.stringify({
            kode_sesi: "SESI-TEST-001",
            token_akses: participantTokenAkses,
          }),
        })
      );

      expect(verifyRes.status).toBe(200);
      const json = (await verifyRes.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.session_participant_id).toBe(participantId);
      expect(json.data.session.kode_sesi).toBe("SESI-TEST-001");
    });

    it("Peserta dapat melihat daftar sesi yang diikutinya (GET /my-sessions)", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/sessions/my-sessions", {
          headers: { Authorization: `Bearer ${pesertaToken}` },
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
      expect(
        json.data.some((s: any) => s.kode_sesi === "SESI-TEST-001")
      ).toBe(true);
    });

    it("Admin dapat menghapus peserta dari sesi", async () => {
      const deleteRes = await app.handle(
        new Request(
          `http://localhost/api/sessions/${createdSessionId}/participants/${participantId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${adminToken}` },
          }
        )
      );

      expect(deleteRes.status).toBe(200);
      const json = (await deleteRes.json()) as any;
      expect(json.success).toBe(true);
    });
  });

  describe("PUT /api/sessions/:id (Perbarui Sesi & Siklus Status)", () => {
    it("harus berhasil memperbarui judul dan mengubah status ke SELESAI", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/sessions/${createdSessionId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            judul: "Uji Kompetensi SJT Jenjang Pelaksana (Selesai)",
            status: "SELESAI",
          }),
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.judul).toContain("(Selesai)");
      expect(json.data.status).toBe("SELESAI");
    });
  });

  describe("DELETE /api/sessions/:id (Hapus Sesi)", () => {
    it("harus berhasil menghapus sesi asesmen", async () => {
      const deleteRes = await app.handle(
        new Request(`http://localhost/api/sessions/${createdSessionId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );

      expect(deleteRes.status).toBe(200);
      const json = (await deleteRes.json()) as any;
      expect(json.success).toBe(true);

      // Verifikasi sesi 404 setelah dihapus
      const verifyRes = await app.handle(
        new Request(`http://localhost/api/sessions/${createdSessionId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(verifyRes.status).toBe(404);
    });
  });

  describe("TDD Tahap 16: Model Token Sesi Kolektif (1 Sesi = 1 Token)", () => {
    it("sesi baru otomatis memiliki token_sesi 6 karakter alfanumerik", async () => {
      const createRes = await app.handle(
        new Request("http://localhost/api/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            judul: "Sesi Uji Token Kolektif",
            kode_sesi: "SESI-TOKEN-TEST",
            waktu_mulai: "2026-11-01T08:00:00.000Z",
            waktu_selesai: "2026-11-01T10:00:00.000Z",
            durasi_menit: 90,
            target_jenjang_id: 3,
          }),
        })
      );

      expect(createRes.status).toBe(201);
      const json = await createRes.json();
      expect(json.data.token_sesi).toBeDefined();
      expect(json.data.token_sesi.length).toBe(6);

      const testSessId = json.data.id;
      const initialToken = json.data.token_sesi;

      // Asesor me-refresh token sesi
      const refreshRes = await app.handle(
        new Request(`http://localhost/api/sessions/${testSessId}/refresh-token`, {
          method: "POST",
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(refreshRes.status).toBe(200);
      const refreshJson = await refreshRes.json();
      expect(refreshJson.data.token_sesi).toBeDefined();
      expect(refreshJson.data.token_sesi.length).toBe(6);

      // Bersihkan sesi uji
      await app.handle(
        new Request(`http://localhost/api/sessions/${testSessId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
    });
  });
});
