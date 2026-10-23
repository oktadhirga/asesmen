<script lang="ts">
  import { Button, Input, Badge, Card, Alert, Modal, RadarChart } from "../lib/components/ui";
  import type { RadarDimensionItem } from "../lib/types";

  let isDemoModalOpen = $state(false);
  let demoInputValue = $state("");
  let demoInputError = $state("");
  let demoIsLoading = $state(false);

  // Sample data 9 dimensi PermenPANRB 38/2017 untuk demonstrasi Radar Chart
  const sampleRadarData: RadarDimensionItem[] = [
    { kode: "INT", nama: "Integritas", kategori: "MANAJERIAL", skor: 3.5, standar: 3, gap: 0.5, persentase_pemenuhan: 116.6 },
    { kode: "KS", nama: "Kerjasama", kategori: "MANAJERIAL", skor: 2.8, standar: 3, gap: -0.2, persentase_pemenuhan: 93.3 },
    { kode: "KOM", nama: "Komunikasi", kategori: "MANAJERIAL", skor: 3.2, standar: 3, gap: 0.2, persentase_pemenuhan: 106.6 },
    { kode: "OPH", nama: "Orientasi Hasil", kategori: "MANAJERIAL", skor: 3.8, standar: 3, gap: 0.8, persentase_pemenuhan: 126.6 },
    { kode: "PP", nama: "Pelayanan Publik", kategori: "MANAJERIAL", skor: 2.5, standar: 3, gap: -0.5, persentase_pemenuhan: 83.3 },
    { kode: "PDO", nama: "Pengembangan Diri", kategori: "MANAJERIAL", skor: 3.0, standar: 3, gap: 0.0, persentase_pemenuhan: 100.0 },
    { kode: "MP", nama: "Mengelola Perubahan", kategori: "MANAJERIAL", skor: 2.7, standar: 3, gap: -0.3, persentase_pemenuhan: 90.0 },
    { kode: "PK", nama: "Pengambilan Keputusan", kategori: "MANAJERIAL", skor: 3.4, standar: 3, gap: 0.4, persentase_pemenuhan: 113.3 },
    { kode: "PB", nama: "Perekat Bangsa", kategori: "SOSIO_KULTURAL", skor: 3.6, standar: 3, gap: 0.6, persentase_pemenuhan: 120.0 },
  ];

  function toggleLoading() {
    demoIsLoading = true;
    setTimeout(() => {
      demoIsLoading = false;
    }, 1500);
  }

  function validateInput() {
    if (!demoInputValue.trim()) {
      demoInputError = "Field ini wajib diisi.";
    } else {
      demoInputError = "";
    }
  }
</script>

