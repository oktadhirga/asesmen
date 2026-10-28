import { db } from "../../db/connection";
import { users, jenjangJabatan } from "../../db/schema";
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
  jenjang_jabatan?: string | null;
  jenjang_jabatan_id?: number | null;
  created_at: Date | null;
}

export function sanitizeUser(user: any): SafeUser {
  const { password_hash, ...safe } = user;
  return safe;
}

export class AuthService {
  static async validateCredentials(nip: string, password: string): Promise<SafeUser> {
    const foundUsers = await db
      .select({
        id: users.id,
        nip: users.nip,
        nama: users.nama,
        email: users.email,
        password_hash: users.password_hash,
        role: users.role,
        jabatan: users.jabatan,
        instansi: users.instansi,
        unit_kerja: users.unit_kerja,
        jenjang_jabatan_id: users.jenjang_jabatan_id,
        jenjang_jabatan: jenjangJabatan.kode,
        created_at: users.created_at,
      })
      .from(users)
      .leftJoin(jenjangJabatan, eq(users.jenjang_jabatan_id, jenjangJabatan.id))
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
      .select({
        id: users.id,
        nip: users.nip,
        nama: users.nama,
        email: users.email,
        password_hash: users.password_hash,
        role: users.role,
        jabatan: users.jabatan,
        instansi: users.instansi,
        unit_kerja: users.unit_kerja,
        jenjang_jabatan_id: users.jenjang_jabatan_id,
        jenjang_jabatan: jenjangJabatan.kode,
        created_at: users.created_at,
      })
      .from(users)
      .leftJoin(jenjangJabatan, eq(users.jenjang_jabatan_id, jenjangJabatan.id))
      .where(eq(users.id, id))
      .limit(1);

    if (foundUsers.length === 0) {
      return null;
    }

    return sanitizeUser(foundUsers[0]!);
  }
}
