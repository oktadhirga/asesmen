<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { ApiClient } from "../../../../lib/api/client";
  import {
    Button,
    Card,
    Badge,
    Alert,
    RadarChart,
  } from "../../../../lib/components/ui";
  import type { ParticipantReport, RadarDimensionItem } from "../../../../lib/types";

  const participantId = $derived(Number(page.params.id));

  let report = $state<ParticipantReport | null>(null);
  let isLoading = $state(true);
  let errorMessage = $state<string | null>(null);

  async function loadReport() {
    isLoading = true;
    errorMessage = null;

    try {
      const res = await ApiClient.get<ParticipantReport>(
        `/reports/participant/${participantId}`
      );
      if (res.success && res.data) {
        const raw = res.data as any;
        const radarItems = raw.radar_chart || raw.radar || [];
        report = {
          ...raw,
          summary: raw.summary || {
            total_score: raw.total_score || 0,
            max_possible_score: (radarItems.length || 9) * 4,
            jpm_percentage: raw.jpm_percentage || 0,
            kategori_kelulusan: raw.kategori_kelulusan || "KMS",
            kategori_label: raw.kategori_label || "Belum Dinilai",
            total_answered: 0,
          },
          radar_chart: radarItems,
        };
      } else {
        errorMessage = res.message || "Gagal memuat dokumen laporan hasil asesmen.";
      }
    } catch (err: any) {
      errorMessage = err.message || "Terjadi kesalahan saat memuat laporan.";
    } finally {
      isLoading = false;
    }
  }

  function handlePrint() {
    window.print();
  }

  function formatDateTime(iso: string | null) {
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

  // Pengelompokan Dimensi Kekuatan vs Pengembangan
  const radarList = $derived(report?.radar_chart || (report as any)?.radar || []);
  const strengths = $derived(
    radarList.filter((item: RadarDimensionItem) => item.gap >= 0)
  );
  const improvements = $derived(
    radarList.filter((item: RadarDimensionItem) => item.gap < 0)
  );

  onMount(() => {
    loadReport();
  });
</script>

<svelte:head>
  <title>Laporan Hasil Asesmen SJT — PENTA+ Trenggalek</title>
</svelte:head>

<div class="report-page-container">
  <!-- Bar Aksi Atas (Hanya Tampil di Layar / Non-Print) -->
  <div class="report-actions-bar no-print">
    <Button
      variant="secondary"
      size="sm"
      onclick={() => (window.location.href = "/participant/dashboard")}
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        stroke="currentColor"
        stroke-width="2"
        fill="none"
      >
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      Kembali ke Dashboard
    </Button>

    <div class="actions-right">
      <Button variant="primary" size="sm" onclick={handlePrint}>
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          stroke="currentColor"
          stroke-width="2"
          fill="none"
        >
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        Cetak / Simpan PDF
      </Button>
    </div>
  </div>

  {#if errorMessage}
    <Alert variant="error">
      {errorMessage}
    </Alert>
  {/if}

  {#if isLoading}
    <div class="loading-state card-modern">
      <span class="spinner-large" aria-hidden="true"></span>
      <p>Menyusun data kalkulasi JPM dan profil kompetensi 9 dimensi...</p>
    </div>
  {:else if report}
    <!-- Lembar Dokumen Resmi Laporan Asesmen -->
    <article class="report-document card-modern">
      <!-- Kop Surat Resmi Pemkab Trenggalek -->
      <header class="official-header">
        <div class="header-emblem">
          <img
            src="/logo-trenggalek.svg"
            alt="Lambang Kabupaten Trenggalek"
            class="header-logo-img"
          />
        </div>
        <div class="header-titles">
          <span class="gov-text">PEMERINTAH KABUPATEN TRENGGALEK</span>
          <h1 class="agency-text">
            BADAN KEPEGAWAIAN DAN PENGEMBANGAN SUMBER DAYA MANUSIA
          </h1>
          <h2 class="doc-title">
            LAPORAN INDIVIDUAL ASESMEN KOMPETENSI ASN (PENTA+)
          </h2>
          <span class="legal-basis">
            Berdasarkan Peraturan Menteri PANRB Nomor 38 Tahun 2017 tentang Standar Kompetensi Jabatan ASN
          </span>
        </div>
      </header>

      <div class="header-divider"></div>

      <!-- Identitas ASN & Sesi Asesmen -->
      <section class="meta-section">
        <div class="meta-table-card">
          <h3 class="section-title">Identitas Pegawai ASN</h3>
          <table class="meta-table">
            <tbody>
              <tr>
                <td class="col-label">Nama Lengkap</td>
                <td class="col-sep">:</td>
                <td class="col-val font-semibold">{report.participant.nama}</td>
              </tr>
              <tr>
                <td class="col-label">NIP</td>
                <td class="col-sep">:</td>
                <td class="col-val font-mono">{report.participant.nip}</td>
              </tr>
              <tr>
                <td class="col-label">Jabatan Saat Ini</td>
                <td class="col-sep">:</td>
                <td class="col-val">{report.participant.jabatan || "-"}</td>
              </tr>
              <tr>
                <td class="col-label">Unit Kerja</td>
                <td class="col-sep">:</td>
                <td class="col-val">{report.participant.unit_kerja || "-"}</td>
              </tr>
              <tr>
                <td class="col-label">Jenjang Jabatan</td>
                <td class="col-sep">:</td>
                <td class="col-val">
                  <Badge variant="gold" size="sm">
                    {report.participant.jenjang_jabatan}
                  </Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="meta-table-card">
          <h3 class="section-title">Informasi Pelaksanaan Ujian</h3>
          <table class="meta-table">
            <tbody>
              <tr>
                <td class="col-label">Nama Sesi</td>
                <td class="col-sep">:</td>
                <td class="col-val font-semibold">{report.session.judul}</td>
              </tr>
              <tr>
                <td class="col-label">Kode Sesi</td>
                <td class="col-sep">:</td>
                <td class="col-val font-mono">{report.session.kode_sesi}</td>
              </tr>
              <tr>
                <td class="col-label">Waktu Mulai</td>
                <td class="col-sep">:</td>
                <td class="col-val">{formatDateTime(report.participant.waktu_login)}</td>
              </tr>
              <tr>
                <td class="col-label">Waktu Selesai</td>
                <td class="col-sep">:</td>
                <td class="col-val">{formatDateTime(report.participant.waktu_submit)}</td>
              </tr>
              <tr>
                <td class="col-label">Catatan Proctoring</td>
                <td class="col-sep">:</td>
                <td class="col-val">
                  {#if report.participant.tab_switch_count === 0}
                    <Badge variant="success" size="sm">Tertib (0x Tab Switch)</Badge>
                  {:else}
                    <Badge variant="danger" size="sm">
                      {report.participant.tab_switch_count}x Tab Switch Terdeteksi
                    </Badge>
                  {/if}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Ringkasan Hasil Nilai JPM & Kategori Kelulusan -->
      <section class="score-summary-banner">
        <div class="jpm-main-display">
          <span class="jpm-label">INDEKS JOB PERSON MATCH (JPM)</span>
          <div class="jpm-number font-mono">
            {report.summary.jpm_percentage}%
          </div>
          <span class="jpm-desc">Tingkat Kesesuaian Standar Kompetensi</span>
        </div>

        <div class="category-display">
          <span class="cat-label">Kategori Rekomendasi:</span>
          {#if report.summary.kategori_kelulusan === "MS"}
            <div class="cat-badge-large ms">
              <span class="cat-code">MS</span>
              <span class="cat-name">Memenuhi Syarat (JPM ≥ 80%)</span>
            </div>
          {:else if report.summary.kategori_kelulusan === "MMS"}
            <div class="cat-badge-large mms">
              <span class="cat-code">MMS</span>
              <span class="cat-name">Masih Memenuhi Syarat (68% ≤ JPM &lt; 80%)</span>
            </div>
          {:else}
            <div class="cat-badge-large kms">
              <span class="cat-code">KMS</span>
              <span class="cat-name">Kurang Memenuhi Syarat (JPM &lt; 68%)</span>
            </div>
          {/if}

          <div class="score-pills-row">
            <span class="pill-item">
              Total Skor Riil: <strong>{report.summary.total_score}</strong>
            </span>
            <span class="pill-item">
              Dimensi Dinilai: <strong>9 Dimensi</strong>
            </span>
          </div>
        </div>
      </section>

      <!-- Visualisasi Radar Chart 9 Dimensi Kompetensi -->
      <section class="radar-section">
        <div class="radar-header">
          <h3 class="section-title">Visualisasi Spider Radar Chart 9 Dimensi</h3>
          <p class="section-desc">
            Perbandingan antara Standar Kompetensi Jabatan (SKJ PermenPANRB) dengan Capaian Skor Riil ASN.
          </p>
        </div>

        <div class="radar-wrapper">
          <RadarChart data={report.radar_chart} size={500} showLegend={true} />
        </div>
      </section>

      <!-- Tabel Rincian 9 Dimensi & Analisis Gap -->
      <section class="dimensions-table-section">
        <h3 class="section-title">Rincian Capaian 9 Dimensi Kompetensi</h3>
        <div class="table-responsive">
          <table class="dimensions-table">
            <thead>
              <tr>
                <th class="text-center">No</th>
                <th>Kode</th>
                <th>Dimensi Kompetensi PermenPANRB</th>
                <th>Kategori</th>
                <th class="text-center">Standar</th>
                <th class="text-center">Capaian Riil</th>
                <th class="text-center">Gap</th>
                <th class="text-center">Pemenuhan</th>
              </tr>
            </thead>
            <tbody>
              {#each report.radar_chart as dim, idx (dim.kode)}
                <tr>
                  <td class="text-center">{idx + 1}</td>
                  <td class="font-mono font-semibold">{dim.kode}</td>
                  <td class="font-medium">{dim.nama}</td>
                  <td>
                    <Badge
                      variant={dim.kategori === "MANAJERIAL" ? "default" : "gold"}
                      size="sm"
                    >
                      {dim.kategori === "MANAJERIAL" ? "Manajerial" : "Sosio Kultural"}
                    </Badge>
                  </td>
                  <td class="text-center font-mono font-semibold">{dim.standar}</td>
                  <td class="text-center font-mono font-bold text-navy">
                    {dim.skor}
                  </td>
                  <td class="text-center font-mono font-semibold">
                    {#if dim.gap >= 0}
                      <span class="gap-pos">+{dim.gap}</span>
                    {:else}
                      <span class="gap-neg">{dim.gap}</span>
                    {/if}
                  </td>
                  <td class="text-center font-mono">
                    <span
                      class="pemenuhan-tag"
                      class:tag-green={dim.persentase_pemenuhan >= 100}
                      class:tag-gold={dim.persentase_pemenuhan >= 80 && dim.persentase_pemenuhan < 100}
                      class:tag-red={dim.persentase_pemenuhan < 80}
                    >
                      {dim.persentase_pemenuhan}%
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Rekomendasi Rencana Pengembangan (IDP - Individual Development Plan) -->
      <section class="recommendations-section">
        <h3 class="section-title">Analisis Kompetensi & Rekomendasi Pengembangan</h3>
        <div class="recom-grid">
          <!-- Dimensi Kekuatan -->
          <div class="recom-box strengths">
            <h4 class="recom-heading text-success">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Dimensi Kekuatan Utama (Strength)
            </h4>
            <p class="recom-desc">
              Kompetensi berikut telah memenuhi atau melampaui Standar Kompetensi Jabatan:
            </p>
            {#if strengths.length > 0}
              <ul class="dim-list">
                {#each strengths as s}
                  <li>
                    <strong>{s.nama}</strong>: Capaian {s.skor} (Standar: {s.standar}, Surplus: +{s.gap})
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="empty-dim-text">Seluruh dimensi berada di bawah batas standar.</p>
            {/if}
          </div>

          <!-- Area Perbaikan / Pengembangan -->
          <div class="recom-box improvements">
            <h4 class="recom-heading text-danger">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              Area Prioritas Pengembangan (Need Improvement)
            </h4>
            <p class="recom-desc">
              Kompetensi berikut disarankan untuk mendapatkan intervensi pelatihan teknis / coaching:
            </p>
            {#if improvements.length > 0}
              <ul class="dim-list">
                {#each improvements as im}
                  <li>
                    <strong>{im.nama}</strong>: Capaian {im.skor} (Standar: {im.standar}, Defisit: {im.gap})
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="empty-dim-text">Tidak ada dimensi yang memerlukan intervensi khusus.</p>
            {/if}
          </div>
        </div>
      </section>

      <!-- Tanda Tangan Pengesahan (Khusus Cetak / Dokumen Resmi) -->
      <footer class="signatures-section">
        <div class="sig-space">
          <p class="sig-city">Trenggalek, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
          <p class="sig-role">Peserta Asesmen ASN,</p>
          <div class="sig-line"></div>
          <p class="sig-name font-semibold">{report.participant.nama}</p>
          <p class="sig-nip font-mono">NIP. {report.participant.nip}</p>
        </div>

        <div class="sig-space">
          <p class="sig-city">Mengetahui,</p>
          <p class="sig-role">Asesor / Kepala BKPSDM Kab. Trenggalek</p>
          <div class="sig-line"></div>
          <p class="sig-name font-semibold">Administrator Asesmen PENTA+</p>
          <p class="sig-nip font-mono">NIP. 198501012010011001</p>
        </div>
      </footer>
    </article>
  {/if}
</div>

<style>
  .report-page-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .report-actions-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-4);
  }

  .actions-right {
    display: flex;
    gap: var(--space-2);
  }

  /* Lembar Dokumen Resmi */
  .report-document {
    padding: var(--space-10);
    background-color: #ffffff;
    border: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  /* Kop Surat Resmi */
  .official-header {
    display: flex;
    align-items: center;
    gap: var(--space-6);
  }

  .header-emblem {
    flex-shrink: 0;
  }

  .header-logo-img {
    width: 72px;
    height: auto;
  }

  .header-titles {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .gov-text {
    font-size: var(--font-size-xs);
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--color-gold-dark);
  }

  .agency-text {
    font-size: var(--font-size-sm);
    font-weight: 800;
    color: var(--color-brand-navy);
    margin: 0;
    line-height: 1.3;
  }

  .doc-title {
    font-size: var(--font-size-lg);
    font-weight: 800;
    color: var(--color-text-main);
    margin: var(--space-1) 0 0 0;
  }

  .legal-basis {
    font-size: 11px;
    color: var(--color-text-muted);
  }

  .header-divider {
    height: 3px;
    background: linear-gradient(
      90deg,
      var(--color-brand-navy) 0%,
      var(--color-gold) 50%,
      var(--color-brand-navy) 100%
    );
    border-radius: var(--radius-full);
  }

  /* Identitas Metadata */
  .meta-section {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-6);
  }

  .meta-table-card {
    background-color: var(--color-bg-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
  }

  .section-title {
    font-size: var(--font-size-sm);
    font-weight: 700;
    color: var(--color-brand-navy);
    margin: 0 0 var(--space-3) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .section-desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin: 0 0 var(--space-4) 0;
  }

  .meta-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-xs);
  }

  .meta-table td {
    padding: 4px 0;
    vertical-align: top;
  }

  .col-label {
    width: 130px;
    color: var(--color-text-muted);
  }

  .col-sep {
    width: 15px;
    color: var(--color-text-muted);
  }

  .col-val {
    color: var(--color-text-main);
  }

  /* Banner Skor JPM & Kategori */
  .score-summary-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(
      135deg,
      rgba(10, 37, 64, 0.95) 0%,
      rgba(15, 23, 42, 0.98) 100%
    );
    color: #ffffff;
    padding: var(--space-6) var(--space-8);
    border-radius: var(--radius-lg);
    gap: var(--space-6);
    flex-wrap: wrap;
    border: 1px solid rgba(212, 160, 23, 0.4);
  }

  .jpm-main-display {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .jpm-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--color-gold-light);
  }

  .jpm-number {
    font-size: 42px;
    font-weight: 900;
    color: #ffffff;
    line-height: 1;
  }

  .jpm-desc {
    font-size: var(--font-size-xs);
    color: rgba(255, 255, 255, 0.7);
  }

  .category-display {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .cat-label {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
    text-transform: uppercase;
  }

  .cat-badge-large {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
  }

  .cat-badge-large.ms {
    background-color: rgba(16, 185, 129, 0.2);
    border: 1px solid rgba(16, 185, 129, 0.4);
    color: #a7f3d0;
  }

  .cat-badge-large.mms {
    background-color: rgba(212, 160, 23, 0.2);
    border: 1px solid rgba(212, 160, 23, 0.4);
    color: var(--color-gold-light);
  }

  .cat-badge-large.kms {
    background-color: rgba(239, 68, 68, 0.2);
    border: 1px solid rgba(239, 68, 68, 0.4);
    color: #fca5a5;
  }

  .cat-code {
    font-size: var(--font-size-lg);
    font-weight: 900;
  }

  .cat-name {
    font-size: var(--font-size-sm);
    font-weight: 700;
  }

  .score-pills-row {
    display: flex;
    gap: var(--space-3);
    font-size: 11px;
    color: rgba(255, 255, 255, 0.8);
  }

  /* Radar Section */
  .radar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .radar-wrapper {
    display: flex;
    justify-content: center;
    width: 100%;
    overflow-x: auto;
  }

  /* Tabel 9 Dimensi */
  .dimensions-table-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .table-responsive {
    overflow-x: auto;
  }

  .dimensions-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-xs);
  }

  .dimensions-table th {
    background-color: var(--color-bg-alt);
    color: var(--color-brand-navy);
    font-weight: 700;
    padding: var(--space-3);
    border-bottom: 2px solid var(--color-border);
    text-align: left;
  }

  .dimensions-table td {
    padding: var(--space-3);
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }

  .gap-pos {
    color: var(--color-success);
    font-weight: 700;
  }

  .gap-neg {
    color: var(--color-danger);
    font-weight: 700;
  }

  .pemenuhan-tag {
    display: inline-block;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-weight: 700;
    font-size: 11px;
  }

  .tag-green {
    background-color: rgba(16, 185, 129, 0.1);
    color: var(--color-success);
  }

  .tag-gold {
    background-color: rgba(212, 160, 23, 0.1);
    color: var(--color-gold-dark);
  }

  .tag-red {
    background-color: rgba(239, 68, 68, 0.1);
    color: var(--color-danger);
  }

  /* Rekomendasi Section */
  .recom-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-6);
  }

  .recom-box {
    padding: var(--space-4) var(--space-6);
    border-radius: var(--radius-md);
    background-color: var(--color-bg-alt);
    border: 1px solid var(--color-border);
  }

  .recom-box.strengths {
    border-left: 4px solid var(--color-success);
  }

  .recom-box.improvements {
    border-left: 4px solid var(--color-danger);
  }

  .recom-heading {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-size-sm);
    font-weight: 700;
    margin: 0 0 var(--space-2) 0;
  }

  .recom-desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin: 0 0 var(--space-3) 0;
  }

  .dim-list {
    margin: 0;
    padding-left: var(--space-4);
    font-size: var(--font-size-xs);
    line-height: 1.6;
    color: var(--color-text-main);
  }

  .empty-dim-text {
    font-size: var(--font-size-xs);
    font-style: italic;
    color: var(--color-text-muted);
    margin: 0;
  }

  /* Signatures Section */
  .signatures-section {
    display: flex;
    justify-content: space-between;
    margin-top: var(--space-8);
    padding-top: var(--space-6);
  }

  .sig-space {
    width: 260px;
    text-align: center;
    font-size: var(--font-size-xs);
  }

  .sig-city {
    margin: 0 0 2px 0;
    color: var(--color-text-muted);
  }

  .sig-role {
    margin: 0 0 60px 0;
    font-weight: 600;
    color: var(--color-text-main);
  }

  .sig-line {
    border-bottom: 1px solid var(--color-border-strong);
    margin-bottom: 4px;
  }

  .sig-name {
    margin: 0;
    color: var(--color-text-main);
  }

  .sig-nip {
    margin: 0;
    color: var(--color-text-muted);
  }

  .loading-state {
    padding: var(--space-12);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
  }

  .spinner-large {
    width: 36px;
    height: 36px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-brand-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Styling Khusus Cetak / Print PDF */
  @media print {
    .no-print {
      display: none !important;
    }

    :global(body) {
      background-color: #ffffff !important;
      color: #000000 !important;
    }

    .report-document {
      border: none !important;
      padding: 0 !important;
      box-shadow: none !important;
    }

    .score-summary-banner {
      background: #0a2540 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }

  @media (max-width: 768px) {
    .meta-section,
    .recom-grid,
    .signatures-section {
      grid-template-columns: 1fr;
      flex-direction: column;
      gap: var(--space-4);
    }

    .sig-space {
      width: 100%;
    }
  }
</style>