<div class="landing-page container">
  <!-- Hero Section -->
  <section class="hero-section glass-panel">
    <div class="hero-badge-wrap">
      <Badge variant="gold" size="md">
        Portal Resmi Pemerintah Republik Indonesia
      </Badge>
    </div>

    <h1 class="hero-title">
      Sistem Asesmen Kompetensi Aparatur Sipil Negara
    </h1>

    <p class="hero-subtitle">
      Platform asesmen berbasis <strong>Situational Judgment Test (SJT)</strong> terstandarisasi PermenPANRB No. 38 Tahun 2017 untuk pemetaan profil kompetensi 8 Manajerial dan 1 Sosio Kultural pegawai ASN.
    </p>

    <div class="hero-cta-group">
      <Button variant="gold" size="lg" onclick={() => (window.location.href = "/login")}>
        Masuk ke Portal Asesmen
      </Button>
      <Button variant="outline" size="lg" onclick={() => (isDemoModalOpen = true)}>
        Buka Dialog Spesifikasi Komponen
      </Button>
    </div>
  </section>

  <!-- Interactive Grid: Radar Chart & Design System Tokens -->
  <div class="showcase-grid">
    <!-- Visualisasi Radar Chart -->
    <Card class="chart-card">
      {#snippet header()}
        <div class="card-title-bar">
          <h3>Visualisasi Radar Chart 9 Dimensi</h3>
          <Badge variant="success" size="sm" dot>JPM: 84.5% (MS)</Badge>
        </div>
      {/snippet}

      <div class="radar-wrapper">
        <p class="section-desc">
          Komponen SVG interaktif untuk pemetaan capaian riil vs standar jabatan:
        </p>
        <RadarChart data={sampleRadarData} maxLevel={4} size={420} />
      </div>

      {#snippet footer()}
        <div class="jpm-summary-bar">
          <div class="summary-stat">
            <span class="stat-label">Kategori Kelulusan</span>
            <span class="stat-val text-success">Memenuhi Syarat (MS)</span>
          </div>
          <div class="summary-stat">
            <span class="stat-label">Total Dimensi Memenuhi</span>
            <span class="stat-val">6 dari 9 Dimensi</span>
          </div>
        </div>
      {/snippet}
    </Card>

    <!-- State Completeness & UI Components Showcase -->
    <div class="components-column">
      <Card>
        {#snippet header()}
          <h3>State Completeness (Design Tokens)</h3>
        {/snippet}

        <div class="component-demo-section">
          <!-- 1. Buttons State -->
          <div class="demo-block">
            <span class="demo-heading">Button Variants & State (Idle, Loading, Disabled)</span>
            <div class="demo-row">
              <Button variant="primary" onclick={toggleLoading} isLoading={demoIsLoading}>
                {demoIsLoading ? "Menyimpan..." : "Primary (Klik Uji Loading)"}
              </Button>
              <Button variant="gold">Gold Birokrasi</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="secondary" disabled>Disabled</Button>
            </div>
          </div>

          <!-- 2. Badges State -->
          <div class="demo-block">
            <span class="demo-heading">Status Kelulusan & Akun Badges</span>
            <div class="demo-row">
              <Badge variant="success" dot>MS (≥80%)</Badge>
              <Badge variant="warning" dot>MMS (68-79%)</Badge>
              <Badge variant="danger" dot>KMS (&lt;68%)</Badge>
              <Badge variant="gold">ADMIN</Badge>
              <Badge variant="info">PESERTA</Badge>
            </div>
          </div>

          <!-- 3. Inputs State -->
          <div class="demo-block">
            <span class="demo-heading">Input Field States (A11y & Validation)</span>
            <div class="inputs-stack">
              <Input
                label="Nomor Induk Pegawai (NIP)"
                placeholder="Contoh: 198501012010011001"
                required
                helperText="18 digit angka resmi identitas ASN"
                bind:value={demoInputValue}
                errorMessage={demoInputError}
                onblur={validateInput}
              />
              <Input
                label="Input Mode Disabled"
                value="Data Terkunci oleh Administrator"
                disabled
              />
            </div>
          </div>

          <!-- 4. Alerts State -->
          <div class="demo-block">
            <span class="demo-heading">Pemberitahuan Sistem (Accessible Alerts)</span>
            <Alert variant="warning" title="Peringatan Integritas Proctoring">
              Sistem mencatat setiap perpindahan tab atau jendela browser selama pengerjaan asesmen SJT.
            </Alert>
          </div>
        </div>
      </Card>
    </div>
  </div>

  <!-- Demo Accounts Reference Card -->
  <Card class="accounts-card">
    {#snippet header()}
      <div class="card-title-bar">
        <h3>Akun Uji Coba Demo (Tersedia di Database)</h3>
        <Badge variant="info" size="sm">Password: password123</Badge>
      </div>
    {/snippet}

    <div class="accounts-grid">
      <div class="account-item">
        <Badge variant="gold">ADMIN / ASESOR</Badge>
        <div class="acc-meta">
          <strong>NIP: 198501012010011001</strong>
          <span>Dr. H. Bambang Soeprapto, M.Si</span>
          <small>Kepala Pusat Penilaian Kompetensi ASN</small>
        </div>
      </div>

      <div class="account-item">
        <Badge variant="info">PESERTA PELAKSANA</Badge>
        <div class="acc-meta">
          <strong>NIP: 199505122020121002</strong>
          <span>Ahmad Fauzi, S.Kom</span>
          <small>Pranata Komputer Pertama</small>
        </div>
      </div>

      <div class="account-item">
        <Badge variant="info">PESERTA PENGAWAS</Badge>
        <div class="acc-meta">
          <strong>NIP: 198808172014032003</strong>
          <span>Siti Rahmawati, S.E., M.M.</span>
          <small>Kasubbag Kepegawaian (Eselon IV)</small>
        </div>
      </div>

      <div class="account-item">
        <Badge variant="info">PESERTA ADMINISTRATOR</Badge>
        <div class="acc-meta">
          <strong>NIP: 197903252005011004</strong>
          <span>Ir. Dedi Kusuma, M.Eng</span>
          <small>Kepala Bidang Mutasi (Eselon III)</small>
        </div>
      </div>
    </div>
  </Card>
</div>

<!-- Modal Dialog Demo -->
<Modal
  bind:isOpen={isDemoModalOpen}
  title="Spesifikasi Arsitektur Desain UI/UX ASN"
  size="md"
>
  <div class="modal-spec-content">
    <p>
      Komponen antarmuka web dibangun dengan prinsip modularitas ketat, pemetaan 4 state inti (Idle, Loading, Error, Disabled), dan kepatuhan standar aksesibilitas WCAG 2.1 Level AA:
    </p>
    <ul>
      <li><strong>A11y</strong>: Navigasi keyboard, kontras warna &gt; 4.5:1, pembaca layar dengan atribut ARIA.</li>
      <li><strong>Sistem Desain</strong>: Berbasis CSS tokens resmi dengan palet warna Deep Indonesian Royal Navy &amp; Heritage Gold.</li>
      <li><strong>Visualisasi Data</strong>: SVG Radar Polygon murni yang ringan dan responsif tanpa dependensi grafik eksternal.</li>
    </ul>
  </div>

  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isDemoModalOpen = false)}>
      Tutup
    </Button>
    <Button variant="primary" onclick={() => (window.location.href = "/login")}>
      Lanjut ke Login
    </Button>
  {/snippet}
</Modal>

<style>
  .landing-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .hero-section {
    padding: var(--space-10) var(--space-8);
    text-align: center;
    border-radius: var(--radius-xl);
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.9) 100%);
    box-shadow: var(--shadow-md);
  }

  .hero-badge-wrap {
    margin-bottom: var(--space-4);
  }

  .hero-title {
    font-size: var(--font-size-3xl);
    max-width: 820px;
    margin: 0 auto var(--space-4);
    letter-spacing: -0.02em;
    color: var(--color-brand-primary);
  }

  .hero-subtitle {
    font-size: var(--font-size-base);
    max-width: 720px;
    margin: 0 auto var(--space-8);
    color: var(--color-text-muted);
  }

  .hero-cta-group {
    display: flex;
    justify-content: center;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  .showcase-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-6);
  }

  :global(.chart-card) {
    display: flex;
    flex-direction: column;
  }

  .card-title-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .radar-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-2) 0;
  }

  .section-desc {
    font-size: var(--font-size-xs);
    margin-bottom: var(--space-2);
  }

  .jpm-summary-bar {
    display: flex;
    justify-content: space-around;
    width: 100%;
  }

  .summary-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-subtle);
  }

  .stat-val {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
  }

  .text-success {
    color: var(--color-success);
  }

  .components-column {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .component-demo-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .demo-block {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .demo-heading {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-subtle);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .demo-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }

  .inputs-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  :global(.accounts-card) {
    margin-top: var(--space-2);
  }

  .accounts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: var(--space-4);
  }

  .account-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-4);
    background-color: var(--color-bg-subtle);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-default);
  }

  .acc-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: var(--font-size-xs);
  }

  .acc-meta strong {
    color: var(--color-brand-primary);
  }

  .acc-meta span {
    font-weight: var(--font-weight-medium);
    color: var(--color-text-main);
  }

  .acc-meta small {
    color: var(--color-text-subtle);
  }

  .modal-spec-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    line-height: 1.6;
  }

  .modal-spec-content ul {
    padding-left: var(--space-5);
  }

  .modal-spec-content li {
    margin-bottom: var(--space-1);
  }

  @media (max-width: 900px) {
    .showcase-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
