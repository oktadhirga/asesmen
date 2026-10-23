<script lang="ts">
  import { onMount } from "svelte";
  import { ApiClient } from "../../../lib/api/client";
  import { Card, Badge, Button, Input, Modal, Alert } from "../../../lib/components/ui";
  import type { AssessmentSession } from "../../../lib/types";

  let sessions = $state<AssessmentSession[]>([]);
  let isLoading = $state(true);
  let isSubmitting = $state(false);
  let errorMessage = $state<string | null>(null);
  let successMessage = $state<string | null>(null);

  // Modal Buat Sesi Baru
  let isCreateModalOpen = $state(false);
  let newKodeSesi = $state("");
  let newJudul = $state("");
  let newDeskripsi = $state("");
  let newDurasiMenit = $state(90);
  let newWaktuMulai = $state("");
  let newWaktuSelesai = $state("");
  let newTargetJenjang = $state<string>("PELAKSANA");
  let modalErrorMessage = $state<string | null>(null);

  // Modal Edit Sesi
  let isEditModalOpen = $state(false);
  let editingSession = $state<AssessmentSession | null>(null);
  let editJudul = $state("");
  let editDeskripsi = $state("");
  let editDurasiMenit = $state(90);
  let editWaktuMulai = $state("");
  let editWaktuSelesai = $state("");
  let editTargetJenjang = $state<string>("PELAKSANA");
  let editModalErrorMessage = $state<string | null>(null);
  let isEditSubmitting = $state(false);

  async function loadSessions() {
    isLoading = true;
    errorMessage = null;

    try {
      const res = await ApiClient.get<AssessmentSession[]>("/sessions", { limit: 50 });
      if (res.success && res.data) {
        sessions = res.data;
      } else {
        errorMessage = res.message || "Gagal memuat daftar sesi asesmen.";
      }
    } catch (err: any) {
      errorMessage = err.message || "Terjadi kesalahan saat memuat sesi.";
    } finally {
      isLoading = false;
    }
  }

  function openCreateModal() {
    const randomCode = `SESI-TRENGGALEK-${Math.floor(100 + Math.random() * 900)}`;
    newKodeSesi = randomCode;
    newJudul = "";
    newDeskripsi = "";
    newDurasiMenit = 90;
    newTargetJenjang = "PELAKSANA";
    modalErrorMessage = null;

    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    newWaktuMulai = now.toISOString().slice(0, 16);
    newWaktuSelesai = twoHoursLater.toISOString().slice(0, 16);

    isCreateModalOpen = true;
  }

  async function handleCreateSession() {
    modalErrorMessage = null;
    if (!newKodeSesi.trim() || !newJudul.trim()) {
      modalErrorMessage = "Kode sesi dan judul sesi wajib diisi.";
      return;
    }

    if (!newWaktuMulai || !newWaktuSelesai) {
      modalErrorMessage = "Waktu mulai dan waktu selesai wajib diisi.";
      return;
    }

    const startTime = new Date(newWaktuMulai);
    const endTime = new Date(newWaktuSelesai);
    if (endTime <= startTime) {
      modalErrorMessage = "Waktu selesai harus lebih akhir dari waktu mulai.";
      return;
    }

    isSubmitting = true;

    try {
      const payload: any = {
        kode_sesi: newKodeSesi.trim(),
        judul: newJudul.trim(),
        durasi_menit: Number(newDurasiMenit) || 60,
        waktu_mulai: startTime.toISOString(),
        waktu_selesai: endTime.toISOString(),
      };

      if (newDeskripsi.trim()) {
        payload.deskripsi = newDeskripsi.trim();
      }
      if (newTargetJenjang) {
        payload.target_jenjang = newTargetJenjang;
      }

      const res = await ApiClient.post<AssessmentSession>("/sessions", payload);

      if (res.success) {
        successMessage = `Sesi asesmen "${newJudul}" berhasil dibuat.`;
        isCreateModalOpen = false;
        await loadSessions();
      } else {
        modalErrorMessage = res.message || "Gagal membuat sesi baru.";
      }
    } catch (err: any) {
      modalErrorMessage = err.message || "Terjadi kesalahan saat membuat sesi.";
    } finally {
      isSubmitting = false;
    }
  }

  function openEditModal(session: AssessmentSession) {
    editingSession = session;
    editJudul = session.judul;
    editDeskripsi = session.deskripsi || "";
    editDurasiMenit = session.durasi_menit || 90;
    editTargetJenjang = session.target_jenjang || "PELAKSANA";
    editModalErrorMessage = null;

    if (session.waktu_mulai) {
      editWaktuMulai = new Date(session.waktu_mulai).toISOString().slice(0, 16);
    }
    if (session.waktu_selesai) {
      editWaktuSelesai = new Date(session.waktu_selesai).toISOString().slice(0, 16);
    }

    isEditModalOpen = true;
  }

  async function handleUpdateSession() {
    if (!editingSession) return;
    editModalErrorMessage = null;

    if (!editJudul.trim()) {
      editModalErrorMessage = "Judul sesi asesmen wajib diisi.";
      return;
    }

    if (!editWaktuMulai || !editWaktuSelesai) {
      editModalErrorMessage = "Waktu mulai dan waktu selesai wajib diisi.";
      return;
    }

    const startTime = new Date(editWaktuMulai);
    const endTime = new Date(editWaktuSelesai);
    if (endTime <= startTime) {
      editModalErrorMessage = "Waktu selesai harus lebih akhir dari waktu mulai.";
      return;
    }

    isEditSubmitting = true;

    try {
      const payload: any = {
        judul: editJudul.trim(),
        durasi_menit: Number(editDurasiMenit) || 60,
        waktu_mulai: startTime.toISOString(),
        waktu_selesai: endTime.toISOString(),
        deskripsi: editDeskripsi.trim() || null,
      };

      if (editingSession.status === "DRAFT") {
        payload.target_jenjang = editTargetJenjang;
      }

      const res = await ApiClient.put(`/sessions/${editingSession.id}`, payload);

      if (res.success) {
        successMessage = `Sesi asesmen "${editJudul}" berhasil diperbarui.`;
        isEditModalOpen = false;
        await loadSessions();
      } else {
        editModalErrorMessage = res.message || "Gagal memperbarui sesi.";
      }
    } catch (err: any) {
      editModalErrorMessage = err.message || "Terjadi kesalahan saat memperbarui sesi.";
    } finally {
      isEditSubmitting = false;
    }
  }

  async function updateStatus(session: AssessmentSession, newStatus: "DRAFT" | "BERJALAN" | "SELESAI") {
    if (!confirm(`Ubah status sesi "${session.judul}" menjadi ${newStatus}?`)) return;

    try {
      const res = await ApiClient.put(`/sessions/${session.id}`, {
        status: newStatus,
      });

      if (res.success) {
        successMessage = `Status sesi berhasil diubah menjadi ${newStatus}.`;
        await loadSessions();
      } else {
        errorMessage = res.message || "Gagal memperbarui status sesi.";
      }
    } catch (err: any) {
      errorMessage = err.message || "Gagal mengubah status sesi.";
    }
  }

  async function deleteSession(session: AssessmentSession) {
    if (!confirm(`Hapus sesi "${session.judul}"? Semua data peserta dan jawaban terkait akan dihapus secara permanen.`)) {
      return;
    }

    try {
      const res = await ApiClient.delete(`/sessions/${session.id}`);
      if (res.success) {
        successMessage = `Sesi "${session.judul}" berhasil dihapus.`;
        await loadSessions();
      } else {
        errorMessage = res.message || "Gagal menghapus sesi.";
      }
    } catch (err: any) {
      errorMessage = err.message || "Gagal menghapus sesi.";
    }
  }

  onMount(() => {
    loadSessions();
  });
