import { describe, it, expect, beforeAll } from "bun:test";
import { Elysia } from "elysia";
import { authRoute } from "../../../src/modules/auth/auth.route";
import { authPlugin, requireAdmin, requireAuth } from "../../../src/modules/auth/auth.guard";
import { seedDatabase } from "../../../src/db/seed";

describe("Modul Auth — TDD Tahap 3 (Issue #1)", () => {
  let app: any;

  beforeAll(async () => {
    // Pastikan database terisi user demo
    await seedDatabase();

    // Buat test app dengan auth routes dan protected sample routes
    app = new Elysia({ prefix: "/api" })
      .use(authPlugin)
      .use(authRoute)
      // Protected route untuk pengujian requireAuth
      .get("/protected", ({ user }: any) => ({ message: "Authorized", user }), {
        beforeHandle: requireAuth,
      })
      // Admin only route untuk pengujian requireAdmin
      .get("/admin-only", ({ user }: any) => ({ message: "Welcome Admin", user }), {
        beforeHandle: requireAdmin,
      });
  });

  describe("POST /api/auth/login", () => {
    it("should return JWT token and user profile on valid NIP & password", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nip: "198501012010011001", // Admin demo
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(200);
      const json = (await response.json()) as any;
      expect(json.success).toBe(true);
      expect(json.token).toBeDefined();
      expect(typeof json.token).toBe("string");
      expect(json.user).toBeDefined();
      expect(json.user.nip).toBe("198501012010011001");
      expect(json.user.role).toBe("ADMIN");
      expect(json.user.password_hash).toBeUndefined(); // Password hash tidak boleh bocor
    });

    it("should reject login with incorrect password with 401", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nip: "198501012010011001",
            password: "wrongpassword",
          }),
        })
      );

      expect(response.status).toBe(401);
      const json = (await response.json()) as any;
      expect(json.success).toBe(false);
      expect(json.message).toContain("Password");
    });

    it("should reject login with non-existent NIP with 401", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nip: "999999999999999999",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(401);
      const json = (await response.json()) as any;
      expect(json.success).toBe(false);
      expect(json.message).toContain("NIP");
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return current user profile with valid Bearer token", async () => {
      // 1. Login dulu untuk dapat token
      const loginRes = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nip: "199505122020121002", // Peserta Pelaksana
            password: "password123",
          }),
        })
      );
      const { token } = (await loginRes.json()) as any;

      // 2. Akses /api/auth/me
      const meRes = await app.handle(
        new Request("http://localhost/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      );

      expect(meRes.status).toBe(200);
      const meJson = (await meRes.json()) as any;
      expect(meJson.success).toBe(true);
      expect(meJson.user.nip).toBe("199505122020121002");
      expect(meJson.user.role).toBe("PESERTA");
      expect(meJson.user.password_hash).toBeUndefined();
    });

    it("should reject unauthenticated request to /api/auth/me with 401", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/auth/me")
      );

      expect(response.status).toBe(401);
    });
  });

  describe("Role Guard Middleware (requireAuth & requireAdmin)", () => {
    it("should block unauthenticated access to protected route with 401", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/protected")
      );
      expect(response.status).toBe(401);
    });

    it("should allow authenticated PESERTA to access protected route with 200", async () => {
      const loginRes = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nip: "199505122020121002",
            password: "password123",
          }),
        })
      );
      const { token } = (await loginRes.json()) as any;

      const response = await app.handle(
        new Request("http://localhost/api/protected", {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      expect(response.status).toBe(200);
      const json = (await response.json()) as any;
      expect(json.message).toBe("Authorized");
    });

    it("should block PESERTA from accessing admin-only route with 403", async () => {
      const loginRes = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nip: "199505122020121002", // Peserta role
            password: "password123",
          }),
        })
      );
      const { token } = (await loginRes.json()) as any;

      const response = await app.handle(
        new Request("http://localhost/api/admin-only", {
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      expect(response.status).toBe(403);
      const json = (await response.json()) as any;
      expect(json.message).toContain("Akses ditolak");
    });

    it("should allow ADMIN to access admin-only route with 200", async () => {
      const loginRes = await app.handle(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nip: "198501012010011001", // Admin role
            password: "password123",
          }),
        })
      );
      const { token } = (await loginRes.json()) as any;

      const response = await app.handle(
        new Request("http://localhost/api/admin-only", {
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      expect(response.status).toBe(200);
      const json = (await response.json()) as any;
      expect(json.message).toBe("Welcome Admin");
    });
  });
});
