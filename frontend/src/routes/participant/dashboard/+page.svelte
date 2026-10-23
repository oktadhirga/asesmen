<script lang="ts">
  import { onMount } from "svelte";
  import { ApiClient } from "../../../lib/api/client";
  import { auth } from "../../../lib/stores/auth.svelte";
  import {
    Button,
    Card,
    Badge,
    Alert,
    Modal,
    Input,
  } from "../../../lib/components/ui";

  interface MySessionItem {
    participant_id: number;
    token_akses: string;
    status_peserta: "BELUM_MULAI" | "SEDANG_MENGERJAKAN" | "SELESAI";
    waktu_login: string | null;
    waktu_submit: string | null;
    total_score: number | null;
    jpm_percentage: number | null;
    kategori_kelulusan: "MS" | "MMS" | "KMS" | null;
    session_id: number;
    judul: string;
    deskripsi: string | null;
    kode_sesi: string;
    waktu_mulai: string;
    waktu_selesai: string;
    durasi_menit: number;
    target_jenjang: string;
    status_sesi: "DRAFT" | "BERJALAN" | "SELESAI";
  }

  let sessions = $state<MySessionItem[]>([]);
  let isLoading = $state(true);
  let errorMessage = $state<string | null>(null);

  // State Modal Mulai Ujian & Masukkan Token
  let selectedSession = $state<MySessionItem | null>(null);
  let isStartModalOpen = $state(false);
  let inputToken = $state("");
  let tokenError = $state<string | null>(null);
  let isStarting = $state(false);

  async function loadMySessions() {
    isLoading = true;
    errorMessage = null;

    try {
      const res = await ApiClient.get<MySessionItem[]>("/sessions/my-sessions");
      if (res.success && res.data) {
        sessions = res.data;
      } else {
        errorMessage = res.message || "Gagal memuat daftar sesi pengerjaan.";
      }
    } catch (err: any) {
      errorMessage = err.message || "Terjadi kesalahan koneksi server.";
    } finally {
      isLoading = false;
    }
  }

  function openStartModal(session: MySessionItem) {
    selectedSession = session;
    inputToken = "";
    tokenError = null;
    isStartModalOpen = true;
  }

  async function handleStartExam() {
    if (!selectedSession) return;
    if (!inputToken.trim()) {
      tokenError = "Silakan masukkan token akses ujian Anda.";
      return;
    }

    isStarting = true;
    tokenError = null;

    try {
      const res = await ApiClient.post<any>("/exams/start", {
        session_id: selectedSession.session_id,
        token_akses: inputToken.trim().toUpperCase(),
      });

      if (res.success && res.data) {
        // Berhasil mulai ujian, redirect ke lembar ujian
        window.location.href = `/participant/exam/${selectedSession.session_id}?participantId=${res.data.participant_id}`;
      } else {
        tokenError = res.message || "Token akses tidak valid atau sesi belum aktif.";
      }
    } catch (err: any) {
      tokenError = err.message || "Terjadi kesalahan saat memverifikasi token.";
    } finally {
      isStarting = false;
    }
  }

  function continueExam(session: MySessionItem) {
    window.location.href = `/participant/exam/${session.session_id}?participantId=${session.participant_id}`;
  }

  function viewReport(session: MySessionItem) {
    window.location.href = `/participant/reports/${session.participant_id}`;
  }

  function formatDateTime(iso: string) {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  onMount(() => {
    loadMySessions();
  });
</script>

<svelte:head>
  <title>Jadwal Asesmen Saya — PENTA+ Trenggalek</title>
</svelte:head>

<!-- Banner Selamat Datang & Profil Pegawai -->
<div class="welcome-banner card-modern">
  <div class="banner-content">
    <div class="banner-text">
      <span class="banner-badge">SISTEM ASESMEN KOMPETENSI ASN</span>
      <h1 class="banner-title">
        Selamat Datang, {auth.user?.nama || "Pegawai ASN"}
      </h1>
      <p class="banner-desc">
        Aplikasi PENTA+ memfasilitasi penilaian kompetensi manajerial dan sosial
        kultural berdasarkan <strong>PermenPANRB No. 38 Tahun 2017</strong>
        dengan metode <em>Situational Judgment Test (SJT)</em>.
      </p>
    </div>
    {#if auth.user}
      <div class="profile-card-mini">
        <div class="mini-row">
          <span class="mini-label">NIP:</span>
          <span class="mini-val">{auth.user.nip}</span>
        </div>
        <div class="mini-row">
          <span class="mini-label">Jabatan:</span>
          <span class="mini-val">{auth.user.jabatan || "-"}</span>
        </div>
        <div class="mini-row">
          <span class="mini-label">Unit Kerja:</span>
          <span class="mini-val">{auth.user.unit_kerja || "-"}</span>
        </div>
        <div class="mini-row">
          <span class="mini-label">Jenjang:</span>
          <Badge variant="gold" size="sm">{auth.user.jenjang_jabatan}</Badge>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Petunjuk & Tata Tertib Ujian -->
<Card class="rules-card">
  {#snippet header()}
    <div class="rules-header">
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        stroke="var(--color-brand-primary)"
        stroke-width="2"
        fill="none"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
      <h3 class="rules-title">Petunjuk Pengerjaan & Tata Tertib Asesmen</h3>
    </div>
  {/snippet}

  <div class="rules-grid">
    <div class="rule-item">
      <div class="rule-num">1</div>
      <div class="rule-body">
        <strong>Format Situational Judgment Test (SJT)</strong>
        <p>
          Anda akan dihadapkan pada skenario studi kasus birokrasi pemerintahan nyata. 
          Pilihlah respon perilaku yang paling efektif mencerminkan tindakan Anda sebagai ASN profesional.
        </p>
      </div>
    </div>

    <div class="rule-item">
      <div class="rule-num">2</div>
      <div class="rule-body">
        <strong>Penyimpanan Otomatis (Autosave)</strong>
        <p>
          Setiap pilihan jawaban Anda disimpan langsung ke server secara real-time. Anda juga dapat menandai soal ragu-ragu 
          dan kembali ke soal tersebut sebelum menekan tombol kumpulkan.
        </p>
      </div>
    </div>

    <div class="rule-item">
      <div class="rule-num">3</div>
      <div class="rule-body">
        <strong>Sistem Proctoring Terintegrasi</strong>
        <p>
          Dilarang membuka tab baru, browser lain, atau berpindah jendela selama ujian berlangsung. 
          Setiap perpindahan tab terekam secara otomatis sebagai catatan pengawas ujian.
        </p>
      </div>
    </div>

    <div class="rule-item">
      <div class="rule-num">4</div>
      <div class="rule-body">
        <strong>Token Akses Unik</strong>
        <p>
          Untuk memulai ujian berstatus Berjalan, Anda memerlukan Token Akses yang diberikan oleh Asesor / Administrator BKPSDM.
        </p>
      </div>
    </div>
  </div>
</Card>

<!-- Daftar Sesi Asesmen Peserta -->
<section class="sessions-section">
  <div class="section-header">
    <div>
      <h2 class="section-title">Daftar Penugasan Sesi Asesmen</h2>
      <p class="section-subtitle">
        Berikut adalah jadwal sesi asesmen kompetensi yang telah didaftarkan untuk Anda.
      </p>
    </div>
    <Button variant="secondary" size="sm" onclick={loadMySessions} disabled={isLoading}>
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        stroke="currentColor"
        stroke-width="2"
        fill="none"
      >
        <path d="M23 4v6h-6"></path>
        <path d="M1 20v-6h6"></path>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
      </svg>
      Segarkan
    </Button>
  </div>

  {#if errorMessage}
    <Alert variant="error">
      {errorMessage}
    </Alert>
  {/if}

  {#if isLoading}
    <div class="loading-state card-modern">
      <span class="spinner" aria-hidden="true"></span>
      <p>Memuat daftar jadwal asesmen Anda...</p>
    </div>
  {:else if sessions.length === 0}
    <div class="empty-state card-modern">
      <div class="empty-icon">📋</div>
      <h3 class="empty-title">Belum Ada Penugasan Sesi Asesmen</h3>
      <p class="empty-desc">
        Saat ini Anda belum didaftarkan pada sesi asesmen yang aktif. Silakan hubungi Administrator atau Asesor BKPSDM Kabupaten Trenggalek untuk informasi jadwal asesmen Anda.
      </p>
    </div>
  {:else}
    <div class="sessions-grid">
      {#each sessions as s (s.participant_id)}
        <div class="session-card card-modern">
          <div class="session-card-header">
            <div class="session-title-wrap">
              <span class="session-code">{s.kode_sesi}</span>
              <h3 class="session-name">{s.judul}</h3>
            </div>
            <div class="session-status-badges">
              <!-- Badge Status Sesi -->
              {#if s.status_sesi === "BERJALAN"}
                <Badge variant="success">SESI AKTIF</Badge>
              {:else if s.status_sesi === "SELESAI"}
                <Badge variant="default">SESI SELESAI</Badge>
              {:else}
                <Badge variant="warning">BELUM DIBUKA</Badge>
              {/if}

              <!-- Badge Status Peserta -->
              {#if s.status_peserta === "SELESAI"}
                <Badge variant="info">SUDAH SUBMIT</Badge>
              {:else if s.status_peserta === "SEDANG_MENGERJAKAN"}
                <Badge variant="warning">SEDANG DIKERJAKAN</Badge>
              {:else}
                <Badge variant="default">BELUM DIMULAI</Badge>
              {/if}
            </div>
          </div>

          {#if s.deskripsi}
            <p class="session-desc">{s.deskripsi}</p>
          {/if}

          <div class="session-meta-grid">
            <div class="meta-box">
              <span class="meta-label">Mulai:</span>
              <span class="meta-value">{formatDateTime(s.waktu_mulai)}</span>
            </div>
            <div class="meta-box">
              <span class="meta-label">Batas Selesai:</span>
              <span class="meta-value">{formatDateTime(s.waktu_selesai)}</span>
            </div>
            <div class="meta-box">
              <span class="meta-label">Durasi Waktu:</span>
              <span class="meta-value font-mono">{s.durasi_menit} Menit</span>
            </div>
            <div class="meta-box">
              <span class="meta-label">Target Jenjang:</span>
              <span class="meta-value">{s.target_jenjang}</span>
            </div>
          </div>

          <!-- Jika Sudah Selesai, Tampilkan Ringkasan Hasil Singkat -->
          {#if s.status_peserta === "SELESAI"}
            <div class="results-summary-box">
              <div class="score-pill">
                <span class="score-label">Indeks JPM:</span>
                <span class="score-number font-mono">{s.jpm_percentage ?? 0}%</span>
              </div>
              <div class="score-pill">
                <span class="score-label">Kategori:</span>
                {#if s.kategori_kelulusan === "MS"}
                  <Badge variant="success">Memenuhi Syarat (MS)</Badge>
                {:else if s.kategori_kelulusan === "MMS"}
                  <Badge variant="gold">Masih Memenuhi Syarat (MMS)</Badge>
                {:else}
                  <Badge variant="danger">Kurang Memenuhi Syarat (KMS)</Badge>
                {/if}
              </div>
            </div>
          {/if}

          <!-- Footer Aksi -->
          <div class="session-card-footer">
            {#if s.status_peserta === "SELESAI"}
              <Button
                variant="gold"
                class="w-full"
                onclick={() => viewReport(s)}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  stroke="currentColor"
                  stroke-width="2"
                  fill="none"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Lihat Laporan & Radar Chart
              </Button>
            {:else if s.status_peserta === "SEDANG_MENGERJAKAN"}
              <Button
                variant="primary"
                class="w-full"
                onclick={() => continueExam(s)}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  stroke="currentColor"
                  stroke-width="2"
                  fill="none"
                >
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Lanjutkan Pengerjaan Ujian
              </Button>
            {:else if s.status_sesi === "BERJALAN"}
              <Button
                variant="primary"
                class="w-full"
                onclick={() => openStartModal(s)}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  stroke="currentColor"
                  stroke-width="2"
                  fill="none"
                >
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Mulai Asesmen (Masukkan Token)
              </Button>
            {:else}
              <div class="waiting-notice">
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  stroke="currentColor"
                  stroke-width="2"
                  fill="none"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                Sesi belum dibuka oleh Administrator / Asesor
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>

<!-- Modal Masukkan Token Akses Ujian -->
{#if isStartModalOpen && selectedSession}
  <Modal
    title="Konfirmasi Mulai Ujian Asesmen"
    size="md"
    isOpen={isStartModalOpen}
    onClose={() => (isStartModalOpen = false)}
  >
    <div class="modal-body-content">
      <Alert variant="info">
        Pastikan koneksi internet Anda stabil. Setelah token diverifikasi, waktu pengerjaan 
        <strong>{selectedSession.durasi_menit} menit</strong> akan langsung berjalan.
      </Alert>

      <div class="session-brief">
        <div class="brief-item">
          <span class="brief-label">Sesi:</span>
          <span class="brief-value">{selectedSession.judul}</span>
        </div>
        <div class="brief-item">
          <span class="brief-label">Kode:</span>
          <span class="brief-value font-mono">{selectedSession.kode_sesi}</span>
        </div>
        <div class="brief-item">
          <span class="brief-label">Durasi:</span>
          <span class="brief-value">{selectedSession.durasi_menit} Menit</span>
        </div>
      </div>

      {#if tokenError}
        <Alert variant="error">
          {tokenError}
        </Alert>
      {/if}

      <div class="token-input-group">
        <label for="token-akses-input" class="token-label">
          Masukkan Token Akses Peserta:
        </label>
        <Input
          id="token-akses-input"
          placeholder="Contoh: ASN-947261"
          bind:value={inputToken}
          class="font-mono text-center token-input-lg"
          autocomplete="off"
        />
        <span class="token-hint">
          Token diberikan oleh panitia pengawas ujian atau tertera pada akun Anda.
        </span>
      </div>
    </div>

    {#snippet footer()}
      <Button
        variant="ghost"
        onclick={() => (isStartModalOpen = false)}
        disabled={isStarting}
      >
        Batal
      </Button>
      <Button
        variant="gold"
        onclick={handleStartExam}
        disabled={isStarting || !inputToken.trim()}
      >
        {isStarting ? "Memverifikasi..." : "Verifikasi & Mulai Ujian"}
      </Button>
    {/snippet}
  </Modal>
{/if}

<style>
  .welcome-banner {
    background: linear-gradient(
      135deg,
      rgba(10, 37, 64, 0.95) 0%,
      rgba(15, 23, 42, 0.98) 100%
    );
    color: #ffffff;
    border: 1px solid rgba(212, 160, 23, 0.3);
    padding: var(--space-8);
    position: relative;
    overflow: hidden;
  }

  .banner-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-8);
    flex-wrap: wrap;
  }

  .banner-text {
    flex: 1;
    min-width: 280px;
  }

  .banner-badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--color-gold-light);
    margin-bottom: var(--space-2);
  }

  .banner-title {
    font-size: var(--font-size-2xl);
    font-weight: 800;
    color: #ffffff;
    margin: 0 0 var(--space-2) 0;
  }

  .banner-desc {
    color: rgba(255, 255, 255, 0.8);
    font-size: var(--font-size-sm);
    line-height: 1.6;
    margin: 0;
    max-width: 600px;
  }

  .profile-card-mini {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: var(--radius-lg);
    padding: var(--space-4) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 260px;
  }

  .mini-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--font-size-xs);
    gap: var(--space-4);
  }

  .mini-label {
    color: rgba(255, 255, 255, 0.6);
  }

  .mini-val {
    font-weight: 600;
    color: #ffffff;
    text-align: right;
  }

  :global(.rules-card) {
    border-top: 3px solid var(--color-brand-primary);
  }

  .rules-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .rules-title {
    font-size: var(--font-size-base);
    font-weight: 700;
    color: var(--color-brand-navy);
    margin: 0;
  }

  .rules-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: var(--space-4);
  }

  .rule-item {
    display: flex;
    gap: var(--space-3);
  }

  .rule-num {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background-color: rgba(10, 37, 64, 0.08);
    color: var(--color-brand-primary);
    font-weight: 700;
    font-size: var(--font-size-xs);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .rule-body strong {
    display: block;
    font-size: var(--font-size-sm);
    color: var(--color-text-main);
    margin-bottom: 2px;
  }

  .rule-body p {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    line-height: 1.5;
    margin: 0;
  }

  .sessions-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  .section-title {
    font-size: var(--font-size-lg);
    font-weight: 700;
    color: var(--color-text-main);
    margin: 0;
  }

  .section-subtitle {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin: 2px 0 0 0;
  }

  .loading-state,
  .empty-state {
    padding: var(--space-12);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-brand-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .empty-icon {
    font-size: 40px;
  }

  .empty-title {
    font-size: var(--font-size-base);
    font-weight: 700;
    color: var(--color-text-main);
    margin: 0;
  }

  .empty-desc {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    max-width: 500px;
    margin: 0;
  }

  .sessions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: var(--space-6);
  }

  .session-card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: var(--space-6);
    gap: var(--space-4);
    border: 1px solid var(--color-border);
    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  }

  .session-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .session-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-3);
  }

  .session-code {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    color: var(--color-gold-dark);
    display: block;
    margin-bottom: 2px;
  }

  .session-name {
    font-size: var(--font-size-base);
    font-weight: 700;
    color: var(--color-text-main);
    margin: 0;
  }

  .session-status-badges {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: flex-end;
  }

  .session-desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    line-height: 1.5;
    margin: 0;
  }

  .session-meta-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2);
    background-color: var(--color-bg-alt);
    padding: var(--space-3);
    border-radius: var(--radius-md);
  }

  .meta-box {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .meta-label {
    font-size: 10px;
    color: var(--color-text-muted);
    text-transform: uppercase;
  }

  .meta-value {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-main);
  }

  .results-summary-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(212, 160, 23, 0.08);
    border: 1px solid rgba(212, 160, 23, 0.2);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
  }

  .score-pill {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .score-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-brand-navy);
  }

  .score-number {
    font-size: var(--font-size-base);
    font-weight: 800;
    color: var(--color-brand-primary);
  }

  .session-card-footer {
    margin-top: auto;
  }

  .waiting-notice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-3);
    border-radius: var(--radius-md);
    background-color: var(--color-bg-alt);
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
    text-align: center;
  }

  .modal-body-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .session-brief {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    background-color: var(--color-bg-alt);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
  }

  .brief-item {
    display: flex;
    justify-content: space-between;
    font-size: var(--font-size-xs);
  }

  .brief-label {
    color: var(--color-text-muted);
  }

  .brief-value {
    font-weight: 600;
    color: var(--color-text-main);
  }

  .token-input-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .token-label {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-main);
  }

  :global(.token-input-lg input) {
    font-size: var(--font-size-lg) !important;
    letter-spacing: 0.15em;
    font-weight: 700;
    text-transform: uppercase;
  }

  .token-hint {
    font-size: 11px;
    color: var(--color-text-muted);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
