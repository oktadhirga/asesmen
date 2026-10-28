import { db } from "../../db/connection";
import { users, jenjangJabatan } from "../../db/schema";
import { eq, or, like, sql, and, SQL } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { SafeUser, sanitizeUser } from "../auth/auth.service";

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: "ADMIN" | "PESERTA";
  jenjang_jabatan?: string;
  jenjang_jabatan_id?: number;
}

export interface CreateUserData {
  nip: string;
  nama: string;
  email?: string | null;
  password?: string;
  role?: "ADMIN" | "PESERTA";
  jabatan?: string | null;
  instansi?: string | null;
  unit_kerja?: string | null;
  jenjang_jabatan?: string | null;
  jenjang_jabatan_id?: number | null;
}

export interface UpdateUserData {
  nip?: string;
  nama?: string;
  email?: string | null;
  password?: string;
  role?: "ADMIN" | "PESERTA";
  jabatan?: string | null;
  instansi?: string | null;
  unit_kerja?: string | null;
  jenjang_jabatan?: string | null;
  jenjang_jabatan_id?: number | null;
}

export class UsersService {
  /**
   * Helper resolusi jenjang_jabatan_id dari string kode atau integer
   */
  static async resolveJenjangId(val: string | number | null | undefined): Promise<number | null> {
    if (!val) return null;
    if (typeof val === "number") return val;
    if (/^\d+$/.test(val)) return parseInt(val, 10);
    const found = await db
      .select({ id: jenjangJabatan.id })
      .from(jenjangJabatan)
      .where(eq(jenjangJabatan.kode, val.toUpperCase()))
      .limit(1);
    return found[0]?.id || null;
  }

  /**
   * Mengambil daftar pengguna dengan filter, pencarian, dan paginasi
   */
  static async listUsers(params: ListUsersParams = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 10));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];

    if (params.search && params.search.trim() !== "") {
      const searchTerm = `%${params.search.trim()}%`;
      conditions.push(
        or(like(users.nama, searchTerm), like(users.nip, searchTerm))!
      );
    }

    if (params.role) {
      conditions.push(eq(users.role, params.role));
    }

    if (params.jenjang_jabatan_id) {
      conditions.push(eq(users.jenjang_jabatan_id, Number(params.jenjang_jabatan_id)));
    } else if (params.jenjang_jabatan) {
      const resolvedId = await this.resolveJenjangId(params.jenjang_jabatan);
      if (resolvedId) {
        conditions.push(eq(users.jenjang_jabatan_id, resolvedId));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 1. Hitung total records
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause);

    const total = Number(totalResult?.count || 0);

    // 2. Ambil data dengan paginasi
    const userRows = await db
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
        jenjang_jabatan_nama: jenjangJabatan.nama,
        created_at: users.created_at,
      })
      .from(users)
      .leftJoin(jenjangJabatan, eq(users.jenjang_jabatan_id, jenjangJabatan.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(sql`${users.id} DESC`);

    const safeUsers = userRows.map(sanitizeUser);

    return {
      data: safeUsers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Mengambil detail pengguna berdasarkan ID
   */
  static async getUserById(id: number): Promise<SafeUser | null> {
    const found = await db
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
        jenjang_jabatan_nama: jenjangJabatan.nama,
        created_at: users.created_at,
      })
      .from(users)
      .leftJoin(jenjangJabatan, eq(users.jenjang_jabatan_id, jenjangJabatan.id))
      .where(eq(users.id, id))
      .limit(1);

    if (found.length === 0) {
      return null;
    }

    return sanitizeUser(found[0]!);
  }

  /**
   * Mengambil detail pengguna berdasarkan NIP
   */
  static async getUserByNip(nip: string): Promise<SafeUser | null> {
    const found = await db
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
        jenjang_jabatan_nama: jenjangJabatan.nama,
        created_at: users.created_at,
      })
      .from(users)
      .leftJoin(jenjangJabatan, eq(users.jenjang_jabatan_id, jenjangJabatan.id))
      .where(eq(users.nip, nip))
      .limit(1);

    if (found.length === 0) {
      return null;
    }

    return sanitizeUser(found[0]!);
  }

  /**
   * Menambahkan pengguna baru (ASN / Admin)
   */
  static async createUser(data: CreateUserData): Promise<SafeUser> {
    // 1. Cek duplikasi NIP
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.nip, data.nip.trim()))
      .limit(1);

    if (existing.length > 0) {
      throw new Error(`NIP sudah terdaftar: ${data.nip}`);
    }

    // 2. Hash password (default: password123 jika tidak diisi)
    const rawPassword = data.password && data.password.trim() !== "" ? data.password : "password123";
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const jenjangId = await this.resolveJenjangId(
      data.jenjang_jabatan_id ?? data.jenjang_jabatan ?? "PELAKSANA"
    );

    // 3. Simpan ke database
    await db.insert(users).values({
      nip: data.nip.trim(),
      nama: data.nama.trim(),
      email: data.email?.trim() || null,
      password_hash: passwordHash,
      role: data.role || "PESERTA",
      jabatan: data.jabatan?.trim() || null,
      instansi: data.instansi?.trim() || null,
      unit_kerja: data.unit_kerja?.trim() || null,
      jenjang_jabatan_id: jenjangId,
    });

    // 4. Ambil data yang baru dibuat
    const created = await this.getUserByNip(data.nip.trim());
    return created!;
  }

  /**
   * Memperbarui data pengguna
   */
  static async updateUser(id: number, data: UpdateUserData): Promise<SafeUser | null> {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (existing.length === 0) {
      return null;
    }

    // Cek jika NIP diubah dan sudah dipakai akun lain
    if (data.nip && data.nip.trim() !== existing[0]!.nip) {
      const duplicateNip = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.nip, data.nip.trim()))
        .limit(1);

      if (duplicateNip.length > 0) {
        throw new Error(`NIP sudah terdaftar: ${data.nip}`);
      }
    }

    const updatePayload: Record<string, any> = {};

    if (data.nip !== undefined) updatePayload.nip = data.nip.trim();
    if (data.nama !== undefined) updatePayload.nama = data.nama.trim();
    if (data.email !== undefined) updatePayload.email = data.email?.trim() || null;
    if (data.role !== undefined) updatePayload.role = data.role;
    if (data.jabatan !== undefined) updatePayload.jabatan = data.jabatan?.trim() || null;
    if (data.instansi !== undefined) updatePayload.instansi = data.instansi?.trim() || null;
    if (data.unit_kerja !== undefined) updatePayload.unit_kerja = data.unit_kerja?.trim() || null;

    if (data.jenjang_jabatan_id !== undefined || data.jenjang_jabatan !== undefined) {
      updatePayload.jenjang_jabatan_id = await this.resolveJenjangId(
        data.jenjang_jabatan_id ?? data.jenjang_jabatan
      );
    }

    if (data.password && data.password.trim() !== "") {
      updatePayload.password_hash = await bcrypt.hash(data.password, 10);
    }

    await db.update(users).set(updatePayload).where(eq(users.id, id));

    return await this.getUserById(id);
  }

  /**
   * Menghapus pengguna dari sistem
   */
  static async deleteUser(id: number): Promise<boolean> {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (existing.length === 0) {
      return false;
    }

    await db.delete(users).where(eq(users.id, id));
    return true;
  }
}
