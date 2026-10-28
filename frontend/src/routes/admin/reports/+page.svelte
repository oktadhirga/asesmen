<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { ApiClient } from "../../../lib/api/client";
  import { Card, Badge, Button, Modal, Alert, RadarChart } from "../../../lib/components/ui";
  import type { AssessmentSession, ParticipantReport } from "../../../lib/types";

  let sessions = $state<AssessmentSession[]>([]);
  let selectedSessionId = $state<number | null>(null);
  let sessionReport = $state<any>(null);
  let isLoading = $state(true);
  let isRecalculating = $state(false);
  let errorMessage = $state<string | null>(null);
  let successMessage = $state<string | null>(null);

  // Modal Detail Radar Chart Individu
  let isRadarModalOpen = $state(false);
  let individualReport = $state<ParticipantReport | null>(null);
  let isRadarLoading = $state(false);

  async function loadSessionsList() {
    isLoading = true;
    try {
      const res = await ApiClient.get<AssessmentSession[]>("/sessions", { limit: 100 });
      if (res.success && res.data) {
        sessions = res.data;

        // Cek apakah ada query param sessionId
        const querySessionId = page.url.searchParams.get("sessionId");
        if (querySessionId) {
          selectedSessionId = Number(querySessionId);
        } else if (sessions.length > 0) {
          selectedSessionId = sessions[0]!.id;
        }

        if (selectedSessionId) {
          await loadSessionReport(selectedSessionId);
        }

        // Cek jika ada query param participantId untuk langsung buka radar
        const queryParticipantId = page.url.searchParams.get("participantId");
        if (queryParticipantId) {
          await viewIndividualReport(Number(queryParticipantId));
        }
      }
    } catch (err: any) {
      errorMessage = err.message || "Gagal memuat sesi asesmen.";
    } finally {
      isLoading = false;
    }
  }

  async function loadSessionReport(sessionId: number) {
    isLoading = true;
    errorMessage = null;

    try {
      const res = await ApiClient.get(`/reports/session/${sessionId}`);
      if (res.success && res.data) {
        sessionReport = res.data;
      } else {
        errorMessage = res.message || "Gagal memuat rekapitulasi nilai sesi.";
        sessionReport = null;
      }
    } catch (err: any) {
      errorMessage = err.message || "Terjadi kesalahan saat memuat rekapitulasi.";
      sessionReport = null;
    } finally {
      isLoading = false;
    }
  }

  async function handleSessionSelect(e: Event) {
    const target = e.target as HTMLSelectElement;
    selectedSessionId = Number(target.value);
    if (selectedSessionId) {
      await loadSessionReport(selectedSessionId);
    }
  }

  async function viewIndividualReport(participantId: number) {
    isRadarLoading = true;
    isRadarModalOpen = true;
    individualReport = null;

    try {
      const res = await ApiClient.get<ParticipantReport>(`/reports/participant/${participantId}`);
      if (res.success && res.data) {
        individualReport = res.data;
      } else {
        errorMessage = res.message || "Gagal memuat laporan radar peserta.";
      }
    } catch (err: any) {
      errorMessage = err.message || "Terjadi kesalahan saat mengambil radar peserta.";
    } finally {
      isRadarLoading = false;
    }
  }

  async function recalculateScore(participantId: number) {
    isRecalculating = true;
    errorMessage = null;

    try {
      const res = await ApiClient.post(`/reports/participant/${participantId}/recalculate`);
      if (res.success) {
        successMessage = "Nilai perolehan dan persentase JPM berhasil dihitung ulang.";
        if (selectedSessionId) {
          await loadSessionReport(selectedSessionId);
        }
      } else {
        errorMessage = res.message || "Gagal menghitung ulang skor.";
      }
    } catch (err: any) {
      errorMessage = err.message || "Gagal melakukan rekalkulasi skor.";
    } finally {
      isRecalculating = false;
    }
  }

  onMount(() => {
    loadSessionsList();
  });
</script>

<svelte:head>
  <title>Rekapitulasi JPM & Radar Chart — PENTA+ Trenggalek</title>
</svelte:head>

