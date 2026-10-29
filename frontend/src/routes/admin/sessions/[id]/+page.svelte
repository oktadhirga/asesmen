<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/state";
  import { ApiClient } from "../../../../lib/api/client";
  import {
    Card,
    Badge,
    Button,
    Input,
    Modal,
    Alert,
  } from "../../../../lib/components/ui";
  import type {
    AssessmentSession,
    SessionParticipant,
    User,
  } from "../../../../lib/types";

  const sessionId = $derived(Number(page.params.id));

  let session = $state<AssessmentSession | null>(null);
  let participants = $state<SessionParticipant[]>([]);
  let allUsers = $state<User[]>([]);
  let isLoading = $state(true);
  let errorMessage = $state<string | null>(null);
  let successMessage = $state<string | null>(null);

  // Modal Daftarkan Peserta
  let isAddParticipantModalOpen = $state(false);
  let selectedUserIds = $state<number[]>([]);
  let isSubmitting = $state(false);

  // Fitur Token Sesi Kolektif (Tahap 16)
  let copiedToken = $state(false);
  let isRefreshingToken = $state(false);
  let isProjectorModalOpen = $state(false);
  let currentTimeDisplay = $state("");
  let clockInterval: any = null;

  function updateClock() {
    currentTimeDisplay = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  async function copyToken() {
    if (session?.token_sesi) {
      try {
        await navigator.clipboard.writeText(session.token_sesi);
        copiedToken = true;
        setTimeout(() => (copiedToken = false), 2000);
      } catch (e) {
        // Fallback jika navigator clipboard diblokir
        prompt("Salin token sesi ini:", session.token_sesi);
      }
    }
  }

  async function handleRefreshToken() {
    if (
      !confirm(
        "Buat token sesi baru? Peserta yang belum mulai ujian harus memasukkan token baru ini.",
      )
    ) {
      return;
    }
    isRefreshingToken = true;
    try {
      const res = await ApiClient.post<any>(
        `/sessions/${sessionId}/refresh-token`,
        {},
      );
      if (res.success && res.data) {
        if (session) {
          session.token_sesi = res.data.token_sesi;
        }
        successMessage = `Token sesi berhasil diperbarui menjadi ${res.data.token_sesi}`;
      } else {
        errorMessage = res.message || "Gagal memperbarui token sesi.";
      }
    } catch (err: any) {
      errorMessage = err.message || "Gagal memperbarui token sesi.";
    } finally {
      isRefreshingToken = false;
    }
  }

  // Auto-refresh interval untuk Live Proctoring (setiap 5 detik saat ujian BERJALAN)
  let pollInterval: any = null;

  async function loadSessionDetails() {
    try {
      const [sessionRes, participantsRes] = await Promise.all([
        ApiClient.get<AssessmentSession>(`/sessions/${sessionId}`),
        ApiClient.get<SessionParticipant[]>(
          `/sessions/${sessionId}/participants`,
        ),
      ]);

      if (sessionRes.success && sessionRes.data) {
        session = sessionRes.data;
      }
      if (participantsRes.success && participantsRes.data) {
        participants = participantsRes.data;
      }
    } catch (err: any) {
      errorMessage = err.message || "Gagal memuat data detail sesi.";
    } finally {
      isLoading = false;
    }
  }

  async function openAddModal() {
    isAddParticipantModalOpen = true;
    selectedUserIds = [];

    // Ambil daftar user ASN yang ber-role PESERTA
    try {
      const res = await ApiClient.get<User[]>("/users", {
        role: "PESERTA",
        limit: 100,
      });
      if (res.success && res.data) {
        // Filter user yang belum terdaftar di sesi ini
        const existingUserIds = new Set(participants.map((p) => p.user_id));
        allUsers = res.data.filter((u) => !existingUserIds.has(u.id));
      }
    } catch (err: any) {
      errorMessage = "Gagal memuat daftar pegawai ASN.";
    }
  }

  function toggleUserSelection(userId: number) {
    if (selectedUserIds.includes(userId)) {
      selectedUserIds = selectedUserIds.filter((id) => id !== userId);
    } else {
      selectedUserIds = [...selectedUserIds, userId];
    }
  }

  async function handleAddParticipants() {
    if (selectedUserIds.length === 0) {
      errorMessage = "Pilih minimal 1 orang pegawai untuk didaftarkan.";
      return;
    }

    isSubmitting = true;
    errorMessage = null;

    try {
      const res = await ApiClient.post(`/sessions/${sessionId}/participants`, {
        user_ids: selectedUserIds,
      });

      if (res.success) {
        successMessage = `Berhasil mendaftarkan ${selectedUserIds.length} peserta ke sesi asesmen.`;
        isAddParticipantModalOpen = false;
        await loadSessionDetails();
      } else {
        errorMessage = res.message || "Gagal mendaftarkan peserta.";
      }
    } catch (err: any) {
      errorMessage =
        err.message || "Terjadi kesalahan saat mendaftarkan peserta.";
    } finally {
      isSubmitting = false;
    }
  }

  async function handleRemoveParticipant(p: SessionParticipant) {
    if (!confirm(`Keluarkan ${p.user?.nama || "peserta"} dari sesi ini?`))
      return;

    try {
      const res = await ApiClient.delete(
        `/sessions/${sessionId}/participants/${p.id}`,
      );
      if (res.success) {
        successMessage = "Peserta berhasil dikeluarkan dari sesi.";
        await loadSessionDetails();
      } else {
        errorMessage = res.message || "Gagal mengeluarkan peserta.";
      }
    } catch (err: any) {
      errorMessage = err.message || "Gagal mengeluarkan peserta.";
    }
  }

  async function handleStatusChange(
    newStatus: "DRAFT" | "BERJALAN" | "SELESAI",
  ) {
    if (!confirm(`Ubah status sesi menjadi ${newStatus}?`)) return;

    try {
      const res = await ApiClient.put(`/sessions/${sessionId}`, {
        status: newStatus,
      });
      if (res.success) {
        successMessage = `Status sesi diubah menjadi ${newStatus}.`;
        await loadSessionDetails();
      } else {
        errorMessage = res.message || "Gagal mengubah status sesi.";
      }
    } catch (err: any) {
      errorMessage = err.message || "Gagal mengubah status sesi.";
    }
  }

  onMount(async () => {
    updateClock();
    clockInterval = setInterval(updateClock, 1000);
    await loadSessionDetails();
    // Auto-polling live proctoring setiap 5 detik
    pollInterval = setInterval(() => {
      if (session?.status === "BERJALAN") {
        loadSessionDetails();
      }
    }, 5000);
  });

  onDestroy(() => {
    if (pollInterval) clearInterval(pollInterval);
    if (clockInterval) clearInterval(clockInterval);
  });
</script>

<svelte:head>
  <title>Live Proctoring — {session?.judul || "Sesi Asesmen"} — PENTA+</title>
</svelte:head>

<div class="session-detail-page">
  {#if successMessage}
    <Alert
      variant="success"
      dismissible
      onDismiss={() => (successMessage = null)}
    >
      {successMessage}
    </Alert>
  {/if}

  {#if errorMessage}
    <Alert variant="error" dismissible onDismiss={() => (errorMessage = null)}>
      {errorMessage}
    </Alert>
  {/if}

  <!-- Header Info & Action Controls -->
  {#if session}
    <Card class="session-header-card">
      <div class="session-meta-layout">
        <div class="meta-left">
          <div class="code-and-badge">
            <span class="kode-sesi-pill">{session.kode_sesi}</span>
            {#if session.status === "BERJALAN"}
              <Badge variant="success" dot>LIVE PROCTORING AKTIF</Badge>
            {:else if session.status === "SELESAI"}
              <Badge variant="default">SESI SELESAI</Badge>
            {:else}
              <Badge variant="warning">STATUS: DRAFT</Badge>
            {/if}
          </div>

          <h2 class="session-title">{session.judul}</h2>
          {#if session.deskripsi}
            <p class="session-desc">{session.deskripsi}</p>
          {/if}

          <div class="session-specs">
            <span>⏱ Durasi: <strong>{session.durasi_menit} Menit</strong></span
            >
            <span
              >📅 Mulai: <strong
                >{new Date(session.waktu_mulai).toLocaleString("id-ID")}</strong
              ></span
            >
            <span
              >🏁 Selesai: <strong
                >{new Date(session.waktu_selesai).toLocaleString(
                  "id-ID",
                )}</strong
              ></span
            >
          </div>
        </div>

        <div class="meta-right">
          <div class="btn-group-lifecycle">
            {#if session.status === "DRAFT"}
              <Button
                variant="primary"
                onclick={() => handleStatusChange("BERJALAN")}
              >
                ▶ Mulai Ujian (Buka Akses)
              </Button>
            {:else if session.status === "BERJALAN"}
              <Button
                variant="danger"
                onclick={() => handleStatusChange("SELESAI")}
              >
                ⏹ Akhiri Sesi (Tutup Ujian)
              </Button>
            {/if}
            <Button variant="gold" onclick={openAddModal}>
              + Daftarkan Pegawai ASN
            </Button>
          </div>
        </div>
      </div>
    </Card>

    <!-- Banner Token Sesi Kolektif (Tahap 16: 1 Sesi = 1 Token) -->
    {#if session.token_sesi}
      <div class="token-session-banner">
        <div class="token-banner-main">
          <div class="token-banner-badge">
            <span class="token-key-icon" aria-hidden="true">🔑</span>
            <span class="token-banner-label"
              >TOKEN SESI RUANG UJIAN (1 TOKEN KOLEKTIF)</span
            >
            {#if session.status === "BERJALAN"}
              <Badge variant="success" size="sm" dot>AKTIF UNTUK PESERTA</Badge>
            {:else if session.status === "DRAFT"}
              <Badge variant="warning" size="sm">SIAP (SESI DRAFT)</Badge>
            {:else}
              <Badge variant="default" size="sm">SESI SELESAI</Badge>
            {/if}
          </div>

          <div class="token-code-row">
            <div class="token-large-box">
              <span class="token-chars">{session.token_sesi}</span>
            </div>
            <button
              type="button"
              class="token-copy-btn"
              onclick={copyToken}
              title="Salin token sesi ke clipboard"
            >
              {copiedToken ? "✓ Tersalin!" : "📋 Salin Token"}
            </button>
          </div>

          <p class="token-banner-desc">
            Bagikan 6 digit token di atas kepada seluruh pegawai ASN yang hadir
            di ruang asesmen, atau proyeksikan ke layar depan ruangan. Token ini
            berlaku sama untuk seluruh peserta di sesi ini.
          </p>
        </div>

        <div class="token-banner-controls">
          <Button
            variant="gold"
            onclick={() => (isProjectorModalOpen = true)}
            class="projector-launch-btn"
          >
            🖥️ Buka Mode Layar Proyektor
          </Button>
          <Button
            variant="primary"
            size="sm"
            onclick={handleRefreshToken}
            disabled={isRefreshingToken || session.status === "SELESAI"}
          >
            🔄 {isRefreshingToken ? "Membuat..." : "Ganti / Refresh Token Baru"}
          </Button>
        </div>
      </div>
    {/if}

    <!-- Live Proctoring & Participant Table -->
    <Card>
      {#snippet header()}
        <div class="table-header-between">
          <div>
            <h3>Daftar Peserta &amp; Monitoring Proctoring</h3>
            <p class="section-sub">
              Deteksi pelanggaran integritas (perpindahan tab/jendela browser)
              diperbarui secara real-time
            </p>
          </div>
          <div class="refresh-indicator">
            {#if session?.status === "BERJALAN"}
              <span class="live-dot" aria-hidden="true"></span>
              <span class="live-text">Sinkronisasi Otomatis Tiap 5s</span>
            {/if}
            <Button variant="ghost" size="sm" onclick={loadSessionDetails}>
              Segarkan
            </Button>
          </div>
        </div>
      {/snippet}

      {#if isLoading}
        <div class="loading-state">
          <span class="spinner" aria-hidden="true"></span>
          <span>Memuat data peserta dan status proctoring...</span>
        </div>
      {:else if participants.length === 0}
        <div class="empty-state">
          <p>Belum ada peserta ASN yang didaftarkan pada sesi ini.</p>
          <Button variant="gold" size="sm" onclick={openAddModal}>
            Daftarkan Peserta Sekarang
          </Button>
        </div>
      {:else}
        <div class="table-wrapper">
          <table class="data-table" aria-label="Tabel Monitoring Peserta">
            <thead>
              <tr>
                <th scope="col">Nama &amp; NIP Pegawai</th>
                <th scope="col">Jabatan &amp; Unit Kerja</th>
                <th scope="col">Status Pengerjaan</th>
                <th scope="col">Pelanggaran Tab (Proctoring)</th>
                <th scope="col">Nilai / JPM</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {#each participants as p}
                <tr class:tr-alert={p.tab_switch_count > 0}>
                  <td>
                    <div class="participant-name-cell">
                      <strong class="user-fullname"
                        >{p.user?.nama || "Pegawai ASN"}</strong
                      >
                      <span class="user-nip">NIP: {p.user?.nip || "-"}</span>
                    </div>
                  </td>
                  <td>
                    <div class="job-meta">
                      <span>{p.user?.jabatan || "-"}</span>
                      <small>{p.user?.unit_kerja || "Pemkab Trenggalek"}</small>
                    </div>
                  </td>
                  <td>
                    {#if p.status === "SEDANG_MENGERJAKAN"}
                      <Badge variant="warning" dot>Mengerjakan</Badge>
                    {:else if p.status === "SELESAI"}
                      <Badge variant="success" dot>Selesai</Badge>
                    {:else}
                      <Badge variant="default">Terdaftar</Badge>
                    {/if}
                  </td>
                  <td>
                    {#if p.tab_switch_count > 0}
                      <Badge variant="danger" dot>
                        {p.tab_switch_count}x Switch Tab
                      </Badge>
                    {:else}
                      <span class="clean-proctoring">0 (Tertib)</span>
                    {/if}
                  </td>
                  <td>
                    {#if p.status === "SELESAI"}
                      <div class="score-display">
                        <span class="score-num">{p.total_score || 0}</span>
                        {#if p.kategori_kelulusan}
                          <Badge
                            variant={p.kategori_kelulusan === "MS"
                              ? "success"
                              : p.kategori_kelulusan === "MMS"
                                ? "warning"
                                : "danger"}
                            size="sm"
                          >
                            {p.kategori_kelulusan} ({p.jpm_percentage}%)
                          </Badge>
                        {/if}
                      </div>
                    {:else}
                      <span class="text-subtle">-</span>
                    {/if}
                  </td>
                  <td>
                    <div class="action-btn-row">
                      {#if p.status === "SELESAI"}
                        <Button
                          variant="outline"
                          size="sm"
                          onclick={() =>
                            (window.location.href = `/admin/reports?participantId=${p.id}`)}
                        >
                          Laporan JPM
                        </Button>
                      {/if}
                      {#if p.status === "TERDAFTAR"}
                        <Button
                          variant="danger"
                          size="sm"
                          onclick={() => handleRemoveParticipant(p)}
                        >
                          Keluarkan
                        </Button>
                      {/if}
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </Card>
  {/if}
</div>

<!-- Modal Daftarkan Pegawai ASN -->
<Modal
  bind:isOpen={isAddParticipantModalOpen}
  title="Daftarkan Pegawai ASN ke Sesi Asesmen"
  size="lg"
>
  <div class="participant-selector-container">
    <p class="selector-intro">
      Pilih pegawai ASN Pemerintah Kabupaten Trenggalek yang akan mengikuti sesi
      ujian ini:
    </p>

    {#if allUsers.length === 0}
      <div class="empty-selection">
        <p>
          Tidak ada pegawai ASN baru yang tersedia (semua sudah terdaftar pada
          sesi ini).
        </p>
      </div>
    {:else}
      <div class="user-selection-list">
        {#each allUsers as user}
          {@const isSelected = selectedUserIds.includes(user.id)}
          <div
            class="user-select-card"
            class:selected={isSelected}
            onclick={() => toggleUserSelection(user.id)}
            role="button"
            tabindex="0"
            onkeydown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                toggleUserSelection(user.id);
            }}
          >
            <div class="select-checkbox" aria-hidden="true">
              <input type="checkbox" checked={isSelected} readonly />
            </div>
            <div class="select-user-info">
              <strong>{user.nama}</strong>
              <span class="user-nip-sub">NIP: {user.nip} · {user.jabatan}</span>
              <small class="unit-text"
                >{user.unit_kerja} ({user.jenjang_jabatan})</small
              >
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  {#snippet footer()}
    <Button
      variant="secondary"
      onclick={() => (isAddParticipantModalOpen = false)}
      disabled={isSubmitting}
    >
      Batal
    </Button>
    <Button
      variant="gold"
      onclick={handleAddParticipants}
      disabled={selectedUserIds.length === 0 || isSubmitting}
      isLoading={isSubmitting}
    >
      Daftarkan ({selectedUserIds.length} Terpilih)
    </Button>
  {/snippet}
</Modal>

<!-- Mode Proyektor Layar Penuh (CAT Room Projection Screen) -->
{#if isProjectorModalOpen && session}
  <div class="projector-overlay" role="dialog" aria-modal="true">
    <div class="projector-header">
      <div class="projector-brand">
        <span class="projector-badge">PEMKAB TRENGGALEK · PENTA+ CAT</span>
        <span class="projector-clock"
          >Waktu Ruang Ujian: {currentTimeDisplay}</span
        >
      </div>
      <button
        type="button"
        class="projector-close-btn"
        onclick={() => (isProjectorModalOpen = false)}
        aria-label="Tutup Mode Layar Proyektor"
      >
        ✕ Tutup Layar Penuh
      </button>
    </div>

    <div class="projector-body">
      <div class="projector-session-info">
        <h1 class="projector-title">{session.judul}</h1>
        <p class="projector-sub">
          Kode Sesi: <strong>{session.kode_sesi}</strong> · Durasi:
          <strong>{session.durasi_menit} Menit</strong>
        </p>
      </div>

      <div class="projector-card">
        <div class="projector-token-header">
          <span class="token-pin-icon" aria-hidden="true">🔑</span>
          <span>TOKEN UJIAN SESI INI:</span>
        </div>
        <div class="projector-token-giant">
          {session.token_sesi}
        </div>
        <p class="projector-instructions">
          Masukkan 6 digit kode token di atas pada akun PENTA+ masing-masing
          untuk memulai lembar soal.
        </p>
      </div>

      <div class="projector-footer-rule">
        <span
          >⚠️ Dilarang membuka tab browser lain atau meninggalkan jendela ujian
          selama pengerjaan berlangsung.</span
        >
      </div>
    </div>
  </div>
{/if}

<style>
  .session-detail-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .session-meta-layout {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-6);
    flex-wrap: wrap;
    padding: var(--space-2) 0;
  }

  .meta-left {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .code-and-badge {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .kode-sesi-pill {
    font-size: var(--font-size-xs);
    font-family: var(--font-family-mono);
    font-weight: var(--font-weight-bold);
    background-color: var(--color-bg-subtle);
    border: 1px solid var(--color-border-default);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    color: var(--color-brand-primary);
  }

  .session-title {
    font-size: var(--font-size-2xl);
    color: var(--color-brand-primary);
  }

  .session-desc {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .session-specs {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    font-size: var(--font-size-xs);
    color: var(--color-text-subtle);
    flex-wrap: wrap;
    margin-top: var(--space-2);
  }

  .meta-right {
    display: flex;
    align-items: center;
  }

  .btn-group-lifecycle {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .table-header-between {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .section-sub {
    font-size: var(--font-size-xs);
    color: var(--color-text-subtle);
    margin-top: 2px;
  }

  .refresh-indicator {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .live-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--color-success);
    animation: pulseSubtle 1.5s infinite;
  }

  .live-text {
    font-size: 11px;
    color: var(--color-success);
    font-weight: var(--font-weight-semibold);
  }

  .table-wrapper {
    overflow-x: auto;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-sm);
  }

  .data-table th {
    padding: var(--space-3) var(--space-4);
    background-color: var(--color-bg-subtle);
    color: var(--color-text-muted);
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-xs);
    border-bottom: 1px solid var(--color-border-default);
    text-align: left;
  }

  .data-table td {
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .tr-alert {
    background-color: #fffaf0;
  }

  .participant-name-cell,
  .job-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .user-fullname {
    color: var(--color-brand-primary);
  }

  .user-nip,
  .job-meta small {
    font-size: 11px;
    color: var(--color-text-subtle);
  }

  .clean-proctoring {
    font-size: var(--font-size-xs);
    color: var(--color-success);
    font-weight: var(--font-weight-medium);
  }

  .score-display {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .score-num {
    font-family: var(--font-family-mono);
    font-weight: var(--font-weight-bold);
  }

  .action-btn-row {
    display: flex;
    gap: var(--space-2);
  }

  .participant-selector-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .selector-intro {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .user-selection-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    max-height: 380px;
    overflow-y: auto;
  }

  .user-select-card {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    cursor: pointer;
    background-color: var(--color-bg-surface);
    transition: all var(--transition-fast);
  }

  .user-select-card:hover {
    border-color: var(--color-brand-accent);
    background-color: var(--color-bg-subtle);
  }

  .user-select-card.selected {
    border-color: var(--color-brand-accent);
    background-color: #f0f7ff;
  }

  .select-user-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
    font-size: var(--font-size-xs);
  }

  .user-nip-sub {
    color: var(--color-text-muted);
  }

  .unit-text {
    color: var(--color-text-subtle);
  }

  .loading-state,
  .empty-state,
  .empty-selection {
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
    to {
      transform: rotate(360deg);
    }
  }

  /* Tahap 16: Banner Token Sesi Kolektif */
  .token-session-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    background: linear-gradient(135deg, #0a2540 0%, #173860 100%);
    color: #ffffff;
    border-radius: var(--radius-lg);
    padding: var(--space-5) var(--space-6);
    box-shadow: 0 4px 14px rgba(10, 37, 64, 0.15);
    border: 1px solid rgba(212, 175, 55, 0.3);
    flex-wrap: wrap;
  }

  .token-banner-main {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    max-width: 650px;
  }

  .token-banner-badge {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .token-banner-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #d4af37;
  }

  .token-code-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .token-large-box {
    background: rgba(0, 0, 0, 0.35);
    border: 2px dashed #d4af37;
    border-radius: var(--radius-md);
    padding: 6px 18px;
    display: inline-flex;
    align-items: center;
  }

  .token-chars {
    font-family: var(--font-family-mono);
    font-size: 1.85rem;
    font-weight: 800;
    letter-spacing: 0.25em;
    color: #ffffff;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  }

  .token-copy-btn {
    background: rgba(255, 255, 255, 0.15);
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: var(--radius-md);
    padding: 8px 14px;
    font-size: var(--font-size-xs);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .token-copy-btn:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: #ffffff;
  }

  .token-banner-desc {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
    line-height: 1.4;
  }

  .token-banner-controls {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    align-items: flex-end;
  }

  /* Overlay Proyektor Layar Penuh */
  .projector-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: radial-gradient(circle at center, #133966 0%, #061628 100%);
    color: #ffffff;
    display: flex;
    flex-direction: column;
    padding: var(--space-8);
    overflow: auto;
  }

  .projector-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    padding-bottom: var(--space-4);
  }

  .projector-brand {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .projector-badge {
    background: #d4af37;
    color: #0a2540;
    font-weight: 800;
    font-size: 13px;
    letter-spacing: 0.05em;
    padding: 4px 12px;
    border-radius: var(--radius-sm);
  }

  .projector-clock {
    font-family: var(--font-family-mono);
    font-size: 16px;
    color: rgba(255, 255, 255, 0.85);
  }

  .projector-close-btn {
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: #ffffff;
    font-weight: 600;
    font-size: 14px;
    padding: 8px 18px;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s;
  }

  .projector-close-btn:hover {
    background: rgba(255, 0, 0, 0.6);
    border-color: #ff4d4f;
  }

  .projector-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: var(--space-6);
    padding: var(--space-6) 0;
  }

  .projector-title {
    font-size: 2.5rem;
    font-weight: 800;
    color: #ffffff;
    margin-bottom: var(--space-2);
  }

  .projector-sub {
    font-size: 1.15rem;
    color: rgba(255, 255, 255, 0.75);
  }

  .projector-card {
    background: rgba(10, 37, 64, 0.7);
    border: 3px solid #d4af37;
    border-radius: var(--radius-xl);
    padding: var(--space-8) var(--space-12);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    max-width: 800px;
    width: 90%;
  }

  .projector-token-header {
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: #d4af37;
    margin-bottom: var(--space-3);
  }

  .projector-token-giant {
    font-family: var(--font-family-mono);
    font-size: 5rem;
    font-weight: 900;
    letter-spacing: 0.35em;
    color: #ffffff;
    padding: var(--space-4) 0;
    text-shadow: 0 4px 15px rgba(212, 175, 55, 0.5);
    user-select: all;
  }

  .projector-instructions {
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.9);
    margin-top: var(--space-4);
    line-height: 1.5;
  }

  .projector-footer-rule {
    font-size: 13px;
    color: #ffc069;
    background: rgba(255, 192, 105, 0.1);
    border: 1px solid rgba(255, 192, 105, 0.3);
    padding: 8px 24px;
    border-radius: 999px;
  }
</style>
