import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Elysia } from "elysia";
import { authRoute } from "../../../src/modules/auth/auth.route";
import { authPlugin } from "../../../src/modules/auth/auth.guard";
import { usersRoute } from "../../../src/modules/users/users.route";
import { seedDatabase } from "../../../src/db/seed";
import { db } from "../../../src/db/connection";
import { users } from "../../../src/db/schema";
import { inArray } from "drizzle-orm";

const TEST_NIPS = [
  "199201012022011005",
  "199401012021011009",
  "199901012023011011",
];

async function cleanupTestUsers() {
  await db.delete(users).where(inArray(users.nip, TEST_NIPS));
}

describe("Modul Users (CRUD ASN & Asesor) — TDD Tahap 4", () => {
  let app: any;
  let adminToken: string;
  let pesertaToken: string;
  let adminId: number;

  beforeAll(async () => {
    // 1. Bersihkan sisa data test sebelumnya & seed demo data
    await cleanupTestUsers();
    await seedDatabase();

    // 2. Setup server aplikasi uji dengan authPlugin, authRoute, usersRoute
    app = new Elysia({ prefix: "/api" })
      .use(authPlugin)
      .use(authRoute)
      .use(usersRoute);

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
    adminId = adminJson.user.id;

    // 4. Login Peserta untuk pengujian otorisasi (403 Forbidden)
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

  afterAll(async () => {
    await cleanupTestUsers();
  });

  describe("Akses & Role Guard (/api/users)", () => {
    it("harus menolak request tanpa token dengan status 401", async () => {
      const res = await app.handle(new Request("http://localhost/api/users"));
      expect(res.status).toBe(401);
    });

    it("harus menolak request dari role PESERTA dengan status 403 Forbidden", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users", {
          headers: { Authorization: `Bearer ${pesertaToken}` },
        })
      );
      expect(res.status).toBe(403);
    });

    it("harus mengizinkan request dari role ADMIN dengan status 200 OK", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users", {
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

  describe("GET /api/users (List, Search & Filter)", () => {
    it("harus mengembalikan daftar pengguna terpaginasi tanpa membocorkan password_hash", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users?page=1&limit=2", {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.length).toBeLessThanOrEqual(2);
      expect(json.pagination.page).toBe(1);
      expect(json.pagination.limit).toBe(2);
      expect(json.pagination.total).toBeGreaterThanOrEqual(4);

      // Verifikasi keamanan password hash
      for (const user of json.data) {
        expect(user.password_hash).toBeUndefined();
      }
    });

    it("harus dapat memfilter pengguna berdasarkan nama atau NIP (search)", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users?search=Ahmad", {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.length).toBeGreaterThan(0);
      expect(
        json.data.some((u: any) => u.nama.includes("Ahmad"))
      ).toBe(true);

      // Search by NIP
      const resNip = await app.handle(
        new Request("http://localhost/api/users?search=19850101", {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(resNip.status).toBe(200);
      const jsonNip = (await resNip.json()) as any;
      expect(jsonNip.data.length).toBeGreaterThan(0);
      expect(
        jsonNip.data.some((u: any) => u.nip.includes("19850101"))
      ).toBe(true);
    });

    it("harus dapat memfilter pengguna berdasarkan jenjang jabatan", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users?jenjang_jabatan=ADMINISTRATOR", {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.length).toBeGreaterThan(0);
      expect(
        json.data.every((u: any) => u.jenjang_jabatan === "ADMINISTRATOR")
      ).toBe(true);
    });
  });

  describe("GET /api/users/:id (Detail Pengguna)", () => {
    it("harus mengembalikan profil pengguna spesifik dengan status 200", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/users/${adminId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(adminId);
      expect(json.data.nip).toBe("198501012010011001");
      expect(json.data.password_hash).toBeUndefined();
    });

    it("harus mengembalikan 404 jika ID pengguna tidak ditemukan", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/999999", {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(404);
      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
    });
  });

  describe("POST /api/users (Tambah ASN / Asesor Baru)", () => {
    it("harus berhasil menambahkan ASN baru dengan password terenkripsi", async () => {
      const newUserPayload = {
        nip: "199201012022011005",
        nama: "Dewi Sartika, S.Kom",
        email: "dewi.sartika@instansi.go.id",
        password: "securepassword123",
        role: "PESERTA",
        jabatan: "Pranata Komputer Ahli Pertama",
        instansi: "Kementerian Pendayagunaan Aparatur Negara",
        unit_kerja: "Biro SDM dan Organisasi",
        jenjang_jabatan: "PELAKSANA",
      };

      const res = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(newUserPayload),
        })
      );

      expect(res.status).toBe(201);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.nip).toBe(newUserPayload.nip);
      expect(json.data.nama).toBe(newUserPayload.nama);
      expect(json.data.password_hash).toBeUndefined();

      // Cek apakah user baru bisa login menggunakan password yang diberikan
      const loginCheckRes = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nip: newUserPayload.nip,
            password: newUserPayload.password,
          }),
        })
      );
      expect(loginCheckRes.status).toBe(200);
    });

    it("harus menolak pembuatan pengguna dengan NIP yang sudah terdaftar (400 Bad Request)", async () => {
      const duplicatePayload = {
        nip: "198501012010011001", // NIP Admin demo
        nama: "Duplikat NIP",
        password: "password123",
      };

      const res = await app.handle(
        new Request("http://localhost/api/users", {
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
      expect(json.message).toContain("NIP sudah terdaftar");
    });
  });

  describe("PUT /api/users/:id (Perbarui Data Pegawai)", () => {
    it("harus berhasil memperbarui jabatan dan unit kerja pengguna", async () => {
      // Buat user dummy dulu
      const createRes = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nip: "199401012021011009",
            nama: "Budi Santoso",
            password: "password123",
            jenjang_jabatan: "PELAKSANA",
          }),
        })
      );
      const { data: createdUser } = (await createRes.json()) as any;

      const updateRes = await app.handle(
        new Request(`http://localhost/api/users/${createdUser.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nama: "Budi Santoso, M.Si",
            jabatan: "Kepala Sub Bagian Tata Usaha",
            jenjang_jabatan: "PENGAWAS",
          }),
        })
      );

      expect(updateRes.status).toBe(200);
      const json = (await updateRes.json()) as any;
      expect(json.success).toBe(true);
      expect(json.data.nama).toBe("Budi Santoso, M.Si");
      expect(json.data.jenjang_jabatan).toBe("PENGAWAS");
      expect(json.data.jabatan).toBe("Kepala Sub Bagian Tata Usaha");
    });
  });

  describe("DELETE /api/users/:id (Hapus Pegawai)", () => {
    it("harus menolak admin yang mencoba menghapus akun miliknya sendiri (400 Bad Request)", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/users/${adminId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );

      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
      expect(json.message).toContain("sendiri");
    });

    it("harus berhasil menghapus pegawai lain dan menolak pencarian setelah dihapus", async () => {
      // 1. Buat user untuk dihapus
      const createRes = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nip: "199901012023011011",
            nama: "Akun Sementara Dihapus",
            password: "password123",
          }),
        })
      );
      const { data: userToDelete } = (await createRes.json()) as any;

      // 2. Hapus user
      const deleteRes = await app.handle(
        new Request(`http://localhost/api/users/${userToDelete.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(deleteRes.status).toBe(200);
      const deleteJson = (await deleteRes.json()) as any;
      expect(deleteJson.success).toBe(true);

      // 3. Pastikan user sudah tidak ditemukan (404)
      const findRes = await app.handle(
        new Request(`http://localhost/api/users/${userToDelete.id}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(findRes.status).toBe(404);
    });
  });
});
