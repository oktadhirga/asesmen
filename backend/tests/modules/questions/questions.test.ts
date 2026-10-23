import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Elysia } from "elysia";
import { authRoute } from "../../../src/modules/auth/auth.route";
import { authPlugin } from "../../../src/modules/auth/auth.guard";
import { questionsRoute } from "../../../src/modules/questions/questions.route.ts";
import { seedDatabase } from "../../../src/db/seed";
import { db } from "../../../src/db/connection";
import { questions, questionOptions } from "../../../src/db/schema";
import { eq } from "drizzle-orm";

const TEST_KODE_SOAL = ["SJT-TEST-001", "SJT-TEST-002", "SJT-TEST-003"];

async function cleanupTestQuestions() {
  for (const kode of TEST_KODE_SOAL) {
    const found = await db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.kode_soal, kode));

    for (const q of found) {
      await db
        .delete(questionOptions)
        .where(eq(questionOptions.question_id, q.id));
      await db.delete(questions).where(eq(questions.id, q.id));
    }
  }
}

describe("Modul Questions (Bank Soal SJT) — TDD Tahap 6", () => {
  let app: any;
  let adminToken: string;
  let pesertaToken: string;

  beforeAll(async () => {
    // 1. Bersihkan sisa data test & seed demo database
    await cleanupTestQuestions();
    await seedDatabase();

    // 2. Setup server aplikasi uji dengan questionsRoute
    app = new Elysia({ prefix: "/api" })
      .use(authPlugin)
      .use(authRoute)
      .use(questionsRoute);

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
          nip: "199505122020121002",
          password: "password123",
        }),
      })
    );
    const pesertaJson = (await pesertaLoginRes.json()) as any;
    pesertaToken = pesertaJson.token;
  });

  afterAll(async () => {
    await cleanupTestQuestions();
  });

  describe("Akses & Role Guard (/api/questions)", () => {
    it("harus menolak request tanpa token dengan status 401", async () => {
      const res = await app.handle(new Request("http://localhost/api/questions"));
      expect(res.status).toBe(401);
    });

    it("harus menolak akses role PESERTA ke bank soal admin dengan 403 Forbidden", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/questions", {
          headers: { Authorization: `Bearer ${pesertaToken}` },
        })
      );
      expect(res.status).toBe(403);
    });

    it("harus mengizinkan role ADMIN mengakses bank soal dengan status 200 OK", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/questions", {
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

  describe("GET /api/questions (List, Paginasi, & Filter)", () => {
    it("harus mengembalikan daftar soal terpaginasi beserta opsi jawabannya", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/questions?page=1&limit=5", {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.length).toBeLessThanOrEqual(5);
      expect(json.pagination.page).toBe(1);
      expect(json.pagination.limit).toBe(5);
      expect(json.pagination.total).toBeGreaterThanOrEqual(18); // Dari seeder ada 18 soal

      // Setiap soal harus memuat options berjumlah 4
      const firstQ = json.data[0];
      expect(firstQ.options).toBeDefined();
      expect(firstQ.options.length).toBe(4);
      expect(firstQ.competency).toBeDefined();
    });

    it("harus dapat memfilter soal berdasarkan competency_id", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/questions?competency_id=1", {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.length).toBeGreaterThan(0);
      expect(
        json.data.every((q: any) => q.competency_id === 1)
      ).toBe(true);
    });

    it("harus dapat memfilter soal berdasarkan target_level", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/questions?target_level=1", {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.length).toBeGreaterThan(0);
      expect(
        json.data.every((q: any) => q.target_level === 1)
      ).toBe(true);
    });

    it("harus dapat mencari soal berdasarkan teks skenario kasus (search)", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/questions?search=pengadaan", {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.length).toBeGreaterThan(0);
      expect(
        json.data.some((q: any) =>
          q.skenario_kasus.toLowerCase().includes("pengadaan")
        )
      ).toBe(true);
    });
  });

  describe("GET /api/questions/:id (Detail Soal)", () => {
    it("harus mengembalikan detail satu soal beserta 4 opsinya", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/questions/1", {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(1);
      expect(json.data.options.length).toBe(4);
    });

    it("harus mengembalikan 404 jika ID soal tidak ditemukan", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/questions/999999", {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(404);
      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
    });
  });

  describe("POST /api/questions (Tambah Soal Baru & Validasi Bobot SJT)", () => {
    it("harus berhasil menambahkan soal baru dengan 4 opsi berbobot unik 1 s.d. 4", async () => {
      const newQuestionPayload = {
        competency_id: 1,
        kode_soal: "SJT-TEST-001",
        skenario_kasus:
          "Sebagai pejabat pengawas, Anda mendapati bawahan Anda terlambat menyampaikan laporan bulanan karena ada anggota keluarga yang sakit.",
        target_level: 2,
        options: [
          {
            label: "A",
            teks_opsi: "Memberikan teguran lisan di depan rekan kerja lainnya.",
            bobot_nilai: 1,
          },
          {
            label: "B",
            teks_opsi: "Meminta bantuan rekan kerja lain untuk menyelesaikan laporannya.",
            bobot_nilai: 2,
          },
          {
            label: "C",
            teks_opsi: "Memanggil pegawai secara personal untuk memahami situasi dan menetapkan batas waktu penyelesaian.",
            bobot_nilai: 4,
          },
          {
            label: "D",
            teks_opsi: "Membiarkan keterlambatan tersebut tanpa tindak lanjut karena empati.",
            bobot_nilai: 3,
          },
        ],
      };

      const res = await app.handle(
        new Request("http://localhost/api/questions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(newQuestionPayload),
        })
      );

      expect(res.status).toBe(201);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.kode_soal).toBe("SJT-TEST-001");
      expect(json.data.options.length).toBe(4);

      // Verifikasi bobot nilai tepat 1, 2, 3, 4
      const weights = json.data.options
        .map((o: any) => o.bobot_nilai)
        .sort((a: number, b: number) => a - b);
      expect(weights).toEqual([1, 2, 3, 4]);
    });

    it("harus menolak soal jika bobot opsi tidak unik 1-4 (400 Bad Request)", async () => {
      const invalidWeightsPayload = {
        competency_id: 1,
        kode_soal: "SJT-TEST-002",
        skenario_kasus: "Kasus uji coba dengan bobot salah.",
        target_level: 1,
        options: [
          { label: "A", teks_opsi: "Opsi A", bobot_nilai: 4 },
          { label: "B", teks_opsi: "Opsi B", bobot_nilai: 4 }, // Duplikat bobot 4
          { label: "C", teks_opsi: "Opsi C", bobot_nilai: 2 },
          { label: "D", teks_opsi: "Opsi D", bobot_nilai: 1 },
        ],
      };

      const res = await app.handle(
        new Request("http://localhost/api/questions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(invalidWeightsPayload),
        })
      );

      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
      expect(json.message).toContain("bobot nilai unik 1, 2, 3, dan 4");
    });

    it("harus menolak soal jika jumlah opsi bukan tepat 4 (400 Bad Request)", async () => {
      const invalidOptionsCount = {
        competency_id: 1,
        kode_soal: "SJT-TEST-003",
        skenario_kasus: "Kasus uji coba dengan 3 opsi.",
        target_level: 1,
        options: [
          { label: "A", teks_opsi: "Opsi A", bobot_nilai: 1 },
          { label: "B", teks_opsi: "Opsi B", bobot_nilai: 2 },
          { label: "C", teks_opsi: "Opsi C", bobot_nilai: 3 },
        ],
      };

      const res = await app.handle(
        new Request("http://localhost/api/questions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(invalidOptionsCount),
        })
      );

      expect([400, 422]).toContain(res.status);
    });
  });

  describe("PUT /api/questions/:id (Perbarui Soal & Opsi)", () => {
    it("harus berhasil memperbarui skenario kasus soal", async () => {
      // 1. Ambil soal yang baru dibuat
      const listRes = await app.handle(
        new Request("http://localhost/api/questions?search=SJT-TEST-001", {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      const listJson = (await listRes.json()) as any;
      const targetQuestion = listJson.data[0];

      // 2. Update skenario kasus
      const updateRes = await app.handle(
        new Request(`http://localhost/api/questions/${targetQuestion.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            skenario_kasus: "Skenario kasus telah diperbarui oleh Tim Asesor BKD.",
            target_level: 3,
          }),
        })
      );

      expect(updateRes.status).toBe(200);
      const json = (await updateRes.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.skenario_kasus).toContain("diperbarui oleh Tim Asesor BKD");
      expect(json.data.target_level).toBe(3);
    });
  });

  describe("DELETE /api/questions/:id (Hapus Soal & Opsi)", () => {
    it("harus berhasil menghapus soal beserta 4 opsi pilihannya", async () => {
      // 1. Ambil ID soal test
      const listRes = await app.handle(
        new Request("http://localhost/api/questions?search=SJT-TEST-001", {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      const listJson = (await listRes.json()) as any;
      const targetQuestion = listJson.data[0];

      // 2. Hapus soal
      const deleteRes = await app.handle(
        new Request(`http://localhost/api/questions/${targetQuestion.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(deleteRes.status).toBe(200);

      // 3. Verifikasi soal sudah tidak ditemukan (404)
      const verifyRes = await app.handle(
        new Request(`http://localhost/api/questions/${targetQuestion.id}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(verifyRes.status).toBe(404);
    });
  });
});
