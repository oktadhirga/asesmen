import { poolConnection } from "./connection";

async function runMigration() {
  const conn = await poolConnection.getConnection();
  try {
    console.log("Membuat tabel jenjang_jabatan...");
    await conn.query(`
      CREATE TABLE IF NOT EXISTS jenjang_jabatan (
        id int AUTO_INCREMENT PRIMARY KEY,
        kode varchar(50) NOT NULL UNIQUE,
        nama varchar(255) NOT NULL,
        kelompok_jabatan varchar(100) NOT NULL,
        level_standar_umum int NOT NULL,
        urutan int DEFAULT 0,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log("Membuat tabel standar_kompetensi_jabatan...");
    await conn.query(`
      CREATE TABLE IF NOT EXISTS standar_kompetensi_jabatan (
        id int AUTO_INCREMENT PRIMARY KEY,
        jenjang_jabatan_id int NOT NULL,
        competency_id int NOT NULL,
        target_level int NOT NULL,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_skj_jenjang FOREIGN KEY (jenjang_jabatan_id) REFERENCES jenjang_jabatan (id) ON DELETE CASCADE,
        CONSTRAINT fk_skj_competency FOREIGN KEY (competency_id) REFERENCES competencies (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log("Membuat tabel competency_levels...");
    await conn.query(`
      CREATE TABLE IF NOT EXISTS competency_levels (
        id int AUTO_INCREMENT PRIMARY KEY,
        competency_id int NOT NULL,
        level int NOT NULL,
        nama_level varchar(255) NOT NULL,
        deskripsi text NOT NULL,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_cl_competency FOREIGN KEY (competency_id) REFERENCES competencies (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log("Membuat tabel competency_indicators...");
    await conn.query(`
      CREATE TABLE IF NOT EXISTS competency_indicators (
        id int AUTO_INCREMENT PRIMARY KEY,
        competency_level_id int NOT NULL,
        nomor_indikator varchar(50) NOT NULL,
        deskripsi_indikator text NOT NULL,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_ci_level FOREIGN KEY (competency_level_id) REFERENCES competency_levels (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Check users columns
    const [userCols]: any = await conn.query("SHOW COLUMNS FROM users");
    const userColNames = userCols.map((c: any) => c.Field);
    if (!userColNames.includes("jenjang_jabatan_id")) {
      console.log("Menambahkan kolom jenjang_jabatan_id ke users...");
      await conn.query(`
        ALTER TABLE users
        ADD COLUMN jenjang_jabatan_id int NULL,
        ADD CONSTRAINT fk_users_jenjang FOREIGN KEY (jenjang_jabatan_id) REFERENCES jenjang_jabatan (id)
      `);
    }
    if (userColNames.includes("jenjang_jabatan")) {
      console.log("Menghapus enum lama jenjang_jabatan dari users...");
      await conn.query("ALTER TABLE users DROP COLUMN jenjang_jabatan");
    }

    // Check assessment_sessions columns
    const [sessCols]: any = await conn.query("SHOW COLUMNS FROM assessment_sessions");
    const sessColNames = sessCols.map((c: any) => c.Field);
    if (!sessColNames.includes("target_jenjang_id")) {
      console.log("Menambahkan kolom target_jenjang_id ke assessment_sessions...");
      await conn.query(`
        ALTER TABLE assessment_sessions
        ADD COLUMN target_jenjang_id int NULL,
        ADD CONSTRAINT fk_sess_jenjang FOREIGN KEY (target_jenjang_id) REFERENCES jenjang_jabatan (id)
      `);
    }
    if (sessColNames.includes("target_jenjang")) {
      console.log("Menghapus enum lama target_jenjang dari assessment_sessions...");
      await conn.query("ALTER TABLE assessment_sessions DROP COLUMN target_jenjang");
    }

    console.log("✅ Migrasi skema database berhasil selesai!");
  } catch (err) {
    console.error("❌ Gagal migrasi skema:", err);
    throw err;
  } finally {
    conn.release();
    process.exit(0);
  }
}

runMigration();

