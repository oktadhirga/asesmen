import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";

export interface JWTPayload {
  id: number;
  nip: string;
  role: "ADMIN" | "PESERTA";
  nama: string;
}

export const jwtPlugin = jwt({
  name: "jwt",
  secret: process.env.JWT_SECRET || "dev-secret-key-asesmen-asn-2024",
  exp: process.env.JWT_EXPIRY || "7d",
});

export const authPlugin = new Elysia({ name: "auth-guard" })
  .use(jwtPlugin)
  .derive({ as: "scoped" }, async ({ request, jwt }) => {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { user: null };
    }

    const token = authHeader.substring(7).trim();
    const payload = (await jwt.verify(token)) as JWTPayload | false;

    if (!payload || !payload.id) {
      return { user: null };
    }

    return { user: payload };
  });

export function requireAuth({ user, set }: { user?: any; set: any }) {
  if (!user) {
    set.status = 401;
    return {
      success: false,
      message: "Token autentikasi tidak ditemukan atau sudah kedaluwarsa",
    };
  }
}

export function requireAdmin({ user, set }: { user?: any; set: any }) {
  if (!user) {
    set.status = 401;
    return {
      success: false,
      message: "Token autentikasi tidak ditemukan atau sudah kedaluwarsa",
    };
  }

  if (user.role !== "ADMIN") {
    set.status = 403;
    return {
      success: false,
      message: "Akses ditolak: Hanya untuk Administrator",
    };
  }
}

export function requirePeserta({ user, set }: { user?: any; set: any }) {
  if (!user) {
    set.status = 401;
    return {
      success: false,
      message: "Token autentikasi tidak ditemukan atau sudah kedaluwarsa",
    };
  }

  if (user.role !== "PESERTA") {
    set.status = 403;
    return {
      success: false,
      message: "Akses ditolak: Hanya untuk Peserta ASN",
    };
  }
}
