import { db } from "../../db/connection";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface SafeUser {
  id: number;
  nip: string;
  nama: string;
  email: string | null;
  role: "ADMIN" | "PESERTA";
  jabatan: string | null;
  instansi: string | null;
  unit_kerja: string | null;
  jenjang_jabatan: "PELAKSANA" | "PENGAWAS" | "ADMINISTRATOR" | "JPT" | null;
  created_at: Date | null;
}

export function sanitizeUser(user: typeof users.$inferSelect): SafeUser {
  const { password_hash, ...safe } = user;
  return safe;
}

export class AuthService {
  static async validateCredentials(nip: string, password: string): Promise<SafeUser> {
    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.nip, nip))
      .limit(1);

    if (foundUsers.length === 0) {
      throw new Error("NIP tidak ditemukan dalam sistem");
    }

    const user = foundUsers[0]!;
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new Error("Password yang dimasukkan salah");
    }

    return sanitizeUser(user);
  }

  static async getUserById(id: number): Promise<SafeUser | null> {
    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (foundUsers.length === 0) {
      return null;
    }

    return sanitizeUser(foundUsers[0]!);
  }
}
