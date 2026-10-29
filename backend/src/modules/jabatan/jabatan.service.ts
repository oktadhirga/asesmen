import { db } from "../../db/connection";
import {
  jenjangJabatan,
  standarKompetensiJabatan,
  competencies,
} from "../../db/schema";
import { eq } from "drizzle-orm";

export class JabatanService {
  /**
   * Mengambil seluruh daftar jenjang jabatan ASN (14 tingkatan)
   */
  static async listJabatan() {
    return await db
      .select({
        id: jenjangJabatan.id,
        kode: jenjangJabatan.kode,
        nama: jenjangJabatan.nama,
        kelompok_jabatan: jenjangJabatan.kelompok_jabatan,
        level_standar_umum: jenjangJabatan.level_standar_umum,
      })
      .from(jenjangJabatan)
      .orderBy(jenjangJabatan.id);
  }

  /**
   * Mengambil detail satu jenjang jabatan berdasarkan ID
   */
  static async getJabatanById(id: number) {
    const found = await db
      .select({
        id: jenjangJabatan.id,
        kode: jenjangJabatan.kode,
        nama: jenjangJabatan.nama,
        kelompok_jabatan: jenjangJabatan.kelompok_jabatan,
        level_standar_umum: jenjangJabatan.level_standar_umum,
      })
      .from(jenjangJabatan)
      .where(eq(jenjangJabatan.id, id))
      .limit(1);

    return found[0] || null;
  }

  /**
   * Mengambil matriks 9 standar kompetensi untuk jenjang jabatan tertentu
   */
  static async getStandardsByJabatanId(jabatanId: number) {
    const jabatan = await this.getJabatanById(jabatanId);
    if (!jabatan) {
      return null;
    }

    const standards = await db
      .select({
        id: standarKompetensiJabatan.id,
        jenjang_jabatan_id: standarKompetensiJabatan.jenjang_jabatan_id,
        competency_id: standarKompetensiJabatan.competency_id,
        kode_kompetensi: competencies.kode,
        nama_kompetensi: competencies.nama,
        kategori: competencies.kategori,
        target_level: standarKompetensiJabatan.target_level,
      })
      .from(standarKompetensiJabatan)
      .innerJoin(
        competencies,
        eq(standarKompetensiJabatan.competency_id, competencies.id)
      )
      .where(eq(standarKompetensiJabatan.jenjang_jabatan_id, jabatanId))
      .orderBy(competencies.id);

    return {
      jabatan,
      standards,
    };
  }

  /**
   * Mengambil seluruh matriks standar kompetensi untuk semua jenjang jabatan (126 baris)
   */
  static async getAllStandards() {
    return await db
      .select({
        id: standarKompetensiJabatan.id,
        jenjang_jabatan_id: standarKompetensiJabatan.jenjang_jabatan_id,
        competency_id: standarKompetensiJabatan.competency_id,
        kode_kompetensi: competencies.kode,
        nama_kompetensi: competencies.nama,
        kategori: competencies.kategori,
        target_level: standarKompetensiJabatan.target_level,
      })
      .from(standarKompetensiJabatan)
      .innerJoin(
        competencies,
        eq(standarKompetensiJabatan.competency_id, competencies.id)
      )
      .orderBy(standarKompetensiJabatan.jenjang_jabatan_id, competencies.id);
  }
}

