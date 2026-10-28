import { describe, it, expect } from "bun:test";
import { parseKamusKompetensiExcel } from "../../src/utils/excel-parser";
import { resolve } from "path";

describe("TDD Tahap 14.2: Parser Excel Kamus Kompetensi ASN", () => {
  const excelPath = resolve(__dirname, "../../../Kamus_Kompetensi_ASN.xlsx");

  it("harus mengekstrak tepat 14 jenjang jabatan dari sheet 'Level per Jabatan'", () => {
    const result = parseKamusKompetensiExcel(excelPath);
    expect(result.jenjangList.length).toBe(14);
  });

  it("harus mengekstrak 126 pemetaan standar level (14 jenjang x 9 kompetensi)", () => {
    const result = parseKamusKompetensiExcel(excelPath);
    expect(result.standarList.length).toBe(14 * 9);
  });

  it("Edge Case PermenPANRB: JF Ahli Utama Integritas & Perekat Bangsa level 5, lainnya level 4", () => {
    const result = parseKamusKompetensiExcel(excelPath);
    const ahliUtama = result.standarList.filter((s) => s.kode_jenjang === "JF_AHLI_UTAMA");
    const m01 = ahliUtama.find((s) => s.kode_kompetensi === "M.01");
    const sk01 = ahliUtama.find((s) => s.kode_kompetensi === "SK.01");
    const m02 = ahliUtama.find((s) => s.kode_kompetensi === "M.02");

    expect(m01?.target_level).toBe(5);
    expect(sk01?.target_level).toBe(5);
    expect(m02?.target_level).toBe(4);
  });

  it("Edge Case PermenPANRB: JF Terampil Integritas, Kerjasama & Perekat Bangsa level 2, lainnya level 1", () => {
    const result = parseKamusKompetensiExcel(excelPath);
    const terampil = result.standarList.filter((s) => s.kode_jenjang === "JF_TERAMPIL");
    const m01 = terampil.find((s) => s.kode_kompetensi === "M.01");
    const m02 = terampil.find((s) => s.kode_kompetensi === "M.02");
    const sk01 = terampil.find((s) => s.kode_kompetensi === "SK.01");
    const m03 = terampil.find((s) => s.kode_kompetensi === "M.03");

    expect(m01?.target_level).toBe(2);
    expect(m02?.target_level).toBe(2);
    expect(sk01?.target_level).toBe(2);
    expect(m03?.target_level).toBe(1);
  });

  it("harus mengekstrak tepat 45 deskripsi level dan 135 butir indikator perilaku", () => {
    const result = parseKamusKompetensiExcel(excelPath);
    expect(result.levelDescriptions.length).toBe(45);
    expect(result.indicators.length).toBe(135);
  });
});