</script>

<svelte:head>
  <title>Manajemen Sesi Asesmen — PENTA+ Trenggalek</title>
</svelte:head>

<div class="sessions-page">
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

  <Card>
    {#snippet header()}
      <div class="header-action-bar">
        <div>
          <h3>Daftar Sesi Ujian Asesmen ASN</h3>
          <p class="section-desc">Atur jadwal pelaksanaan ujian berbasis komputer (CBT) dan live proctoring</p>
        </div>
        <Button variant="gold" size="md" onclick={openCreateModal}>
          + Buat Sesi Asesmen Baru
        </Button>
      </div>
    {/snippet}

    {#if isLoading}
      <div class="loading-state">
        <span class="spinner" aria-hidden="true"></span>
        <span>Memuat data sesi asesmen...</span>
      </div>
    {:else if sessions.length === 0}
      <div class="empty-state">
        <p>Belum ada jadwal sesi asesmen.</p>
        <Button variant="gold" size="sm" onclick={openCreateModal}>
          Buat Sesi Pertama
        </Button>
      </div>
    {:else}
      <div class="table-container">
        <table class="data-table" aria-label="Daftar Sesi Asesmen">
          <thead>
            <tr>
              <th scope="col">Kode & Judul</th>
              <th scope="col">Waktu Pelaksanaan</th>
              <th scope="col">Durasi</th>
              <th scope="col">Status Siklus</th>
              <th scope="col">Peserta</th>
              <th scope="col">Aksi & Monitor</th>
            </tr>
          </thead>
          <tbody>
            {#each sessions as session}
              <tr>
                <td>
                  <div class="session-info">
                    <span class="session-code">{session.kode_sesi}</span>
                    <strong class="session-name">{session.judul}</strong>
                    {#if session.deskripsi}
                      <small class="session-desc-text">{session.deskripsi}</small>
                    {/if}
                  </div>
                </td>
                <td>
                  <div class="time-range">
                    <span>Mulai: {new Date(session.waktu_mulai).toLocaleString("id-ID")}</span>
                    <small>Selesai: {new Date(session.waktu_selesai).toLocaleString("id-ID")}</small>
                  </div>
                </td>
                <td>{session.durasi_menit} Menit</td>
                <td>
                  <div class="status-cell">
                    {#if session.status === "BERJALAN"}
                      <Badge variant="success" dot>BERJALAN</Badge>
                    {:else if session.status === "SELESAI"}
                      <Badge variant="default">SELESAI</Badge>
                    {:else}
                      <Badge variant="warning">DRAFT</Badge>
                    {/if}

                    <!-- Cycle Controls -->
                    <div class="cycle-buttons">
                      {#if session.status === "DRAFT"}
                        <button
                          type="button"
                          class="status-toggle-btn btn-start"
                          title="Mulai Sesi (Buka Akses Ujian)"
                          onclick={() => updateStatus(session, "BERJALAN")}
                        >
                          Mulai
                        </button>
                      {:else if session.status === "BERJALAN"}
                        <button
                          type="button"
                          class="status-toggle-btn btn-finish"
                          title="Selesaikan Sesi (Tutup Ujian)"
                          onclick={() => updateStatus(session, "SELESAI")}
                        >
                          Selesai
                        </button>
                      {/if}
                    </div>
                  </div>
                </td>
                <td>
                  <strong>{session.total_peserta || 0}</strong> Pegawai
                </td>
                <td>
                  <div class="actions-cell">
                    <Button
                      variant="primary"
                      size="sm"
                      onclick={() => (window.location.href = `/admin/sessions/${session.id}`)}
                      title="Lihat Daftar Peserta & Monitor Proctoring"
                    >
                      Proctoring &amp; Peserta
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onclick={() => openEditModal(session)}
                      title="Sunting Parameter Sesi Asesmen"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onclick={() => deleteSession(session)}
                      disabled={session.status === "BERJALAN"}
                      title={session.status === "BERJALAN" ? "Sesi sedang berjalan tidak dapat dihapus" : "Hapus Sesi"}
                    >
                      Hapus
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
</div>

<!-- Modal Tambah Sesi Baru -->
<Modal
  bind:isOpen={isCreateModalOpen}
  title="Buat Sesi Asesmen ASN Baru"
  size="md"
>
  <form onsubmit={(e) => { e.preventDefault(); handleCreateSession(); }} class="modal-form">
    {#if modalErrorMessage}
      <Alert variant="error">
        {modalErrorMessage}
      </Alert>
    {/if}

    <Input
      label="Kode Sesi (Unik)"
      placeholder="Contoh: SESI-TRENGGALEK-01"
      required
      bind:value={newKodeSesi}
      disabled={isSubmitting}
      helperText="Kode identifikasi resmi jadwal sesi asesmen"
    />

    <Input
      label="Judul Sesi Asesmen"
      placeholder="Contoh: Uji Kompetensi Administrator & Pengawas 2026"
      required
      bind:value={newJudul}
      disabled={isSubmitting}
    />

    <div class="form-row">
      <div class="form-group">
        <label for="select-target-jenjang" class="form-label">
          Target Jenjang Jabatan
        </label>
        <select
          id="select-target-jenjang"
          class="form-select"
          bind:value={newTargetJenjang}
          disabled={isSubmitting}
        >
          <option value="PELAKSANA">Pelaksana</option>
          <option value="PENGAWAS">Pengawas (Eselon IV)</option>
          <option value="ADMINISTRATOR">Administrator (Eselon III)</option>
          <option value="JPT">Jabatan Pimpinan Tinggi (JPT)</option>
        </select>
      </div>

      <Input
        label="Durasi Pengerjaan (Menit)"
        type="number"
        min="15"
        max="300"
        required
        bind:value={newDurasiMenit}
        disabled={isSubmitting}
      />
    </div>

    <Input
      label="Deskripsi / Catatan Tambahan (Opsional)"
      placeholder="Keterangan ruangan, sasaran eselon, dsb"
      bind:value={newDeskripsi}
      disabled={isSubmitting}
    />

    <div class="form-row">
      <Input
        label="Waktu Mulai"
        type="datetime-local"
        required
        bind:value={newWaktuMulai}
        disabled={isSubmitting}
      />

      <Input
        label="Waktu Selesai (Batas Akhir)"
        type="datetime-local"
        required
        bind:value={newWaktuSelesai}
        disabled={isSubmitting}
      />
    </div>
  </form>

  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isCreateModalOpen = false)} disabled={isSubmitting}>
      Batal
    </Button>
    <Button variant="gold" onclick={handleCreateSession} isLoading={isSubmitting}>
      {isSubmitting ? "Menyimpan..." : "Simpan Sesi Baru"}
    </Button>
  {/snippet}
</Modal>

<!-- Modal Edit Sesi Asesmen -->
{#if isEditModalOpen && editingSession}
  <Modal
    bind:isOpen={isEditModalOpen}
    title={`Edit Sesi Asesmen: ${editingSession.kode_sesi}`}
    size="md"
  >
    <form onsubmit={(e) => { e.preventDefault(); handleUpdateSession(); }} class="modal-form">
      {#if editModalErrorMessage}
        <Alert variant="error">{editModalErrorMessage}</Alert>
      {/if}

      {#if editingSession.status === "BERJALAN"}
        <Alert variant="warning">
          <strong>Perhatian:</strong> Sesi sedang berjalan. Kode sesi dan target jenjang dikunci demi menjaga validitas pengerjaan peserta yang sedang aktif.
        </Alert>
      {:else if editingSession.status === "SELESAI"}
        <Alert variant="info">
          Sesi ini telah selesai. Anda hanya dapat memperbarui judul arsip atau catatan deskripsi.
        </Alert>
      {/if}

      <Input
        label="Kode Sesi (Read-Only)"
        value={editingSession.kode_sesi}
        disabled
        helperText="Kode sesi unik tidak dapat diubah setelah dibuat"
      />

      <Input
        label="Judul Sesi Asesmen"
        required
        bind:value={editJudul}
        disabled={isEditSubmitting}
      />

      <div class="form-row">
        <div class="form-group">
          <label for="select-edit-target-jenjang" class="form-label">Target Jenjang Jabatan</label>
          <select
            id="select-edit-target-jenjang"
            class="form-select"
            bind:value={editTargetJenjang}
            disabled={isEditSubmitting || editingSession.status !== "DRAFT"}
          >
            <option value="PELAKSANA">Pelaksana</option>
            <option value="PENGAWAS">Pengawas (Eselon IV)</option>
            <option value="ADMINISTRATOR">Administrator (Eselon III)</option>
            <option value="JPT">Jabatan Pimpinan Tinggi (JPT)</option>
          </select>
        </div>

        <Input
          label="Durasi Pengerjaan (Menit)"
          type="number"
          min="15"
          max="300"
          required
          bind:value={editDurasiMenit}
          disabled={isEditSubmitting || editingSession.status === "SELESAI"}
        />
      </div>

      <Input
        label="Deskripsi / Catatan Tambahan (Opsional)"
        placeholder="Keterangan ruangan, sasaran eselon, dsb"
        bind:value={editDeskripsi}
        disabled={isEditSubmitting}
      />

      <div class="form-row">
        <Input
          label="Waktu Mulai"
          type="datetime-local"
          required
          bind:value={editWaktuMulai}
          disabled={isEditSubmitting || editingSession.status !== "DRAFT"}
        />

        <Input
          label="Waktu Selesai (Batas Akhir)"
          type="datetime-local"
          required
          bind:value={editWaktuSelesai}
          disabled={isEditSubmitting}
        />
      </div>
    </form>

    {#snippet footer()}
      <Button variant="secondary" onclick={() => (isEditModalOpen = false)} disabled={isEditSubmitting}>
        Batal
      </Button>
      <Button variant="gold" onclick={handleUpdateSession} isLoading={isEditSubmitting}>
        {isEditSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
      </Button>
    {/snippet}
  </Modal>
{/if}

<style>
  .sessions-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .header-action-bar {
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

  .loading-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-10);
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
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .data-table td {
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border-subtle);
    color: var(--color-text-main);
  }

  .session-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .session-code {
    font-size: 11px;
    font-family: var(--font-family-mono);
    color: var(--color-text-subtle);
  }

  .session-name {
    color: var(--color-brand-primary);
  }

  .session-desc-text {
    color: var(--color-text-subtle);
    font-size: var(--font-size-xs);
  }

  .time-range {
    display: flex;
    flex-direction: column;
    font-size: var(--font-size-xs);
    line-height: 1.4;
  }

  .status-cell {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .cycle-buttons {
    display: flex;
    gap: 4px;
  }

  .status-toggle-btn {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    border: none;
    cursor: pointer;
    transition: opacity var(--transition-fast);
  }

  .btn-start {
    background-color: var(--color-success);
    color: #ffffff;
  }
  .btn-finish {
    background-color: var(--color-brand-primary);
    color: #ffffff;
  }
  .status-toggle-btn:hover {
    opacity: 0.85;
  }

  .actions-cell {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .modal-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .form-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-main);
  }

  .form-select {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background-color: #ffffff;
    font-size: var(--font-size-sm);
    color: var(--color-text-main);
    outline: none;
    transition: border-color var(--transition-fast);
  }

  .form-select:focus {
    border-color: var(--color-brand-primary);
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
