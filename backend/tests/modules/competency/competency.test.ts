import { describe, it, expect, beforeAll } from "bun:test";
import { Elysia } from "elysia";
import { authRoute } from "../../../src/modules/auth/auth.route";
import { authPlugin } from "../../../src/modules/auth/auth.guard";
import { competencyRoute } from "../../../src/modules/competency/competency.route";
import { seedDatabase } from "../../../src/db/seed";

describe("Modul Competency (9 Dimensi PermenPANRB) — TDD Tahap 5", () => {
  let app: any;
  let adminToken: string;
  let pesertaToken: string;
  let sampleCompetencyId: number;

  beforeAll(async () => {
    // 1. Pastikan database terisi seeder 9 dimensi dan akun demo
    await seedDatabase();

    // 2. Buat server pengujian dengan authPlugin, authRoute, competencyRoute
    app = new Elysia({ prefix: "/api" })
      .use(authPlugin)
      .use(authRoute)
      .use(competencyRoute);

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
  }, 20000);

  describe("Akses & Role Guard (/api/competencies)", () => {
    it("harus menolak request tanpa token dengan status 401", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/competencies")
      );
      expect(res.status).toBe(401);
    });

    it("harus mengizinkan role PESERTA untuk membaca daftar kompetensi dengan status 200", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/competencies", {
          headers: { Authorization: `Bearer ${pesertaToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(9);
    });

    it("harus menolak role PESERTA yang mencoba mengedit kompetensi dengan 403 Forbidden", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/competencies/1", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${pesertaToken}`,
          },
          body: JSON.stringify({
            bobot_standar: "3.50",
          }),
        })
      );
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/competencies (9 Dimensi & Filter)", () => {
    it("harus mengembalikan tepat 9 dimensi kompetensi PermenPANRB 38/2017", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/competencies", {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(9);

      // Simpan satu ID untuk pengujian detail
      sampleCompetencyId = json.data[0].id;

      // Cek struktur data setiap dimensi
      const integritas = json.data.find((c: any) => c.kode === "KOMP-01");
      expect(integritas).toBeDefined();
      expect(integritas.nama).toBe("Integritas");
      expect(integritas.kategori).toBe("MANAJERIAL");
      expect(integritas.bobot_standar).toBeDefined();
    });

    it("harus dapat memfilter berdasarkan kategori MANAJERIAL (8 dimensi)", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/competencies?kategori=MANAJERIAL", {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(8);
      expect(
        json.data.every((c: any) => c.kategori === "MANAJERIAL")
      ).toBe(true);
    });

    it("harus dapat memfilter berdasarkan kategori SOSIO_KULTURAL (1 dimensi: Perekat Bangsa)", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/competencies?kategori=SOSIO_KULTURAL", {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(1);
      expect(json.data[0].kode).toBe("KOMP-09");
      expect(json.data[0].nama).toBe("Perekat Bangsa");
    });
  });

  describe("GET /api/competencies/:id (Detail Kompetensi)", () => {
    it("harus mengembalikan data detail kompetensi dengan status 200", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/competencies/${sampleCompetencyId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(sampleCompetencyId);
      expect(json.data.deskripsi).toBeDefined();
    });

    it("harus mengembalikan 404 jika ID kompetensi tidak ditemukan", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/competencies/999999", {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(404);
      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
    });
  });

  describe("PUT /api/competencies/:id (Update Bobot / Deskripsi oleh Admin)", () => {
    it("harus berhasil memperbarui bobot standar dan deskripsi kompetensi", async () => {
      const updatePayload = {
        bobot_standar: "3.50",
        deskripsi: "Deskripsi standar kompetensi yang diperbarui oleh Asesor BKD",
      };

      const res = await app.handle(
        new Request(`http://localhost/api/competencies/${sampleCompetencyId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(updatePayload),
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.bobot_standar).toBe("3.50");
      expect(json.data.deskripsi).toBe(updatePayload.deskripsi);
    });

    it("harus mengembalikan 404 jika mengupdate ID yang tidak valid", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/competencies/999999", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            bobot_standar: "4.00",
          }),
        })
      );

      expect(res.status).toBe(404);
    });
  });
});