<div class="reports-page">
  {#if successMessage}
    <Alert variant="success" dismissible onDismiss={() => (successMessage = null)}>
      {successMessage}
    </Alert>
  {/if}

  {#if errorMessage}
    <Alert variant="error" dismissible onDismiss={() => (errorMessage = null)}>
      {errorMessage}
    </Alert>
  {/if}

  <!-- Session Selector Header -->
  <Card>
    {#snippet header()}
      <div class="selector-header-wrap">
        <div>
          <h3>Rekapitulasi Hasil Asesmen &amp; JPM</h3>
          <p class="section-desc">Pilih sesi asesmen untuk meninjau statistik perolehan nilai dan pemenuhan standar PermenPANRB</p>
        </div>

        <div class="session-picker">
          <label for="session-select" class="picker-label">Pilih Sesi:</label>
          <select id="session-select" value={selectedSessionId} onchange={handleSessionSelect} class="picker-select">
            {#each sessions as s}
              <option value={s.id}>[{s.kode_sesi}] {s.judul}</option>
            {/each}
          </select>
        </div>
      </div>
    {/snippet}

    {#if isLoading}
      <div class="loading-state">
        <span class="spinner" aria-hidden="true"></span>
        <span>Mengkalkulasi rekapitulasi data sesi...</span>
      </div>
    {:else if !sessionReport}
      <div class="empty-state">
        <p>Pilih sesi asesmen di atas untuk melihat rekapitulasi nilai.</p>
      </div>
    {:else}
      <!-- Summary Statistics Grid -->
      <div class="report-stats-grid">
        <div class="stat-box">
          <span class="box-label">Total Peserta Ujian</span>
          <strong class="box-val">{sessionReport.total_participants || 0} ASN</strong>
        </div>

        <div class="stat-box">
          <span class="box-label">Rata-rata Nilai Sesi</span>
          <strong class="box-val">{sessionReport.average_score?.toFixed(1) || "0.0"}</strong>
        </div>

        <div class="stat-box">
          <span class="box-label">Nilai Tertinggi / Terendah</span>
          <strong class="box-val">
            {sessionReport.highest_score || 0} / {sessionReport.lowest_score || 0}
          </strong>
        </div>
      </div>

      <!-- Kategori Kelulusan Distribution (PermenPANRB) -->
      <div class="distribution-card glass-panel">
        <span class="dist-title">Sebaran Kategori Kelulusan Standar PermenPANRB 38/2017:</span>
        <div class="dist-grid">
          <div class="dist-item dist-ms">
            <div class="dist-header">
              <Badge variant="success" dot>MS (≥80%)</Badge>
              <span>{sessionReport.distribution?.ms?.count || 0} Orang</span>
            </div>
            <strong class="dist-pct">{sessionReport.distribution?.ms?.percentage || 0}%</strong>
            <small>Memenuhi Syarat</small>
          </div>

          <div class="dist-item dist-mms">
            <div class="dist-header">
              <Badge variant="warning" dot>MMS (68-79%)</Badge>
              <span>{sessionReport.distribution?.mms?.count || 0} Orang</span>
            </div>
            <strong class="dist-pct">{sessionReport.distribution?.mms?.percentage || 0}%</strong>
            <small>Masih Memenuhi Syarat</small>
          </div>

          <div class="dist-item dist-kms">
            <div class="dist-header">
              <Badge variant="danger" dot>KMS (&lt;68%)</Badge>
              <span>{sessionReport.distribution?.kms?.count || 0} Orang</span>
            </div>
            <strong class="dist-pct">{sessionReport.distribution?.kms?.percentage || 0}%</strong>
            <small>Kurang Memenuhi Syarat</small>
          </div>
        </div>
      </div>

      <!-- Leaderboard / Ranking Table -->
      <div class="ranking-section">
        <div class="ranking-header">
          <h4>Peringkat &amp; Laporan Individu Peserta</h4>
          <span class="ranking-sub">Urutan nilai perolehan tertinggi ke terendah</span>
        </div>

        <div class="table-container">
          <table class="data-table" aria-label="Tabel Peringkat Hasil Asesmen">
            <thead>
              <tr>
                <th scope="col">Peringkat</th>
                <th scope="col">Nama &amp; NIP Pegawai</th>
                <th scope="col">Jabatan &amp; Jenjang</th>
                <th scope="col">Status</th>
                <th scope="col">Total Skor</th>
                <th scope="col">Persentase JPM</th>
                <th scope="col">Kategori</th>
                <th scope="col">Aksi Analisis</th>
              </tr>
            </thead>
            <tbody>
              {#if !sessionReport.rankings || sessionReport.rankings.length === 0}
                <tr>
                  <td colspan="8" class="text-center">Belum ada data nilai peserta pada sesi ini.</td>
                </tr>
              {:else}
                {#each sessionReport.rankings as r}
                  <tr>
                    <td>
                      <span class="rank-badge" class:rank-top={r.rank <= 3}>
                        #{r.rank}
                      </span>
                    </td>
                    <td>
                      <div class="user-meta">
                        <strong class="user-name">{r.nama}</strong>
                        <span class="user-nip">NIP: {r.nip}</span>
                      </div>
                    </td>
                    <td>
                      <div class="job-meta">
                        <span>{r.jabatan || "-"}</span>
                        <small>{r.jenjang_jabatan || "-"}</small>
                      </div>
                    </td>
                    <td>
                      <Badge variant={r.status === "SELESAI" ? "success" : "default"} size="sm">
                        {r.status}
                      </Badge>
                    </td>
                    <td>
                      <span class="score-bold">{r.total_score || 0}</span>
                    </td>
                    <td>
                      <strong class="jpm-pct">{r.jpm_percentage}%</strong>
                    </td>
                    <td>
                      <Badge
                        variant={r.kategori_kelulusan === "MS" ? "success" : r.kategori_kelulusan === "MMS" ? "warning" : "danger"}
                        size="sm"
                        dot
                      >
                        {r.kategori_kelulusan || "KMS"}
                      </Badge>
                    </td>
                    <td>
                      <div class="action-btn-group">
                        <Button
                          variant="gold"
                          size="sm"
                          onclick={() => viewIndividualReport(r.participant_id)}
                        >
                          Radar Chart
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onclick={() => recalculateScore(r.participant_id)}
                          disabled={isRecalculating}
                          title="Hitung ulang JPM dari database"
                        >
                          Hitung Ulang
                        </Button>
                      </div>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  </Card>
</div>

<!-- Modal Radar Chart Individu Peserta -->
<Modal
  bind:isOpen={isRadarModalOpen}
  title="Laporan Kompetensi Individu — Profil Radar 9 Dimensi"
  size="lg"
>
  {#if isRadarLoading}
    <div class="loading-state">
      <span class="spinner" aria-hidden="true"></span>
      <span>Memuat data grafik radar 9 dimensi...</span>
    </div>
  {:else if individualReport}
    <div class="individual-report-content">
      <!-- Profile Header Summary -->
      <div class="participant-profile-bar glass-panel">
        <div class="profile-info">
          <h4 class="profile-fullname">{individualReport.participant.nama}</h4>
          <span class="profile-sub">
            NIP: {individualReport.participant.nip} · {individualReport.participant.jabatan}
          </span>
          <small class="profile-unit">
            {individualReport.participant.unit_kerja} ({individualReport.participant.jenjang_jabatan})
          </small>
        </div>

        <div class="profile-badges">
          <Badge
            variant={individualReport.summary.kategori_kelulusan === "MS" ? "success" : individualReport.summary.kategori_kelulusan === "MMS" ? "warning" : "danger"}
            size="md"
            dot
          >
            JPM: {individualReport.summary.jpm_percentage.toFixed(1)}% ({individualReport.summary.kategori_label})
          </Badge>
          <small class="score-note">Total Skor: {individualReport.summary.total_score} / {individualReport.summary.max_possible_score}</small>
        </div>
      </div>

      <!-- Radar Chart Visualizer -->
      <div class="radar-box">
        <RadarChart data={individualReport.radar_chart} maxLevel={5} size={440} />
      </div>

      <!-- Dimension Breakdown Table -->
      <div class="dimension-table-wrapper">
        <span class="table-subtitle">Rincian Capaian 9 Dimensi PermenPANRB No. 38 Tahun 2017:</span>
        <table class="dim-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama Dimensi Kompetensi</th>
              <th>Kategori</th>
              <th>Skor Riil</th>
              <th>Standar</th>
              <th>Gap</th>
            </tr>
          </thead>
          <tbody>
            {#each individualReport.radar_chart as dim}
              <tr>
                <td><strong>{dim.kode}</strong></td>
                <td>{dim.nama}</td>
                <td>
                  <Badge variant={dim.kategori === "MANAJERIAL" ? "default" : "info"} size="sm">
                    {dim.kategori}
                  </Badge>
                </td>
                <td><strong>{dim.skor.toFixed(2)}</strong></td>
                <td>{dim.standar}</td>
                <td>
                  <span class={dim.gap >= 0 ? "text-success" : "text-danger"}>
                    {dim.gap > 0 ? `+${dim.gap.toFixed(2)}` : dim.gap.toFixed(2)}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isRadarModalOpen = false)}>
      Tutup
    </Button>
  {/snippet}
</Modal>

<style>
  .reports-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .selector-header-wrap {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-4);
  }

  .section-desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-subtle);
    margin-top: 2px;
  }

  .session-picker {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .picker-label {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-muted);
  }

  .picker-select {
    height: 38px;
    padding: 0 var(--space-3);
    font-size: var(--font-size-xs);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    background-color: var(--color-bg-surface);
    color: var(--color-brand-primary);
    font-weight: var(--font-weight-medium);
  }

  .report-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-4);
    margin-top: var(--space-4);
  }

  .stat-box {
    display: flex;
    flex-direction: column;
    padding: var(--space-4);
    background-color: var(--color-bg-subtle);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-default);
  }

  .box-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-subtle);
  }

  .box-val {
    font-size: var(--font-size-xl);
    color: var(--color-brand-primary);
    margin-top: 2px;
  }

  .distribution-card {
    margin-top: var(--space-4);
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-md);
  }

  .dist-title {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-brand-primary);
    margin-bottom: var(--space-3);
    display: block;
  }

  .dist-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-4);
  }

  .dist-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid transparent;
  }

  .dist-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: var(--font-size-xs);
  }

  .dist-pct {
    font-size: 1.5rem;
    font-weight: 800;
    margin-top: 4px;
    line-height: 1;
  }

  .dist-ms {
    background-color: var(--color-success-bg);
    border-color: var(--color-success-border);
    color: var(--color-success-text);
  }

  .dist-mms {
    background-color: var(--color-warning-bg);
    border-color: var(--color-warning-border);
    color: var(--color-warning-text);
  }

  .dist-kms {
    background-color: var(--color-danger-bg);
    border-color: var(--color-danger-border);
    color: var(--color-danger-text);
  }

  .ranking-section {
    margin-top: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .ranking-header {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .ranking-sub {
    font-size: var(--font-size-xs);
    color: var(--color-text-subtle);
  }

  .table-container {
    overflow-x: auto;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-sm);
    text-align: left;
  }

  .data-table th {
    padding: var(--space-3) var(--space-4);
    background-color: var(--color-bg-subtle);
    color: var(--color-text-muted);
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-xs);
    border-bottom: 1px solid var(--color-border-default);
  }

  .data-table td {
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .rank-badge {
    font-family: var(--font-family-mono);
    font-weight: var(--font-weight-bold);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    background-color: var(--color-bg-subtle);
    font-size: var(--font-size-xs);
  }

  .rank-top {
    background-color: var(--color-gold-light);
    color: var(--color-gold-dark);
  }

  .user-meta, .job-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .user-name {
    color: var(--color-brand-primary);
  }

  .user-nip, .job-meta small {
    font-size: 11px;
    color: var(--color-text-subtle);
  }

  .score-bold {
    font-family: var(--font-family-mono);
    font-weight: var(--font-weight-bold);
  }

  .jpm-pct {
    font-family: var(--font-family-mono);
    color: var(--color-brand-primary);
  }

  .action-btn-group {
    display: flex;
    gap: var(--space-2);
  }

  .individual-report-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .participant-profile-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4);
    border-radius: var(--radius-md);
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .profile-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .profile-fullname {
    font-size: var(--font-size-base);
    color: var(--color-brand-primary);
  }

  .profile-sub, .profile-unit {
    font-size: var(--font-size-xs);
    color: var(--color-text-subtle);
  }

  .profile-badges {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .score-note {
    font-size: 11px;
    color: var(--color-text-subtle);
  }

  .radar-box {
    display: flex;
    justify-content: center;
    padding: var(--space-2) 0;
  }

  .dimension-table-wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .table-subtitle {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-brand-primary);
  }

  .dim-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-xs);
  }

  .dim-table th {
    background-color: var(--color-bg-subtle);
    padding: var(--space-2) var(--space-3);
    text-align: left;
    border-bottom: 1px solid var(--color-border-default);
  }

  .dim-table td {
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .text-success { color: var(--color-success); font-weight: var(--font-weight-bold); }
  .text-danger { color: var(--color-danger); font-weight: var(--font-weight-bold); }
  .text-center { text-align: center; }

  .loading-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-8);
    color: var(--color-text-subtle);
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--color-border-strong);
    border-top-color: var(--color-brand-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
