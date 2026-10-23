<script lang="ts">
  import { onMount } from "svelte";
  import { ApiClient } from "../../../lib/api/client";
  import { Card, Badge, Button, Alert } from "../../../lib/components/ui";
  import type { AssessmentSession, User, Question } from "../../../lib/types";

  let isLoading = $state(true);
  let errorMessage = $state<string | null>(null);

  let totalUsers = $state(0);
  let totalQuestions = $state(0);
  let totalSessions = $state(0);
  let activeSessionsCount = $state(0);
  let recentSessions = $state<AssessmentSession[]>([]);

  async function loadDashboardData() {
    isLoading = true;
    errorMessage = null;

    try {
      const [usersRes, questionsRes, sessionsRes] = await Promise.all([
        ApiClient.get<{ total: number }>("/users", { limit: 1 }),
        ApiClient.get<Question[]>("/questions"),
        ApiClient.get<AssessmentSession[]>("/sessions", { limit: 5 }),
      ]);

      if (usersRes.success && usersRes.pagination) {
        totalUsers = usersRes.pagination.total;
      }
      if (questionsRes.success && questionsRes.data) {
        totalQuestions = questionsRes.data.length;
      }
      if (sessionsRes.success && sessionsRes.data) {
        recentSessions = sessionsRes.data;
        totalSessions = sessionsRes.pagination?.total || sessionsRes.data.length;
        activeSessionsCount = sessionsRes.data.filter(
          (s) => s.status === "BERJALAN"
        ).length;
      }
    } catch (err: any) {
      errorMessage = err.message || "Gagal memuat ringkasan data dashboard.";
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    loadDashboardData();
  });
</script>

<svelte:head>
  <title>Dashboard Admin — PENTA+ Trenggalek</title>
</svelte:head>

