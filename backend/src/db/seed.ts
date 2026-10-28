import { db } from "./connection";
import {
  competencies,
  questions,
  questionOptions,
  users,
  jenjangJabatan,
  standarKompetensiJabatan,
  competencyLevels,
  competencyIndicators,
} from "./schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { parseKamusKompetensiExcel } from "../utils/excel-parser";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

function getExcelPath(): string {
  const candidates = [
    resolve(process.cwd(), "Kamus_Kompetensi_ASN.xlsx"),
    resolve(__dirname, "../../../Kamus_Kompetensi_ASN.xlsx"),
    resolve(process.cwd(), "../Kamus_Kompetensi_ASN.xlsx"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0]!;
}

const KODE_TO_KOMP_MAP: Record<string, string> = {
  "M.01": "KOMP-01",
  "M.02": "KOMP-02",
  "M.03": "KOMP-03",
  "M.04": "KOMP-04",
  "M.05": "KOMP-05",
  "M.06": "KOMP-06",
  "M.07": "KOMP-07",
  "M.08": "KOMP-08",
  "SK.01": "KOMP-09",
};

export const initialCompetencies = [
  {
    kode: "KOMP-01",
    nama: "Integritas",
    kategori: "MANAJERIAL" as const,
    deskripsi:
      "Konsisten berperilaku selaras dengan nilai, norma dan/atau etika organisasi, jujur dalam hubungan dengan manajemen, rekan kerja, bawahan langsung, dan pemangku kepentingan.",
    bobot_standar: "3.00",
  },
  {
    kode: "KOMP-02",
    nama: "Kerjasama",
    kategori: "MANAJERIAL" as const,
    deskripsi:
      "Kemampuan menjalin, membina, mempertahankan hubungan kerja yang efektif, memiliki komitmen saling membantu dalam penyelesaian tugas bersama.",
    bobot_standar: "3.00",
  },
  {
    kode: "KOMP-03",
    nama: "Komunikasi",
    kategori: "MANAJERIAL" as const,
    deskripsi:
      "Kemampuan untuk menerangkan pandangan dan gagasan secara jelas, sistematis disertai petunjuk yang tepat bagi orang lain, serta mendengarkan secara aktif.",
    bobot_standar: "3.00",
  },
  {
    kode: "KOMP-04",
    nama: "Orientasi pada Hasil",
    kategori: "MANAJERIAL" as const,
    deskripsi:
      "Kemampuan mempertahankan komitmen pribadi yang tinggi untuk menyelesaikan tugas, dapat diandalkan, bertanggung jawab, serta mampu mengatasi hambatan guna mencapai kinerja optimal.",
    bobot_standar: "3.00",
  },
  {
    kode: "KOMP-05",
    nama: "Pelayanan Publik",
    kategori: "MANAJERIAL" as const,
    deskripsi:
      "Kemampuan dalam memberikan pelayanan prima yang berorientasi pada kepuasan penerima layanan, bersikap transparan, tanggap, dan tidak diskriminatif.",
    bobot_standar: "3.00",
  },
  {
    kode: "KOMP-06",
    nama: "Pengembangan Diri dan Orang Lain",
    kategori: "MANAJERIAL" as const,
    deskripsi:
      "Kemampuan untuk meningkatkan pengetahuan dan keterampilan diri, serta memfasilitasi pengembangan potensi rekan kerja dan bawahan secara berkelanjutan.",
    bobot_standar: "3.00",
  },
  {
    kode: "KOMP-07",
    nama: "Mengelola Perubahan",
    kategori: "MANAJERIAL" as const,
    deskripsi:
      "Kemampuan dalam menyesuaikan diri dengan situasi baru, memimpin atau mendukung perubahan organisasi menuju tata kelola pemerintahan yang adaptif dan inovatif.",
    bobot_standar: "3.00",
  },
  {
    kode: "KOMP-08",
    nama: "Pengambilan Keputusan",
    kategori: "MANAJERIAL" as const,
    deskripsi:
      "Kemampuan membuat keputusan yang tepat waktu dan berdasarkan fakta, serta bertanggung jawab terhadap implikasi dan dampak keputusan yang diambil.",
    bobot_standar: "3.00",
  },
  {
    kode: "KOMP-09",
    nama: "Perekat Bangsa",
    kategori: "SOSIO_KULTURAL" as const,
    deskripsi:
      "Kemampuan mempromosikan sikap toleransi, persatuan, dan kebhinekaan dalam masyarakat majemuk serta menjaga keutuhan Negara Kesatuan Republik Indonesia.",
    bobot_standar: "3.00",
  },
];

export const initialQuestions = [
  // 1. Integritas (KOMP-01) - Soal 1
  {
    compKode: "KOMP-01",
    kode_soal: "SJT-INT-01",
    skenario_kasus:
      "Anda bertugas sebagai pejabat pengadaan barang dan jasa di dinas. Salah satu vendor peserta tender yang juga merupakan kerabat dekat Anda meminta bantuan agar berkas administrasinya yang kurang lengkap dapat diloloskan dengan janji akan segera melengkapinya setelah evaluasi tahap awal selesai. Sikap yang paling tepat Anda ambil adalah...",
    target_level: 2,
    options: [
      {
        label: "A",
        teks_opsi: "Menolak permintaan tersebut dengan tegas, menjelaskan bahwa seluruh berkas wajib lengkap sesuai batas waktu yang diatur dalam regulasi, dan menyarankan mengikuti prosedur resmi.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Meminta pendapat ketua panitia pengadaan terlebih dahulu terkait status berkas tersebut sebelum mengambil keputusan akhir.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Menyarankan kerabat tersebut untuk melobi anggota panitia lainnya agar keputusan tidak sepenuhnya berada di tangan Anda.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Mengabulkan permintaan tersebut karena yakin kerabat tersebut beritikad baik dan pasti melengkapinya nanti.",
        bobot_nilai: 1,
      },
    ],
  },
  // 1. Integritas (KOMP-01) - Soal 2
  {
    compKode: "KOMP-01",
    kode_soal: "SJT-INT-02",
    skenario_kasus:
      "Anda menemukan kekeliruan perhitungan pada laporan realisasi anggaran triwulanan yang menguntungkan sisa pagu unit kerja Anda. Rekan Anda menyarankan untuk membiarkannya karena laporan telah ditandatangani oleh pimpinan. Tindakan yang Anda lakukan adalah...",
    target_level: 3,
    options: [
      {
        label: "A",
        teks_opsi: "Segera menyusun rekonsiliasi data dan melaporkan kekeliruan tersebut kepada atasan langsung beserta usulan revisi laporan keuangan.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Mencatat kekeliruan tersebut dan menunggu saat audit internal rutin untuk menyampaikan koreksi secara resmi.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Menyesuaikan pengeluaran triwulan berikutnya agar secara kumulatif selisih anggaran tersebut tertutupi tanpa membuat revisi formal.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Mengikuti saran rekan kerja demi menjaga nama baik unit kerja dan menghindari teguran atasan.",
        bobot_nilai: 1,
      },
    ],
  },
  // 2. Kerjasama (KOMP-02) - Soal 1
  {
    compKode: "KOMP-02",
    kode_soal: "SJT-KS-01",
    skenario_kasus:
      "Unit kerja Anda dibebani tugas mendesak untuk menyusun dokumen evaluasi SAKIP dalam waktu 3 hari. Seorang anggota tim menolak bagian tugasnya karena merasa beban kerjanya tidak proporsional dibanding rekan lain. Sikap Anda sebagai rekan tim adalah...",
    target_level: 2,
    options: [
      {
        label: "A",
        teks_opsi: "Mengajak seluruh anggota tim bermusyawarah secara transparan untuk membagi ulang beban kerja secara adil dan berkomitmen saling membantu agar target selesai tepat waktu.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Mengambil alih sebagian tugas anggota tersebut agar pekerjaan lekas berjalan tanpa memicu konflik berkepanjangan.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Melaporkan sikap anggota tersebut langsung kepada pimpinan agar diberikan teguran disiplin.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Membiarkan anggota tersebut dan fokus menyelesaikan porsi tugas pribadi masing-masing.",
        bobot_nilai: 1,
      },
    ],
  },
  // 2. Kerjasama (KOMP-02) - Soal 2
  {
    compKode: "KOMP-02",
    kode_soal: "SJT-KS-02",
    skenario_kasus:
      "Instansi Anda membentuk tim gugus tugas lintas Organisasi Perangkat Daerah (OPD) untuk penanganan stunting. Perwakilan dari dinas lain terkesan pasif dan lambat memberikan data dukung yang dibutuhkan tim Anda. Respon yang paling tepat adalah...",
    target_level: 3,
    options: [
      {
        label: "A",
        teks_opsi: "Melakukan koordinasi proaktif, mendatangi unit terkait untuk memahami hambatan mereka, serta menawarkan format data yang lebih sederhana untuk mempercepat pengisian.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Mengirimkan surat teguran dinas resmi kedua dengan tembusan kepada Sekretaris Daerah.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Melanjutkan analisis tanpa data dari OPD tersebut dan mencantumkan keterangan tidak tersedianya data pada laporan akhir.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Menunggu hingga OPD tersebut merespon dengan sendirinya tanpa melakukan upaya konfirmasi.",
        bobot_nilai: 1,
      },
    ],
  },
  // 3. Komunikasi (KOMP-03) - Soal 1
  {
    compKode: "KOMP-03",
    kode_soal: "SJT-KOM-01",
    skenario_kasus:
      "Anda ditugaskan menyosialisasikan regulasi baru terkait perizinan berusaha kepada kelompok asosiasi UMKM yang sebelumnya belum memahami sistem perizinan digital OSS-RBA. Strategi komunikasi yang Anda pilih adalah...",
    target_level: 2,
    options: [
      {
        label: "A",
        teks_opsi: "Menyampaikan substansi regulasi menggunakan bahasa yang lugas, ilustrasi kasus nyata, visual infografis, dan menyediakan sesi simulasi praktik langsung.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Membacakan pasal-pasal kunci secara runtut sesuai batang tubuh peraturan perundang-undangan dan membagikan salinan dokumen PDF.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Membuka sesi tanya jawab sejak awal pertemuan tanpa memberikan paparan pengantar kerangka konsep regulasi.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Meminta peserta membaca regulasi mandiri di portal resmi dan mengirimkan pertanyaan tertulis lewat surat elektronik.",
        bobot_nilai: 1,
      },
    ],
  },
  // 3. Komunikasi (KOMP-03) - Soal 2
  {
    compKode: "KOMP-03",
    kode_soal: "SJT-KOM-02",
    skenario_kasus:
      "Saat rapat pimpinan, seorang rekan sejawat menyampaikan kritik tajam di hadapan peserta rapat bahwa data analisis yang Anda susun dinilai tidak akurat. Cara Anda merespon situasi tersebut adalah...",
    target_level: 3,
    options: [
      {
        label: "A",
        teks_opsi: "Mendengarkan kritik dengan tenang, mengklarifikasi sumber data dan metodologi analisis secara objektif, serta terbuka melakukan rekonsiliasi data jika ada perbedaan fakta.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Meminta waktu khusus setelah rapat selesai untuk berdiskusi empat mata dengan rekan tersebut guna menghindari polemik di forum.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Memotong pernyataan rekan tersebut secara langsung untuk mempertahankan integritas data yang telah Anda presentasikan.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Diam tidak menanggapi kritik tersebut dan membiarkan pimpinan rapat yang mengambil alih kesimpulan.",
        bobot_nilai: 1,
      },
    ],
  },
  // 4. Orientasi pada Hasil (KOMP-04) - Soal 1
  {
    compKode: "KOMP-04",
    kode_soal: "SJT-OPH-01",
    skenario_kasus:
      "Target penyerapan anggaran belanja modal fisik dinas Anda baru mencapai 40% menjelang akhir triwulan ketiga akibat kendala keterlambatan lelang dan cuaca ekstrim di lapangan. Langkah yang Anda ambil adalah...",
    target_level: 2,
    options: [
      {
        label: "A",
        teks_opsi: "Menyusun kurva penyesuaian jadwal pelaksanaan (rescheduling), menambah shift kerja rekanan di lapangan, dan melakukan monitoring mingguan secara ketat.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Mengajukan revisi pergeseran target anggaran ke triwulan keempat pada perubahan APBD.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Menyerahkan sepenuhnya kepada pihak kontraktor pelaksana untuk mengejar sisa keterlambatan pekerjaan.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Membuat nota dinas ke atasan yang menyatakan bahwa target tidak tercapai murni akibat faktor cuaca di luar kendali.",
        bobot_nilai: 1,
      },
    ],
  },
  // 4. Orientasi pada Hasil (KOMP-04) - Soal 2
  {
    compKode: "KOMP-04",
    kode_soal: "SJT-OPH-02",
    skenario_kasus:
      "Aplikasi sistem kepegawaian baru yang wajib diimplementasikan mengalami gangguan server (down) pada hari terakhir batas pemutakhiran data mandiri ASN. Tindakan paling tepat adalah...",
    target_level: 3,
    options: [
      {
        label: "A",
        teks_opsi: "Segera berkoordinasi dengan tim teknis TI dinas komunikasi dan informatika untuk penanganan darurat, sekaligus menyiapkan kanal pengumpulan berkas cadangan secara paralel.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Menerbitkan pengumuman perpanjangan waktu pengumpulan data selama dua hari ke depan.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Menunggu hingga server kembali normal tanpa melakukan tindakan kontingensi alternatif.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Menyarankan pegawai untuk mencoba terus secara mandiri hingga larut malam.",
        bobot_nilai: 1,
      },
    ],
  },
  // 5. Pelayanan Publik (KOMP-05) - Soal 1
  {
    compKode: "KOMP-05",
    kode_soal: "SJT-PP-01",
    skenario_kasus:
      "Seorang warga lansia datang ke loket pelayanan administrasi kependudukan tanpa membawa salah satu berkas persyaratan fotokopi dokumen pendukung. Jam pelayanan kantor tersisa 15 menit sebelum tutup. Sikap petugas yang ideal adalah...",
    target_level: 2,
    options: [
      {
        label: "A",
        teks_opsi: "Menyambut ramah, membantu memeriksa kebenaran data pada database sistem, membantu memfotokopikan dokumen jika berkas asli ada, dan memproses permohonan hingga tuntas.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Menerima berkas yang ada dan meminta keluarga pemohon untuk menyusulkan kekurangannya pada keesokan harinya.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Menjelaskan aturan secara normatif bahwa berkas tidak lengkap tidak dapat diproses dan meminta datang kembali besok.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Menolak melayani karena jam operasional kantor sudah hampir berakhir.",
        bobot_nilai: 1,
      },
    ],
  },
  // 5. Pelayanan Publik (KOMP-05) - Soal 2
  {
    compKode: "KOMP-05",
    kode_soal: "SJT-PP-02",
    skenario_kasus:
      "Terdapat keluhan viral di media sosial mengenai lambatnya proses perizinan di dinas Anda. Analisis internal menunjukkan keterlambatan disebabkan kekurangan personel verifikator. Langkah perbaikan yang semestinya ditempuh adalah...",
    target_level: 3,
    options: [
      {
        label: "A",
        teks_opsi: "Merespon keluhan masyarakat dengan empati di media resmi, menyederhanakan SOP meja verifikasi, dan mengalokasikan tenaga bantuan sementara dari seksi lain.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Membuat klarifikasi resmi bahwa keterlambatan terjadi karena pemohon izin membludak di luar estimasi normal dinas.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Menghubungi pembuat konten keluhan secara privat dan memprioritaskan izin miliknya terlebih dahulu agar postingan dihapus.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Tidak menanggapi keluhan media sosial karena instansi hanya memproses aduan resmi melalui SP4N-LAPOR.",
        bobot_nilai: 1,
      },
    ],
  },
  // 6. Pengembangan Diri dan Orang Lain (KOMP-06) - Soal 1
  {
    compKode: "KOMP-06",
    kode_soal: "SJT-PDO-01",
    skenario_kasus:
      "Seorang staf baru di subbagian Anda memiliki potensi kerja baik namun tampak kesulitan mengoperasikan aplikasi pengolah data statistik yang krusial bagi tugas unit. Sikap Anda adalah...",
    target_level: 2,
    options: [
      {
        label: "A",
        teks_opsi: "Menyediakan waktu khusus untuk memberikan bimbingan teknis bertahap (mentoring), membagikan modul latihan, dan mengevaluasi kemajuannya secara berkala.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Menyarankan staf tersebut untuk mengikuti kursus mandiri daring di luar jam kerja dinas.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Mengambil alih pekerjaan pengolahan data statistik tersebut agar laporan dinas selesai tepat waktu.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Menegur staf tersebut karena dianggap kurang menguasai kompetensi dasar yang dipersyaratkan formasi jabatannya.",
        bobot_nilai: 1,
      },
    ],
  },
  // 6. Pengembangan Diri dan Orang Lain (KOMP-06) - Soal 2
  {
    compKode: "KOMP-06",
    kode_soal: "SJT-PDO-02",
    skenario_kasus:
      "Terdapat peluang pelatihan kepemimpinan dan manajemen proyek bersertifikasi internasional bagi ASN, namun beban tugas operasional rutin Anda sedang sangat padat. Tindakan Anda adalah...",
    target_level: 3,
    options: [
      {
        label: "A",
        teks_opsi: "Mengatur skala prioritas pekerjaan, mendelegasikan sebagian tugas operasional dengan instruksi jelas, dan mendaftar pelatihan demi peningkatan kompetensi jangka panjang organisasi.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Meminta izin pimpinan untuk mengikuti sebagian sesi pelatihan yang tidak bertabrakan dengan jadwal kantor.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Menolak kesempatan pelatihan tersebut demi memastikan tugas rutin terselesaikan tanpa hambatan delegasi.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Mendaftar pelatihan hanya untuk menggugurkan kewajiban pengembangan kompetensi minimal 20 JP per tahun tanpa komitmen implementasi hasil.",
        bobot_nilai: 1,
      },
    ],
  },
  // 7. Mengelola Perubahan (KOMP-07) - Soal 1
  {
    compKode: "KOMP-07",
    kode_soal: "SJT-MP-01",
    skenario_kasus:
      "Pemerintah daerah memberlakukan sistem kerja baru berbasis digital (paperless office) secara menyeluruh. Sebagian besar pegawai senior di ruangan Anda mengeluhkan sistem baru tersebut dan tetap mencetak berkas fisik. Sikap Anda adalah...",
    target_level: 2,
    options: [
      {
        label: "A",
        teks_opsi: "Menjadi pelopor penerapan sistem digital, aktif mendampingi rekan senior yang kesulitan, dan mendemonstrasikan efisiensi pengarsipan elektronik.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Menerapkan sistem digital untuk pekerjaan pribadi namun membiarkan rekan kerja lain tetap menggunakan metode konvensional.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Mengikuti kebiasaan mayoritas ruangan untuk tetap mencetak dokumen fisik agar tercipta keharmonisan kerja.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Mengusulkan kepada pimpinan dinas untuk membatalkan penerapan sistem digital di unit kerja Anda.",
        bobot_nilai: 1,
      },
    ],
  },
  // 7. Mengelola Perubahan (KOMP-07) - Soal 2
  {
    compKode: "KOMP-07",
    kode_soal: "SJT-MP-02",
    skenario_kasus:
      "Akibat penataan kelembagaan SOTK baru, unit kerja Anda digabung dengan seksi lain dan beberapa fungsi tugas dihapuskan. Muncul kecemasan di kalangan staf terkait ketidakpastian uraian tugas harian. Respon Anda adalah...",
    target_level: 3,
    options: [
      {
        label: "A",
        teks_opsi: "Cepat beradaptasi, memetakan kembali matriks pembagian peran baru secara proaktif bersama rekan seksi gabungan, dan menjaga optimisme tim dalam transisi.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Menunggu instruksi resmi petunjuk teknis tertulis dari bagian organisasi sebelum memulai aktivitas pekerjaan baru.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Menyampaikan keluhan secara terbuka dalam rapat evaluasi bahwa restrukturisasi mengganggu kinerja yang telah mapan.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Mengajukan mutasi pindah ke dinas lain yang struktur organisasinya tidak mengalami perubahan.",
        bobot_nilai: 1,
      },
    ],
  },
  // 8. Pengambilan Keputusan (KOMP-08) - Soal 1
  {
    compKode: "KOMP-08",
    kode_soal: "SJT-PK-01",
    skenario_kasus:
      "Dalam situasi tanggap darurat bencana tanah longsor di wilayah binaan, Anda dihadapkan pada kebutuhan pengadaan tenda pengungsian mendesak, sementara pejabat pembuat komitmen sedang bertugas di luar pulau dan koneksi komunikasi terputus. Tindakan yang paling tepat adalah...",
    target_level: 2,
    options: [
      {
        label: "A",
        teks_opsi: "Mengambil diskresi tindakan kedaruratan berpedoman pada regulasi penanggulangan bencana, mendokumentasikan fakta situasi di lapangan, dan segera melaporkannya ke pimpinan begitu jalur komunikasi terbuka.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Mengadakan tenda secara mandiri menggunakan dana pribadi dan menuntut penggantian biaya kemudian hari.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Menunggu hingga pejabat definitif dapat dihubungi agar tidak menyalahi aturan wewenang keuangan.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Mengalihkan tanggung jawab penanganan kepada instansi relawan non-pemerintah.",
        bobot_nilai: 1,
      },
    ],
  },
  // 8. Pengambilan Keputusan (KOMP-08) - Soal 2
  {
    compKode: "KOMP-08",
    kode_soal: "SJT-PK-02",
    skenario_kasus:
      "Terdapat dua alternatif kebijakan penanganan pedagang kaki lima di kawasan cagar budaya: merelokasi ke pasar baru (didukung pemilik toko namun ditolak pedagang) atau menata zonasi waktu (didukung pedagang namun dikhawatirkan mengganggu lalu lintas). Cara Anda memutuskannya adalah...",
    target_level: 3,
    options: [
      {
        label: "A",
        teks_opsi: "Menganalisis data dampak ekonomi-sosial secara komprehensif, melibatkan perwakilan kedua pihak dalam FGD terarah, dan menetapkan skema zonasi adaptif dengan pengawasan satpol PP terjadwal.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Memilih opsi relokasi penuh karena dinilai lebih memberikan kepastian tata ruang perkotaan jangka panjang.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Menunda keputusan dan menyerahkan penetapan alternatif kepada pimpinan daerah tertinggi (Bupati/Walikota).",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Memilih opsi yang paling sedikit mendapatkan sorotan negatif dari media massa lokal.",
        bobot_nilai: 1,
      },
    ],
  },
  // 9. Perekat Bangsa (KOMP-09) - Soal 1
  {
    compKode: "KOMP-09",
    kode_soal: "SJT-PB-01",
    skenario_kasus:
      "Di lingkungan kantor Anda terjadi ketegangan antarpegawai akibat unggahan bernuansa SARA oleh salah seorang ASN di grup percakapan internal menjelang kontestasi Pilkada daerah. Tindakan Anda sebagai sesama ASN adalah...",
    target_level: 2,
    options: [
      {
        label: "A",
        teks_opsi: "Mengingatkan dengan tegas di grup tentang asas netralitas ASN dan etika bermedia sosial, mengajak rekan-rekan meredakan perdebatan, serta melaporkan ke pembina kepegawaian jika terus berlanjut.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Menegur pengunggah konten secara privat agar menghapus postingan tersebut demi menghindari kegaduhan.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Memilih keluar dari grup percakapan kantor agar tidak terlibat dalam polemik politik.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Mendukung salah satu pihak yang pendapatnya menurut Anda lebih rasional dan dapat dipertanggungjawabkan.",
        bobot_nilai: 1,
      },
    ],
  },
  // 9. Perekat Bangsa (KOMP-09) - Soal 2
  {
    compKode: "KOMP-09",
    kode_soal: "SJT-PB-02",
    skenario_kasus:
      "Anda ditunjuk sebagai ketua panitia peringatan Hari Kemerdekaan RI tingkat dinas. Terdapat usulan perayaan kebudayaan daerah yang beragam, namun sebagian anggota kelompok minoritas merasa tradisinya kurang terwakili dalam susunan acara. Respon Anda adalah...",
    target_level: 3,
    options: [
      {
        label: "A",
        teks_opsi: "Mengakomodasi perwakilan seluruh unsur etnis/budaya yang ada di kantor, menyusun pawai kebinekaan bersama, dan menjadikan keberagaman sebagai tema sentral persatuan.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Menyelenggarakan kegiatan perayaan yang bersifat netral seperti lomba olahraga tanpa menampilkan unsur budaya tertentu.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Membatasi keterlibatan anggota yang berbeda keyakinan karena khawatir terjadi perdebatan tata cara kegiatan.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Menolak penunjukan sebagai ketua panitia dengan alasan perbedaan latar belakang keagamaan.",
        bobot_nilai: 1,
      },
    ],
  },
];

export const initialUsers = [
  {
    nip: "198501012010011001",
    nama: "Administrator BKD / Asesor Utama",
    email: "admin.asesmen@bkd.go.id",
    role: "ADMIN" as const,
    jabatan: "Analis Kepegawaian Ahli Madya / Asesor SDM Aparatur",
    instansi: "Badan Kepegawaian Daerah",
    unit_kerja: "Bidang Penilaian Kinerja dan Asesmen ASN",
    kode_jenjang: "ADMINISTRATOR",
  },
  {
    nip: "199505122020121002",
    nama: "Ahmad Pratama, S.Kom",
    email: "ahmad.pratama@asn.go.id",
    role: "PESERTA" as const,
    jabatan: "Pranata Komputer Ahli Pertama",
    instansi: "Dinas Komunikasi dan Informatika",
    unit_kerja: "Seksi Infrastruktur dan Jaringan",
    kode_jenjang: "PELAKSANA",
  },
  {
    nip: "198808172014032003",
    nama: "Siti Rahmawati, S.AP., M.Si",
    email: "siti.rahmawati@asn.go.id",
    role: "PESERTA" as const,
    jabatan: "Kepala Sub Bagian Kepegawaian dan Umum",
    instansi: "Dinas Pendidikan dan Kebudayaan",
    unit_kerja: "Sekretariat Dinas",
    kode_jenjang: "PENGAWAS",
  },
  {
    nip: "197903252005011004",
    nama: "Drs. Budi Santoso, M.M.",
    email: "budi.santoso@asn.go.id",
    role: "PESERTA" as const,
    jabatan: "Kepala Bidang Pelayanan Perizinan",
    instansi: "Dinas Penanaman Modal dan PTSP",
    unit_kerja: "Bidang Perizinan dan Non Perizinan",
    kode_jenjang: "ADMINISTRATOR",
  },
];

export async function seedDatabase() {
  console.log("🌱 Menjalankan Seeder Database Asesmen ASN...");

  // 1. Seed Competencies
  console.log("  → Mengisi 9 Dimensi Kompetensi PermenPANRB...");
  for (const comp of initialCompetencies) {
    const existing = await db
      .select({ id: competencies.id })
      .from(competencies)
      .where(eq(competencies.kode, comp.kode))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(competencies).values(comp);
    } else {
      await db
        .update(competencies)
        .set(comp)
        .where(eq(competencies.kode, comp.kode));
    }
  }

  // Ambil mapping competency id dari database
  const allComps = await db.select().from(competencies);
  const compMap = new Map(allComps.map((c) => [c.kode, c.id]));

  // 2. Seed Kamus ASN: Jenjang Jabatan, Standar Level, Level Descriptions, Indikator Perilaku
  console.log("  → Mengisi Kamus ASN: 14 Jenjang Jabatan & Matriks Standar Level...");
  const excelPath = getExcelPath();
  const parsedKamus = parseKamusKompetensiExcel(excelPath);

  // 2a. Jenjang Jabatan (14 Jenjang)
  for (const j of parsedKamus.jenjangList) {
    const existingJ = await db
      .select({ id: jenjangJabatan.id })
      .from(jenjangJabatan)
      .where(eq(jenjangJabatan.kode, j.kode))
      .limit(1);

    if (existingJ.length === 0) {
      await db.insert(jenjangJabatan).values(j);
    } else {
      await db
        .update(jenjangJabatan)
        .set(j)
        .where(eq(jenjangJabatan.kode, j.kode));
    }
  }

  const allJenjang = await db.select().from(jenjangJabatan);
  const jenjangMap = new Map(allJenjang.map((j) => [j.kode, j.id]));

  // 2b. Standar Kompetensi Jabatan (126 Matriks)
  const existingStandards = await db.select({ id: standarKompetensiJabatan.id }).from(standarKompetensiJabatan);
  if (existingStandards.length < 126) {
    if (existingStandards.length > 0) {
      await db.delete(standarKompetensiJabatan);
    }
    const standardValues = [];
    for (const s of parsedKamus.standarList) {
      const jenjangId = jenjangMap.get(s.kode_jenjang);
      const kompKode = KODE_TO_KOMP_MAP[s.kode_kompetensi];
      const compId = kompKode ? compMap.get(kompKode) : undefined;
      if (jenjangId && compId) {
        standardValues.push({
          jenjang_jabatan_id: jenjangId,
          competency_id: compId,
          target_level: s.target_level,
        });
      }
    }
    if (standardValues.length > 0) {
      await db.insert(standarKompetensiJabatan).values(standardValues);
    }
  }

  // 2c. Competency Levels (45 Level)
  const existingLevels = await db.select({ id: competencyLevels.id }).from(competencyLevels);
  if (existingLevels.length < 45) {
    // Delete dependent indicators first to avoid FK constraint issues
    await db.delete(competencyIndicators);
    await db.delete(competencyLevels);

    const levelValues = [];
    for (const l of parsedKamus.levelDescriptions) {
      const kompKode = KODE_TO_KOMP_MAP[l.kode_kompetensi];
      const compId = kompKode ? compMap.get(kompKode) : undefined;
      if (compId) {
        levelValues.push({
          competency_id: compId,
          level: l.level,
          nama_level: l.nama_level,
          deskripsi: l.deskripsi,
        });
      }
    }
    if (levelValues.length > 0) {
      await db.insert(competencyLevels).values(levelValues);
    }
  }

  // 2d. Competency Indicators (135 Indikator Perilaku)
  const existingIndicators = await db.select({ id: competencyIndicators.id }).from(competencyIndicators);
  if (existingIndicators.length < 135) {
    if (existingIndicators.length > 0) {
      await db.delete(competencyIndicators);
    }
    const allLevels = await db.select().from(competencyLevels);
    const levelsMap = new Map(allLevels.map((l) => [`${l.competency_id}_${l.level}`, l.id]));

    const indicatorValues = [];
    for (const ind of parsedKamus.indicators) {
      const kompKode = KODE_TO_KOMP_MAP[ind.kode_kompetensi];
      const compId = kompKode ? compMap.get(kompKode) : undefined;
      const levelId = compId ? levelsMap.get(`${compId}_${ind.level}`) : undefined;
      if (levelId) {
        indicatorValues.push({
          competency_level_id: levelId,
          nomor_indikator: ind.nomor_indikator,
          deskripsi_indikator: ind.deskripsi_indikator,
        });
      }
    }
    if (indicatorValues.length > 0) {
      await db.insert(competencyIndicators).values(indicatorValues);
    }
  }

  // 3. Seed Questions & Options
  console.log("  → Mengisi Bank Soal Situational Judgment Test (SJT)...");
  for (const q of initialQuestions) {
    const compId = compMap.get(q.compKode);
    if (!compId) continue;

    const existingQ = await db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.kode_soal, q.kode_soal))
      .limit(1);

    let questionId: number;

    if (existingQ.length === 0) {
      const [insertResult] = await db.insert(questions).values({
        competency_id: compId,
        kode_soal: q.kode_soal,
        skenario_kasus: q.skenario_kasus,
        target_level: q.target_level,
      });
      questionId = Number(insertResult.insertId);
    } else {
      const firstQ = existingQ[0]!;
      questionId = firstQ.id;
      await db
        .update(questions)
        .set({
          competency_id: compId,
          skenario_kasus: q.skenario_kasus,
          target_level: q.target_level,
        })
        .where(eq(questions.id, questionId));
    }

    // Insert or update 4 options
    for (const opt of q.options) {
      const existingOptions = await db
        .select({ id: questionOptions.id, label: questionOptions.label })
        .from(questionOptions)
        .where(eq(questionOptions.question_id, questionId));

      const matchOpt = existingOptions.find((o) => o.label === opt.label);

      if (!matchOpt) {
        await db.insert(questionOptions).values({
          question_id: questionId,
          label: opt.label,
          teks_opsi: opt.teks_opsi,
          bobot_nilai: opt.bobot_nilai,
        });
      } else {
        await db
          .update(questionOptions)
          .set({
            teks_opsi: opt.teks_opsi,
            bobot_nilai: opt.bobot_nilai,
          })
          .where(eq(questionOptions.id, matchOpt.id));
      }
    }
  }

  // 4. Seed Demo Users
  console.log("  → Mengisi Akun Demo Admin & Peserta ASN...");
  const hashedPassword = await bcrypt.hash("password123", 10);

  for (const u of initialUsers) {
    const jenjangId = jenjangMap.get(u.kode_jenjang) || null;
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.nip, u.nip))
      .limit(1);

    const userData = {
      nip: u.nip,
      nama: u.nama,
      email: u.email,
      role: u.role,
      jabatan: u.jabatan,
      instansi: u.instansi,
      unit_kerja: u.unit_kerja,
      jenjang_jabatan_id: jenjangId,
      password_hash: hashedPassword,
    };

    if (existingUser.length === 0) {
      await db.insert(users).values(userData);
    } else {
      await db
        .update(users)
        .set(userData)
        .where(eq(users.nip, u.nip));
    }
  }

  console.log("✅ Seeding Berhasil Selesai!");
}

// Jalankan jika dieksekusi langsung
if (import.meta.main) {
  try {
    await seedDatabase();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error saat seeding:", error);
    process.exit(1);
  }
}
