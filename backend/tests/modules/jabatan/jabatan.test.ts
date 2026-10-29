import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { app } from "../../../src/index";
import { db } from "../../../src/db/connection";
import { assessmentSessions, users } from "../../../src/db/schema";
import { eq } from "drizzle-orm";

describe("TDD Tahap 14.4: API Master Jenjang Jabatan & Standar Level", () => {
  let adminToken: string;
  let createdSessionId: number | null = null;
  let testUserNip = "9999888877776666";

  beforeAll(async () => {
    // Cleanup prior runs if any
    await db.delete(assessmentSessions).where(eq(assessmentSessions.kode_sesi, "SESI-TDD-144-OK"));
    await db.delete(users).where(eq(users.nip, testUserNip));

    // Login as Admin
    const loginRes = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nip: "198501012010011001",
          password: "password123",
        }),
      })
    );
    const loginJson = (await loginRes.json()) as any;
    adminToken = loginJson.token;
  });

  afterAll(async () => {
    if (createdSessionId) {
      await db.delete(assessmentSessions).where(eq(assessmentSessions.id, createdSessionId));
    }
    await db.delete(users).where(eq(users.nip, testUserNip));
  });

  describe("GET /api/jabatan", () => {
    it("GET /api/jabatan harus mengembalikan daftar 14 tingkatan jabatan ASN", async () => {
      const res = await app.handle(new Request("http://localhost/api/jabatan"));
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBe(14);

      const codes = json.data.map((j: any) => j.kode);
      expect(codes).toContain("JPT_UTAMA");
      expect(codes).toContain("JF_AHLI_UTAMA");
      expect(codes).toContain("ADMINISTRATOR");
      expect(codes).toContain("PENGAWAS");
      expect(codes).toContain("PELAKSANA");
      expect(codes).toContain("JF_TERAMPIL");
    });

    it("GET /api/jabatan/standards harus mengembalikan seluruh matriks 126 standar kompetensi", async () => {
      const res = await app.handle(new Request("http://localhost/api/jabatan/standards"));
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBe(126); // 14 jenjang x 9 kompetensi

      // Verifikasi format atribut respon
      const first = json.data[0];
      expect(first.jenjang_jabatan_id).toBeDefined();
      expect(first.competency_id).toBeDefined();
      expect(first.kode_kompetensi).toBeDefined();
      expect(first.target_level).toBeDefined();
    });
  });

  describe("GET /api/jabatan/:id", () => {
    it("harus mengembalikan detail satu jenjang jabatan yang valid", async () => {
      const res = await app.handle(new Request("http://localhost/api/jabatan/1"));
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.id).toBe(1);
      expect(json.data.kode).toBeDefined();
      expect(json.data.nama).toBeDefined();
    });

    it("harus mengembalikan 404 jika jenjang jabatan tidak ditemukan", async () => {
      const res = await app.handle(new Request("http://localhost/api/jabatan/9999"));
      expect(res.status).toBe(404);
      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
    });
  });

  describe("GET /api/jabatan/:id/standards", () => {
    it("GET /api/jabatan/:id/standards harus mengembalikan 9 standar kompetensi jenjang tersebut", async () => {
      const res = await app.handle(new Request("http://localhost/api/jabatan/1/standards"));
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.standards.length).toBe(9);
    });

    it("harus mengembalikan standar khusus untuk JF Ahli Utama (Integritas & Perekat Bangsa level 5)", async () => {
      // Cari ID untuk JF_AHLI_UTAMA
      const listRes = await app.handle(new Request("http://localhost/api/jabatan"));
      const listJson = (await listRes.json()) as any;
      const ahliUtama = listJson.data.find((j: any) => j.kode === "JF_AHLI_UTAMA");
      expect(ahliUtama).toBeDefined();

      const res = await app.handle(new Request(`http://localhost/api/jabatan/${ahliUtama.id}/standards`));
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.standards.length).toBe(9);

      const m01 = json.data.standards.find(
        (s: any) =>
          s.kode_kompetensi === "KOMP-01" ||
          s.kode_kompetensi === "M.01" ||
          s.nama_kompetensi?.toLowerCase().includes("integritas")
      );
      const sk01 = json.data.standards.find(
        (s: any) =>
          s.kode_kompetensi === "KOMP-09" ||
          s.kode_kompetensi === "SK.01" ||
          s.nama_kompetensi?.toLowerCase().includes("perekat")
      );
      const m02 = json.data.standards.find(
        (s: any) =>
          s.kode_kompetensi === "KOMP-02" ||
          s.kode_kompetensi === "M.02" ||
          s.nama_kompetensi?.toLowerCase().includes("kerjasama")
      );

      expect(m01).toBeDefined();
      expect(sk01).toBeDefined();
      expect(m02).toBeDefined();

      expect(m01.target_level).toBe(5);
      expect(sk01.target_level).toBe(5);
      expect(m02.target_level).toBe(4);
    });

    it("harus mengembalikan 404 jika ID jenjang tidak ditemukan", async () => {
      const res = await app.handle(new Request("http://localhost/api/jabatan/9999/standards"));
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/competencies/:id/indicators", () => {
    it("harus mengembalikan 15 indikator perilaku untuk kompetensi yang dipilih", async () => {
      const res = await app.handle(new Request("http://localhost/api/competencies/1/indicators"));
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);

      const indicators = json.data.indicators || json.data;
      expect(indicators.length).toBe(15);
      expect(indicators[0].level).toBeDefined();
      expect(indicators[0].indikator).toBeDefined();
      expect(indicators[0].nomor_urut).toBeDefined();
    });

    it("harus mengembalikan 404 jika ID kompetensi tidak ditemukan", async () => {
      const res = await app.handle(new Request("http://localhost/api/competencies/9999/indicators"));
      expect(res.status).toBe(404);
    });
  });

  describe("Validasi Skema POST /api/sessions & POST /api/users", () => {
    it("POST /api/sessions menolak enum string lama dan menerima integer target_jenjang_id", async () => {
      const legacyRes = await app.handle(
        new Request("http://localhost/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer mock" },
          body: JSON.stringify({ judul: "Uji", target_jenjang: "PELAKSANA" }),
        })
      );
      expect(legacyRes.status).toBe(422);
    });

    it("POST /api/sessions menerima target_jenjang_id (integer) dan berhasil membuat sesi", async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() + 2 * 3600 * 1000);
      const endTime = new Date(startTime.getTime() + 90 * 60 * 1000);

      const res = await app.handle(
        new Request("http://localhost/api/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            judul: "Sesi Asesmen JF Ahli Utama 2026",
            deskripsi: "Sesi dengan target jenjang JF Ahli Utama",
            kode_sesi: "SESI-TDD-144-OK",
            waktu_mulai: startTime.toISOString(),
            waktu_selesai: endTime.toISOString(),
            durasi_menit: 90,
            target_jenjang_id: 2, // JF Ahli Utama
          }),
        })
      );

      expect(res.status).toBe(201);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.target_jenjang_id).toBe(2);
      createdSessionId = json.data.id;
    });

    it("POST /api/users menerima jenjang_jabatan_id (integer) dan berhasil mendaftarkan user", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nip: testUserNip,
            nama: "ASN Baru TDD 14.4",
            email: "asn.tdd144@asn.go.id",
            password: "password123",
            role: "PESERTA",
            jabatan: "Pranata Komputer Ahli Pertama",
            instansi: "Kementerian PANRB",
            unit_kerja: "Deputi Bidang SDM Aparatur",
            jenjang_jabatan_id: 5, // JF Ahli Pertama
          }),
        })
      );

      expect(res.status).toBe(201);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.jenjang_jabatan_id).toBe(5);
    });
  });
});
