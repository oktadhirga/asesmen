import { db } from "./connection";
import { competencies, questions, questionOptions, users } from "./schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

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
      "Kemampuan membuat keputusan yang tepat waktu dan berprinsip berdasarkan analisis risiko, informasi yang valid, serta mempertimbangkan kepentingan publik dan institusi.",
    bobot_standar: "3.00",
  },
  {
    kode: "KOMP-09",
    nama: "Perekat Bangsa",
    kategori: "SOSIO_KULTURAL" as const,
    deskripsi:
      "Kemampuan dalam mempromosikan sikap toleransi, keterbukaan, peka terhadap perbedaan latar belakang suku, agama, dan budaya serta menjaga persatuan bangsa dalam lingkungan kerja dan masyarakat.",
    bobot_standar: "3.00",
  },
];

export const initialQuestions = [
  // KOMP-01: Integritas
  {
    compKode: "KOMP-01",
    kode_soal: "SJT-INT-01",
    target_level: 2,
    skenario_kasus:
      "Anda ditugaskan sebagai panitia pengadaan barang dan jasa di dinas Anda. Seorang rekan kerja dekat yang juga merupakan kerabat dari salah satu penyedia barang meminta Anda membocorkan dokumen Harga Perkiraan Sendiri (HPS) dengan janji imbalan tanda terima kasih.",
    options: [
      {
        label: "A",
        teks_opsi: "Menolak tegas permintaan tersebut, mengingatkan rekan kerja tentang kode etik ASN dan konsekuensi hukum, serta melaporkan potensi intervensi kepada atasan langsung.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Menolak memberikan dokumen HPS dengan alasan sistem pengadaan sudah terkunci secara elektronik dan menghindari pembicaraan lebih lanjut.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Memberikan gambaran umum rentang pagu anggaran tanpa memberikan rincian dokumen spesifik agar hubungan pertemanan tetap terjaga.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Menyetujui permintaan tersebut selama dokumen tersebut tidak langsung diberikan kepada penyedia melainkan melalui perantara rekan Anda.",
        bobot_nilai: 1,
      },
    ],
  },
  {
    compKode: "KOMP-01",
    kode_soal: "SJT-INT-02",
    target_level: 1,
    skenario_kasus:
      "Saat menyusun Laporan Pertanggungjawaban (LPJ) kegiatan dinas, atasan Anda meminta Anda menambahkan bukti pengeluaran akomodasi fiktif untuk menutupi selisih biaya operasional yang tidak terduga.",
    options: [
      {
        label: "A",
        teks_opsi: "Menyampaikan secara sopan kepada atasan bahwa nota fiktif melanggar tata kelola keuangan negara, dan mengusulkan alternatif penyelesaian legal melalui revisi anggaran.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Menolak mengerjakan nota fiktif tersebut dan menyerahkan berkas laporan kepada pegawai lain.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Membuat nota fiktif tersebut namun meminta disposisi tertulis sebagai bentuk perlindungan diri bila ada pemeriksaan Inspektorat.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Langsung menuruti instruksi atasan karena menganggap perintah pimpinan adalah tanggung jawab penuh atasan.",
        bobot_nilai: 1,
      },
    ],
  },

  // KOMP-02: Kerjasama
  {
    compKode: "KOMP-02",
    kode_soal: "SJT-KRS-01",
    target_level: 2,
    skenario_kasus:
      "Dalam tim kerja penyusunan LAKIP (Laporan Akuntabilitas Kinerja), ada seorang anggota tim yang pasif dan sering terlambat menyerahkan data unitnya sehingga menghambat kemajuan seluruh tim.",
    options: [
      {
        label: "A",
        teks_opsi: "Mengajak anggota tersebut berdialog empat mata untuk memahami kendalanya, membantu merumuskan solusi teknis, dan menetapkan kesepakatan jadwal baru bersama.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Membagi beban kerja yang belum selesai kepada anggota tim lain yang lebih kompeten agar tenggat waktu tercapai.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Mengingatkan yang bersangkutan di grup chat tim agar merasa malu dan segera menyelesaikan tanggung jawabnya.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Membiarkan saja keterlambatan tersebut dan langsung melaporkan kelalaian yang bersangkutan kepada Kepala Dinas.",
        bobot_nilai: 1,
      },
    ],
  },
  {
    compKode: "KOMP-02",
    kode_soal: "SJT-KRS-02",
    target_level: 1,
    skenario_kasus:
      "Seksi Anda mendapatkan tugas lintas sektoral mendadak bersama unit kerja lain yang selama ini memiliki hubungan kerja kurang harmonis dengan seksi Anda.",
    options: [
      {
        label: "A",
        teks_opsi: "Menginisiasi pertemuan koordinasi awal yang inklusif untuk menyamakan persepsi, membagi peran secara adil, dan fokus pada target bersama demi kepentingan instansi.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Melaksanakan tugas bagian seksi sendiri dengan sebaik mungkin tanpa terlalu banyak campur tangan dalam urusan seksi lain.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Menunggu unit kerja lain mengambil inisiatif terlebih dahulu karena khawatir disalahartikan mengambil alih kewenangan.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Meminta atasan membatalkan pelibatan tim Anda dalam tugas lintas sektoral tersebut karena potensi konflik.",
        bobot_nilai: 1,
      },
    ],
  },

  // KOMP-03: Komunikasi
  {
    compKode: "KOMP-03",
    kode_soal: "SJT-KOM-01",
    target_level: 2,
    skenario_kasus:
      "Terdapat kebijakan baru mengenai absensi digital berbasis GPS yang menimbulkan penolakan keras dan kesalahpahaman dari sebagian besar pegawai di lingkungan instansi Anda.",
    options: [
      {
        label: "A",
        teks_opsi: "Menyusun bahan sosialisasi ringkas dan komunikatif berupa FAQ dan video panduan, membuka forum tanya-jawab terbuka untuk menampung kekhawatiran dan meluruskan persepsi.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Membuat surat edaran penegasan resmi yang menjelaskan dasar hukum dan kewajiban menaati aturan tersebut tanpa kompromi.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Menjelaskan aturan hanya kepada perwakilan pegawai yang paling vokal mengkritik kebijakan tersebut.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Mengabaikan keluhan pegawai dengan anggapan bahwa lama-kelamaan pegawai akan terbiasa dengan sendirinya.",
        bobot_nilai: 1,
      },
    ],
  },
  {
    compKode: "KOMP-03",
    kode_soal: "SJT-KOM-02",
    target_level: 1,
    skenario_kasus:
      "Saat mempresentasikan laporan evaluasi program kerja di hadapan pimpinan, salah seorang kepala seksi memotong penjelasan Anda dan menyebut data yang Anda sajikan tidak akurat.",
    options: [
      {
        label: "A",
        teks_opsi: "Mendengarkan dengan tenang, mengklarifikasi sumber data dan metodologi yang digunakan secara santun, serta menawarkan rekonsiliasi data bersama setelah sesi paparan.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Meminta pimpinan rapat memberikan waktu tambahan untuk membuktikan bahwa data yang Anda sajikan adalah benar.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Membalas kritik tersebut dengan langsung menunjuk kelemahan data dari unit kerja kepala seksi yang bersangkutan.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Menjadi defensif dan menghentikan presentasi karena merasa dipermalukan di depan umum.",
        bobot_nilai: 1,
      },
    ],
  },

  // KOMP-04: Orientasi pada Hasil
  {
    compKode: "KOMP-04",
    kode_soal: "SJT-OPH-01",
    target_level: 2,
    skenario_kasus:
      "Dua hari menjelang tenggat waktu penyerahan dokumen Rencana Kerja Anggaran (RKA), sistem server e-Budgeting pusat mengalami gangguan teknis fatal sehingga input data tertunda.",
    options: [
      {
        label: "A",
        teks_opsi: "Segera berkoordinasi dengan tim untuk menginput data secara offline pada template backup, mengawasi status server, dan menjadwalkan shift tim agar siap submit saat sistem pulih.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Menghubungi helpdesk pengelola sistem e-Budgeting secara berkala dan menunggu instruksi perpanjangan waktu resmi.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Menyerahkan laporan tertulis kepada atasan bahwa target tidak dapat dipenuhi murni karena kendala sistem pusat.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Menghentikan seluruh aktivitas pengerjaan anggaran sampai sistem benar-benar normal kembali tanpa membuat mitigasi.",
        bobot_nilai: 1,
      },
    ],
  },
  {
    compKode: "KOMP-04",
    kode_soal: "SJT-OPH-02",
    target_level: 1,
    skenario_kasus:
      "Anda ditargetkan menyelesaikan verifikasi 100 berkas permohonan kenaikan pangkat dalam 3 hari, padahal rata-rata harian Anda biasanya hanya mampu menyelesaikan 20 berkas.",
    options: [
      {
        label: "A",
        teks_opsi: "Menganalisis alur kerja untuk mengeliminasi inefisiensi, menetapkan target bertahap per jam, dan bersedia meluangkan waktu ekstra (lembur) demi menjaga ketepatan waktu.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Meminta bantuan rekan kerja yang sedang tidak memiliki beban tugas berat untuk bersama menyelesaikan berkas.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Mengerjakan verifikasi secara cepat dengan hanya memeriksa kelengkapan sampul berkas tanpa verifikasi substansi.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Menyampaikan keluhan kepada pimpinan bahwa target yang diberikan tidak manusiawi dan menuntut revisi target.",
        bobot_nilai: 1,
      },
    ],
  },

  // KOMP-05: Pelayanan Publik
  {
    compKode: "KOMP-05",
    kode_soal: "SJT-PLP-01",
    target_level: 2,
    skenario_kasus:
      "Seorang warga lanjut usia datang ke loket pelayanan 10 menit sebelum jam kantor tutup dengan berkas permohonan yang belum lengkap satu syarat administratif penting.",
    options: [
      {
        label: "A",
        teks_opsi: "Menyambut warga dengan ramah, memverifikasi berkas yang ada, mencatat nomor kontak warga, serta memberikan checklist petunjuk yang jelas cara melengkapi syarat yang kurang.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Memproses berkas seadanya terlebih dahulu dan meminta warga datang kembali besok pagi tepat waktu.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Menolak berkas secara tegas karena jam operasional pelayanan akan segera berakhir dan berkas belum lengkap.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Mengabaikan warga tersebut dan meminta petugas keamanan loket untuk menutup pintu loket.",
        bobot_nilai: 1,
      },
    ],
  },
  {
    compKode: "KOMP-05",
    kode_soal: "SJT-PLP-02",
    target_level: 1,
    skenario_kasus:
      "Di ruang tunggu pelayanan masyarakat, terjadi antrean panjang karena sistem antrean elektronik mengalami kerusakan jaringan dan beberapa warga mulai mengeluh serta emosi.",
    options: [
      {
        label: "A",
        teks_opsi: "Segera keluar menemui warga antrean, menyampaikan permohonan maaf atas ketidaknyamanan, membagikan nomor antrean manual, dan memastikan proses berjalan tertib.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Fokus memperbaiki sistem koneksi jaringan di ruang server tanpa memberikan penjelasan kepada masyarakat.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Meminta aparat keamanan untuk menenangkan warga yang membuat keributan di loket.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Menutup sementara tirai loket dan menunggu hingga warga tenang sendiri baru melanjutkan pelayanan.",
        bobot_nilai: 1,
      },
    ],
  },

  // KOMP-06: Pengembangan Diri dan Orang Lain
  {
    compKode: "KOMP-06",
    kode_soal: "SJT-PDO-01",
    target_level: 2,
    skenario_kasus:
      "Seorang pegawai baru di tim Anda memiliki potensi analisis data yang tinggi namun belum memahami regulasi kepegawaian dan prosedur birokrasi pemerintahan.",
    options: [
      {
        label: "A",
        teks_opsi: "Menyusun agenda mentoring berkala, memberikan referensi regulasi relevan, serta melibatkannya langsung dalam tugas nyata dengan memberikan umpan balik konstruktif.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Mengusulkan nama pegawai baru tersebut kepada pimpinan untuk diikutkan dalam diklat teknis formal kepegawaian.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Hanya memberikan tugas-tugas administratif ringan agar pegawai tersebut tidak melakukan kesalahan birokrasi.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Membiarkan pegawai tersebut belajar mandiri secara otodidak karena setiap ASN dituntut untuk mandiri.",
        bobot_nilai: 1,
      },
    ],
  },
  {
    compKode: "KOMP-06",
    kode_soal: "SJT-PDO-02",
    target_level: 1,
    skenario_kasus:
      "Instansi Anda menawarkan program beasiswa pelatihan sertifikasi keahlian digital secara gratis di luar jam kerja, namun banyak pegawai enggan mendaftar karena merasa sudah nyaman.",
    options: [
      {
        label: "A",
        teks_opsi: "Mendaftarkan diri untuk mengikuti sertifikasi tersebut guna meningkatkan kompetensi pribadi, serta mengajak dan membagikan manfaatnya kepada rekan kerja lain.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Mendaftar hanya untuk diri sendiri tanpa perlu membujuk rekan kerja lain yang tidak berminat.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Menunggu hingga pelatihan tersebut diwajibkan secara resmi oleh Surat Perintah Kepala Dinas.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Tidak berminat mendaftar karena menganggap pelatihan di luar jam kerja mengurangi waktu istirahat.",
        bobot_nilai: 1,
      },
    ],
  },

  // KOMP-07: Mengelola Perubahan
  {
    compKode: "KOMP-07",
    kode_soal: "SJT-MPR-01",
    target_level: 2,
    skenario_kasus:
      "Dinas Anda melakukan migrasi penuh dari sistem pengarsipan berkas manual ke Sistem Informasi Kearsipan Dinamis Terintegrasi (SRIKANDI). Beberapa pegawai senior menolak menggunakan sistem baru.",
    options: [
      {
        label: "A",
        teks_opsi: "Menjadi pelopor penerapan sistem baru, secara proaktif mendampingi dan melatih rekan senior langkah demi langkah dengan sabar hingga mereka lancar mengoperasikannya.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Menggunakan aplikasi secara optimal untuk seluruh berkas tanggung jawab Anda sendiri sesuai instruksi pimpinan.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Mengusulkan kepada pimpinan agar pegawai senior diberi kelonggaran tetap menggunakan sistem manual.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Ikut mengeluhkan aplikasi baru tersebut di belakang forum karena merasa sistem lama lebih mudah.",
        bobot_nilai: 1,
      },
    ],
  },
  {
    compKode: "KOMP-07",
    kode_soal: "SJT-MPR-02",
    target_level: 1,
    skenario_kasus:
      "Terjadi restrukturisasi organisasi secara mendadak yang memindahkan Anda ke unit kerja baru dengan tugas dan fungsi yang sama sekali berbeda dari kebiasaan Anda selama ini.",
    options: [
      {
        label: "A",
        teks_opsi: "Menerima penugasan baru dengan sikap positif, segera mempelajari SOP dan regulasi tugas baru, serta beradaptasi cepat dengan budaya kerja tim baru.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Menerima mutasi tersebut namun meminta waktu adaptasi yang panjang sebelum diberikan beban kerja utama.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Menghubungi bagian kepegawaian untuk meminta pertimbangan agar bisa dikembalikan ke unit kerja lama.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Bekerja seadanya di unit kerja baru sebagai wujud ketidakpuasan atas kebijakan mutasi sepihak.",
        bobot_nilai: 1,
      },
    ],
  },

  // KOMP-08: Pengambilan Keputusan
  {
    compKode: "KOMP-08",
    kode_soal: "SJT-PKP-01",
    target_level: 2,
    skenario_kasus:
      "Dalam penyaluran bantuan sosial bencana darurat, Anda menemukan bahwa kriteria penerima dalam petunjuk teknis belum mencakup warga korban terdampak di satu dusun yang kondisinya sangat kritis.",
    options: [
      {
        label: "A",
        teks_opsi: "Mengumpulkan data faktual dan dokumentasi lapangan, segera berkoordinasi darurat dengan atasan dan tim hukum untuk diskresi legal yang sah agar bantuan segera tersalurkan.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Menunggu hingga ada revisi petunjuk teknis resmi dari kementerian terkait sebelum mengambil tindakan apapun.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Langsung membagikan bantuan tanpa izin dan tanpa pencatatan pertanggungjawaban administratif.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Mengabaikan warga dusun tersebut karena berpedoman kaku bahwa mereka tidak tercantum dalam daftar resmi.",
        bobot_nilai: 1,
      },
    ],
  },
  {
    compKode: "KOMP-08",
    kode_soal: "SJT-PKP-02",
    target_level: 1,
    skenario_kasus:
      "Anda dihadapkan pada dua pilihan vendor penyedia perangkat IT: Vendor A memiliki harga termurah namun reputasi purna jual kurang teruji, sedangkan Vendor B sedikit lebih mahal namun memiliki jaminan garansi resmi dan reputasi prima.",
    options: [
      {
        label: "A",
        teks_opsi: "Melakukan analisis komprehensif *Total Cost of Ownership* (biaya pengadaan + pemeliharaan jangka panjang), dan merekomendasikan pilihan yang paling menguntungkan negara dan berkelanjutan.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Memilih Vendor A semata-mata karena harganya paling murah agar terhindar dari tuduhan pemborosan anggaran.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Menyerahkan seluruh keputusan kepada atasan tanpa memberikan analisis perbandingan yang memadai.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Memilih vendor berdasarkan kedekatan relasi pribadi dengan pemilik perusahaan penyedia.",
        bobot_nilai: 1,
      },
    ],
  },

  // KOMP-09: Perekat Bangsa
  {
    compKode: "KOMP-09",
    kode_soal: "SJT-PKB-01",
    target_level: 2,
    skenario_kasus:
      "Di lingkungan kantor Anda, terjadi gesekan antarpegawai yang dipicu oleh candaan bernada stereotip suku dan agama di ruang istirahat pegawai, yang berpotensi memecah belah keharmonisan kerja.",
    options: [
      {
        label: "A",
        teks_opsi: "Mengambil tindakan tegas menegur perilaku tersebut secara persuasif, mengingatkan komitmen ASN sebagai pemersatu bangsa, dan menginisiasi ruang dialog yang inklusif untuk meredakan ketegangan.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Menghindari ruang istirahat tersebut agar tidak terlibat dalam perselisihan antar rekan kerja.",
        bobot_nilai: 3,
      },
      {
        label: "C",
        teks_opsi: "Membela rekan kerja yang berasal dari daerah atau suku yang sama dengan Anda.",
        bobot_nilai: 2,
      },
      {
        label: "D",
        teks_opsi: "Ikut menertawakan lelucon stereotip tersebut karena menganggap itu hal biasa yang tidak perlu dibesar-besarkan.",
        bobot_nilai: 1,
      },
    ],
  },
  {
    compKode: "KOMP-09",
    kode_soal: "SJT-PKB-02",
    target_level: 1,
    skenario_kasus:
      "Dalam penyelenggaraan perayaan hari besar keagamaan di instansi, Anda diminta memimpin kepanitiaan bersama rekan kerja dari berbagai latar belakang keyakinan dan etnis.",
    options: [
      {
        label: "A",
        teks_opsi: "Menjalankan kepanitiaan dengan prinsip keterbukaan, menghargai keberagaman tradisi dan keyakinan, serta memastikan setiap anggota merasa dihargai dan terlibat aktif secara harmonis.",
        bobot_nilai: 4,
      },
      {
        label: "B",
        teks_opsi: "Melaksanakan tugas kepanitiaan secara formalistis tanpa membangun interaksi mendalam antar anggota tim yang berbeda latar belakang.",
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
    jenjang_jabatan: "ADMINISTRATOR" as const,
  },
  {
    nip: "199505122020121002",
    nama: "Ahmad Pratama, S.Kom",
    email: "ahmad.pratama@asn.go.id",
    role: "PESERTA" as const,
    jabatan: "Pranata Komputer Ahli Pertama",
    instansi: "Dinas Komunikasi dan Informatika",
    unit_kerja: "Seksi Infrastruktur dan Jaringan",
    jenjang_jabatan: "PELAKSANA" as const,
  },
  {
    nip: "198808172014032003",
    nama: "Siti Rahmawati, S.AP., M.Si",
    email: "siti.rahmawati@asn.go.id",
    role: "PESERTA" as const,
    jabatan: "Kepala Sub Bagian Kepegawaian dan Umum",
    instansi: "Dinas Pendidikan dan Kebudayaan",
    unit_kerja: "Sekretariat Dinas",
    jenjang_jabatan: "PENGAWAS" as const,
  },
  {
    nip: "197903252005011004",
    nama: "Drs. Budi Santoso, M.M.",
    email: "budi.santoso@asn.go.id",
    role: "PESERTA" as const,
    jabatan: "Kepala Bidang Pelayanan Perizinan",
    instansi: "Dinas Penanaman Modal dan PTSP",
    unit_kerja: "Bidang Perizinan dan Non Perizinan",
    jenjang_jabatan: "ADMINISTRATOR" as const,
  },
];

export async function seedDatabase() {
  console.log("🌱 Menjalankan Seeder Database Asesmen ASN...");

  // 1. Seed Competencies
  console.log("  → Mengisi 9 Dimensi Kompetensi PermenPANRB...");
  for (const comp of initialCompetencies) {
    const existing = await db
      .select()
      .from(competencies)
      .where(eq(competencies.kode, comp.kode));

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

  // 2. Seed Questions & Options
  console.log("  → Mengisi Bank Soal Situational Judgment Test (SJT)...");
  for (const q of initialQuestions) {
    const compId = compMap.get(q.compKode);
    if (!compId) continue;

    const existingQ = await db
      .select()
      .from(questions)
      .where(eq(questions.kode_soal, q.kode_soal));

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
        .select()
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

  // 3. Seed Demo Users
  console.log("  → Mengisi Akun Demo Admin & Peserta ASN...");
  const hashedPassword = await bcrypt.hash("password123", 10);

  for (const u of initialUsers) {
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.nip, u.nip));

    if (existingUser.length === 0) {
      await db.insert(users).values({
        ...u,
        password_hash: hashedPassword,
      });
    } else {
      await db
        .update(users)
        .set({
          ...u,
          password_hash: hashedPassword,
        })
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
