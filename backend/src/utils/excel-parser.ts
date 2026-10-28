import fs from "node:fs";
import zlib from "node:zlib";

export interface JenjangItem {
  kode: string;
  nama: string;
  kelompok_jabatan: string;
  level_standar_umum: number;
  urutan: number;
}

export interface StandarItem {
  kode_jenjang: string;
  kode_kompetensi: string;
  target_level: number;
}

export interface LevelDescriptionItem {
  kode_kompetensi: string;
  level: number;
  nama_level: string;
  deskripsi: string;
}

export interface IndicatorItem {
  kode_kompetensi: string;
  level: number;
  nomor_indikator: string;
  deskripsi_indikator: string;
}

export interface ParsedKamusResult {
  jenjangList: JenjangItem[];
  standarList: StandarItem[];
  levelDescriptions: LevelDescriptionItem[];
  indicators: IndicatorItem[];
}

/**
 * Ekstraksi arsip ZIP (XLSX) in-memory tanpa dependensi eksternal
 */
function unzipXlsxSync(buffer: Buffer): Record<string, string> {
  const files: Record<string, string> = {};
  let offset = 0;
  while (offset < buffer.length - 4) {
    const sig = buffer.readUInt32LE(offset);
    if (sig === 0x04034b50) {
      const compMethod = buffer.readUInt16LE(offset + 8);
      const compSize = buffer.readUInt32LE(offset + 18);
      const nameLen = buffer.readUInt16LE(offset + 26);
      const extraLen = buffer.readUInt16LE(offset + 28);
      const name = buffer.toString("utf8", offset + 30, offset + 30 + nameLen);
      const dataStart = offset + 30 + nameLen + extraLen;
      const compData = buffer.subarray(dataStart, dataStart + compSize);
      if (compMethod === 0) {
        files[name] = compData.toString("utf8");
      } else if (compMethod === 8) {
        files[name] = zlib.inflateRawSync(compData).toString("utf8");
      }
      offset = dataStart + compSize;
    } else {
      offset++;
    }
  }
  return files;
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseSheetRows(xml: string): { rowNum: number; cells: Record<string, string> }[] {
  const rows: { rowNum: number; cells: Record<string, string> }[] = [];
  const rowRegex = /<row r="(\d+)"[^>]*>(.*?)<\/row>/gs;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(xml)) !== null) {
    const rowNum = parseInt(rowMatch[1]!, 10);
    const rowContent = rowMatch[2]!;
    const cells: Record<string, string> = {};
    const cellRegex = /<c r="([A-Z]+)\d+"[^>]*>(.*?)<\/c>/gs;
    let cellMatch: RegExpExecArray | null;

    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const col = cellMatch[1]!;
      const cellBody = cellMatch[2]!;
      let val = "";
      const isMatch = /<is><t[^>]*>(.*?)<\/t><\/is>/s.exec(cellBody);
      if (isMatch) {
        val = decodeXmlEntities(isMatch[1]!);
      } else {
        const vMatch = /<v[^>]*>(.*?)<\/v>/s.exec(cellBody);
        if (vMatch) {
          val = decodeXmlEntities(vMatch[1]!);
        }
      }
      cells[col] = val.trim();
    }
    rows.push({ rowNum, cells });
  }
  return rows;
}

const KODE_JENJANG_MAP: Record<string, { kode: string; level_umum: number }> = {
  "JPT Utama": { kode: "JPT_UTAMA", level_umum: 5 },
  "JPT Madya": { kode: "JPT_MADYA", level_umum: 5 },
  "JPT Pratama": { kode: "JPT_PRATAMA", level_umum: 4 },
  "Jabatan Administrator": { kode: "ADMINISTRATOR", level_umum: 3 },
  "Jabatan Pengawas": { kode: "PENGAWAS", level_umum: 2 },
  "Jabatan Pelaksana": { kode: "PELAKSANA", level_umum: 1 },
  "JF Ahli Utama": { kode: "JF_AHLI_UTAMA", level_umum: 4 },
  "JF Ahli Madya": { kode: "JF_AHLI_MADYA", level_umum: 4 },
  "JF Ahli Muda": { kode: "JF_AHLI_MUDA", level_umum: 3 },
  "JF Ahli Pertama": { kode: "JF_AHLI_PERTAMA", level_umum: 2 },
  "JF Penyelia": { kode: "JF_PENYELIA", level_umum: 3 },
  "JF Mahir": { kode: "JF_MAHIR", level_umum: 2 },
  "JF Terampil": { kode: "JF_TERAMPIL", level_umum: 2 },
  "JF Pemula": { kode: "JF_PEMULA", level_umum: 1 },
};