<div class="dashboard-page">
  {#if errorMessage}
    <Alert variant="error" title="Kesalahan Sistem" dismissible onDismiss={() => (errorMessage = null)}>
      {errorMessage}
    </Alert>
  {/if}

  <!-- Stat Summary Cards Grid -->
  <div class="stats-grid">
    <div class="stat-card glass-panel">
      <div class="stat-icon-wrap icon-primary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      </div>
      <div class="stat-info">
        <span class="stat-count">{isLoading ? "..." : totalUsers}</span>
        <span class="stat-label">Total Pegawai Terdaftar</span>
      </div>
    </div>

    <div class="stat-card glass-panel">
      <div class="stat-icon-wrap icon-success">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </div>
      <div class="stat-info">
        <span class="stat-count">{isLoading ? "..." : activeSessionsCount}</span>
        <span class="stat-label">Sesi Ujian Sedang Berjalan</span>
      </div>
    </div>

    <div class="stat-card glass-panel">
      <div class="stat-icon-wrap icon-gold">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      </div>
      <div class="stat-info">
        <span class="stat-count">{isLoading ? "..." : totalQuestions}</span>
        <span class="stat-label">Bank Soal SJT PermenPANRB</span>
      </div>
    </div>

    <div class="stat-card glass-panel">
      <div class="stat-icon-wrap icon-info">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </div>
      <div class="stat-info">
        <span class="stat-count">{isLoading ? "..." : totalSessions}</span>
        <span class="stat-label">Total Jadwal Sesi Asesmen</span>
      </div>
    </div>
  </div>

  <!-- Main Content Grid: Live Sessions & Quick Operations -->
  <div class="dashboard-main-grid">
    <!-- Sesi Asesmen Terkini & Live Monitor -->
    <Card class="sessions-overview-card">
      {#snippet header()}
        <div class="card-header-between">
          <div>
            <h3>Sesi Asesmen Terkini</h3>
            <p class="section-sub">Pantau status pelaksanaan ujian dan proctoring peserta ASN</p>
          </div>
          <Button variant="outline" size="sm" onclick={() => (window.location.href = "/admin/sessions")}>
            Kelola Semua Sesi
          </Button>
        </div>
      {/snippet}

      {#if isLoading}
        <div class="loading-box">
          <span class="spinner" aria-hidden="true"></span>
          <span>Memuat daftar sesi...</span>
        </div>
      {:else if recentSessions.length === 0}
        <div class="empty-state">
          <p>Belum ada sesi asesmen yang dibuat.</p>
          <Button variant="gold" size="sm" onclick={() => (window.location.href = "/admin/sessions")}>
            Buat Sesi Asesmen Baru
          </Button>
        </div>
      {:else}
        <div class="sessions-table-wrapper">
          <table class="data-table" aria-label="Tabel Sesi Asesmen">
            <thead>
              <tr>
                <th scope="col">Kode & Judul Sesi</th>
                <th scope="col">Durasi</th>
                <th scope="col">Status</th>
                <th scope="col">Peserta</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {#each recentSessions as session}
                <tr>
                  <td>
                    <div class="session-name-cell">
                      <span class="session-code">{session.kode_sesi}</span>
                      <strong class="session-title">{session.judul}</strong>
                    </div>
                  </td>
                  <td>{session.durasi_menit} Menit</td>
                  <td>
                    {#if session.status === "BERJALAN"}
                      <Badge variant="success" dot>BERJALAN</Badge>
                    {:else if session.status === "SELESAI"}
                      <Badge variant="default">SELESAI</Badge>
                    {:else}
                      <Badge variant="warning">DRAFT</Badge>
                    {/if}
                  </td>
                  <td>{session.total_peserta || 0} ASN</td>
                  <td>
                    <div class="table-actions">
                      <Button
                        variant="primary"
                        size="sm"
                        onclick={() => (window.location.href = `/admin/sessions/${session.id}`)}
                      >
                        Monitor
                      </Button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </Card>

    <!-- Quick Actions Card -->
    <Card class="quick-actions-card">
      {#snippet header()}
        <h3>Aksi Cepat Administrator</h3>
      {/snippet}

      <div class="quick-links-stack">
        <a href="/admin/sessions" class="quick-action-btn">
          <div class="action-icon icon-gold">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </div>
          <div class="action-text">
            <strong>Jadwalkan Sesi Asesmen Baru</strong>
            <span>Tentukan waktu, batas durasi, dan daftarkan peserta ASN</span>
          </div>
        </a>

        <a href="/admin/questions" class="quick-action-btn">
          <div class="action-icon icon-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </div>
          <div class="action-text">
            <strong>Kelola Bank Soal SJT</strong>
            <span>Tambah atau sesuaikan butir soal studi kasus PermenPANRB</span>
          </div>
        </a>

        <a href="/admin/users" class="quick-action-btn">
          <div class="action-icon icon-info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="action-text">
            <strong>Data Pegawai Pemkab Trenggalek</strong>
            <span>Kelola master akun ASN, jabatan, dan jenjang</span>
          </div>
        </a>

        <a href="/admin/reports" class="quick-action-btn">
          <div class="action-icon icon-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
          <div class="action-text">
            <strong>Rekapitulasi Nilai & JPM Sesi</strong>
            <span>Lihat laporan kelulusan MS/MMS/KMS dan radar chart</span>
          </div>
        </a>
      </div>
    </Card>
  </div>
</div>

<style>
  .dashboard-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--space-4);
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-5);
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
  }

  .stat-icon-wrap {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .stat-icon-wrap svg {
    width: 24px;
    height: 24px;
  }

  .icon-primary {
    background-color: rgba(10, 37, 64, 0.08);
    color: var(--color-brand-primary);
  }
  .icon-success {
    background-color: var(--color-success-bg);
    color: var(--color-success);
  }
  .icon-gold {
    background-color: var(--color-gold-light);
    color: var(--color-gold-dark);
  }
  .icon-info {
    background-color: var(--color-info-bg);
    color: var(--color-info);
  }

  .stat-info {
    display: flex;
    flex-direction: column;
  }

  .stat-count {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-brand-primary);
    line-height: 1.1;
  }

  .stat-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-subtle);
    font-weight: var(--font-weight-medium);
  }

  .dashboard-main-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--space-6);
  }

  .card-header-between {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .section-sub {
    font-size: var(--font-size-xs);
    color: var(--color-text-subtle);
    margin-top: 2px;
  }

  .loading-box {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-8);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-8);
    color: var(--color-text-subtle);
  }

  .sessions-table-wrapper {
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
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .data-table td {
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border-subtle);
    color: var(--color-text-main);
  }

  .session-name-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .session-code {
    font-size: 11px;
    font-family: var(--font-family-mono);
    color: var(--color-text-subtle);
  }

  .session-title {
    color: var(--color-brand-primary);
  }

  .quick-links-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .quick-action-btn {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-default);
    background-color: var(--color-bg-subtle);
    text-decoration: none;
    transition: all var(--transition-fast);
  }

  .quick-action-btn:hover {
    background-color: var(--color-bg-surface);
    border-color: var(--color-brand-accent-light);
    transform: translateX(3px);
    text-decoration: none;
  }

  .action-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .action-icon svg {
    width: 18px;
    height: 18px;
  }

  .action-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .action-text strong {
    font-size: var(--font-size-sm);
    color: var(--color-brand-primary);
  }

  .action-text span {
    font-size: var(--font-size-xs);
    color: var(--color-text-subtle);
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--color-border-strong);
    border-top-color: var(--color-brand-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 960px) {
    .dashboard-main-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
