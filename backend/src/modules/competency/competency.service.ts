import { db } from "../../db/connection";
import { competencies } from "../../db/schema";
import { eq, asc } from "drizzle-orm";

export interface UpdateCompetencyData {
  nama?: string;
  deskripsi?: string | null;
  bobot_standar?: string;
}

export class CompetencyService {
  /**
   * Mengambil semua daftar dimensi kompetensi (opsional filter kategori)
   */
  static async listCompetencies(filter?: {
    kategori?: "MANAJERIAL" | "SOSIO_KULTURAL";
  }) {
    let query = db
      .select()
      .from(competencies)
      .orderBy(asc(competencies.kode));

    if (filter?.kategori) {
      return await query.where(eq(competencies.kategori, filter.kategori));
    }

    return await query;
  }

  /**
   * Mengambil detail satu kompetensi berdasarkan ID
   */
  static async getCompetencyById(id: number) {
    const found = await db
      .select()
      .from(competencies)
      .where(eq(competencies.id, id))
      .limit(1);

    if (found.length === 0) {
      return null;
    }

    return found[0]!;
  }

  /**
   * Memperbarui bobot standar atau deskripsi kompetensi
   */
  static async updateCompetency(id: number, data: UpdateCompetencyData) {
    const existing = await this.getCompetencyById(id);
    if (!existing) {
      return null;
    }

    const updatePayload: Record<string, any> = {};

    if (data.nama !== undefined) updatePayload.nama = data.nama.trim();
    if (data.deskripsi !== undefined) updatePayload.deskripsi = data.deskripsi;
    if (data.bobot_standar !== undefined)
      updatePayload.bobot_standar = data.bobot_standar;

    await db
      .update(competencies)
      .set(updatePayload)
      .where(eq(competencies.id, id));

    return await this.getCompetencyById(id);
  }
}