const KOMPETENSI_COL_MAP: Record<string, string> = {
  C: "M.01",
  D: "M.02",
  E: "M.03",
  F: "M.04",
  G: "M.05",
  H: "M.06",
  I: "M.07",
  J: "M.08",
  K: "SK.01",
};

/**
 * Parsing berkas Excel Kamus Kompetensi ASN (PermenPANRB No. 38 Tahun 2017)
 */
export function parseKamusKompetensiExcel(filePath: string): ParsedKamusResult {
  const buf = fs.readFileSync(filePath);
  const files = unzipXlsxSync(buf);

  // 1. Ekstraksi Sheet 'Level per Jabatan' (sheet4.xml)
  const sheet4Xml = files["xl/worksheets/sheet4.xml"];
  if (!sheet4Xml) {
    throw new Error("Sheet 'Level per Jabatan' (sheet4.xml) tidak ditemukan dalam berkas Excel.");
  }
  const sheet4Rows = parseSheetRows(sheet4Xml);

  const jenjangList: JenjangItem[] = [];
  const standarList: StandarItem[] = [];

  // Baris 5 s.d. 18 merepresentasikan 14 tingkatan jabatan
  const jenjangDataRows = sheet4Rows.filter((r) => r.rowNum >= 5 && r.rowNum <= 18);

  let urutan = 1;
  for (const r of jenjangDataRows) {
    const kelompok = r.cells["A"] || "";
    const nama = r.cells["B"] || "";
    const meta = KODE_JENJANG_MAP[nama] || {
      kode: nama.toUpperCase().replace(/\s+/g, "_"),
      level_umum: parseInt(r.cells["C"] || "1", 10),
    };

    jenjangList.push({
      kode: meta.kode,
      nama,
      kelompok_jabatan: kelompok,
      level_standar_umum: meta.level_umum,
      urutan: urutan++,
    });

    for (const [col, kodeKompetensi] of Object.entries(KOMPETENSI_COL_MAP)) {
      const targetLevel = parseInt(r.cells[col] || "1", 10);
      standarList.push({
        kode_jenjang: meta.kode,
        kode_kompetensi: kodeKompetensi,
        target_level: targetLevel,
      });
    }
  }

  // 2. Ekstraksi Sheet 'Kamus Kompetensi' (sheet1.xml)
  const sheet1Xml = files["xl/worksheets/sheet1.xml"];
  if (!sheet1Xml) {
    throw new Error("Sheet 'Kamus Kompetensi' (sheet1.xml) tidak ditemukan dalam berkas Excel.");
  }
  const sheet1Rows = parseSheetRows(sheet1Xml);

  const indicators: IndicatorItem[] = [];
  const levelDescriptionsMap = new Map<string, LevelDescriptionItem>();

  // Baris 5 s.d. 139 merepresentasikan 135 butir indikator perilaku
  const kamusDataRows = sheet1Rows.filter((r) => r.rowNum >= 5 && r.rowNum <= 139);

  for (const r of kamusDataRows) {
    const kodeKompetensi = r.cells["C"] || "";
    const level = parseInt(r.cells["E"] || "1", 10);
    const deskripsiLevel = r.cells["F"] || "";
    const nomorIndikator = r.cells["G"] || "";
    const deskripsiIndikator = r.cells["H"] || "";

    if (kodeKompetensi && nomorIndikator) {
      indicators.push({
        kode_kompetensi: kodeKompetensi,
        level,
        nomor_indikator: nomorIndikator,
        deskripsi_indikator: deskripsiIndikator,
      });

      const levelKey = `${kodeKompetensi}_L${level}`;
      if (!levelDescriptionsMap.has(levelKey)) {
        levelDescriptionsMap.set(levelKey, {
          kode_kompetensi: kodeKompetensi,
          level,
          nama_level: `Level ${level}`,
          deskripsi: deskripsiLevel,
        });
      }
    }
  }

  const levelDescriptions = Array.from(levelDescriptionsMap.values());

  return {
    jenjangList,
    standarList,
    levelDescriptions,
    indicators,
  };
}

