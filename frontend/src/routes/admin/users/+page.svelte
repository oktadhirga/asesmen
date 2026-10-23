<script lang="ts">
  import { onMount } from "svelte";
  import { ApiClient } from "../../../lib/api/client";
  import { Card, Badge, Button, Input, Modal, Alert } from "../../../lib/components/ui";
  import type { User, Role, JenjangJabatan } from "../../../lib/types";

  let users = $state<User[]>([]);
  let isLoading = $state(true);
  let isSubmitting = $state(false);
  let errorMessage = $state<string | null>(null);
  let successMessage = $state<string | null>(null);

  // Filters & Pagination
  let searchQuery = $state("");
  let filterRole = $state<string>("");
  let filterJenjang = $state<string>("");
  let currentPage = $state(1);
  let totalUsers = $state(0);
  const pageSize = 10;

  // Modal Tambah Pegawai
  let isCreateModalOpen = $state(false);
  let newNip = $state("");
  let newNama = $state("");
  let newEmail = $state("");
  let newPassword = $state("password123");
  let newRole = $state<Role>("PESERTA");
  let newJabatan = $state("");
  let newUnitKerja = $state("");
  let newInstansi = $state("Pemerintah Kabupaten Trenggalek");
  let newJenjang = $state<JenjangJabatan>("PELAKSANA");

  async function loadUsers() {
    isLoading = true;
    errorMessage = null;

    try {
      const params: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (filterRole) params.role = filterRole;
      if (filterJenjang) params.jenjang_jabatan = filterJenjang;

      const res = await ApiClient.get<User[]>("/users", params);
      if (res.success && res.data) {
        users = res.data;
        if (res.pagination) {
          totalUsers = res.pagination.total;
        }
      } else {
        errorMessage = res.message || "Gagal memuat data pegawai.";
      }
    } catch (err: any) {
      errorMessage = err.message || "Terjadi kesalahan saat memuat data pegawai.";
    } finally {
      isLoading = false;
    }
  }

  function openCreateModal() {
    newNip = "";
    newNama = "";
    newEmail = "";
    newPassword = "password123";
    newRole = "PESERTA";
    newJabatan = "";
    newUnitKerja = "";
    newInstansi = "Pemerintah Kabupaten Trenggalek";
    newJenjang = "PELAKSANA";
    isCreateModalOpen = true;
  }

  async function handleCreateUser() {
    if (!newNip.trim() || !newNama.trim()) {
      errorMessage = "NIP dan Nama lengkap pegawai wajib diisi.";
      return;
    }

    isSubmitting = true;
    errorMessage = null;

    try {
      const res = await ApiClient.post<User>("/users", {
        nip: newNip.trim(),
        nama: newNama.trim(),
        email: newEmail.trim() || null,
        password: newPassword.trim(),
        role: newRole,
        jabatan: newJabatan.trim(),
        unit_kerja: newUnitKerja.trim(),
        instansi: newInstansi.trim(),
        jenjang_jabatan: newJenjang,
      });

      if (res.success) {
        successMessage = `Pegawai "${newNama}" (NIP: ${newNip}) berhasil didaftarkan.`;
        isCreateModalOpen = false;
        await loadUsers();
      } else {
        errorMessage = res.message || "Gagal mendaftarkan pegawai.";
      }
    } catch (err: any) {
      errorMessage = err.message || "Terjadi kesalahan saat mendaftarkan pegawai.";
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDeleteUser(user: User) {
    if (!confirm(`Hapus pegawai "${user.nama}" (NIP: ${user.nip}) dari sistem?`)) return;

    try {
      const res = await ApiClient.delete(`/users/${user.id}`);
      if (res.success) {
        successMessage = `Akun ${user.nama} berhasil dihapus.`;
        await loadUsers();
      } else {
        errorMessage = res.message || "Gagal menghapus pegawai.";
      }
    } catch (err: any) {
      errorMessage = err.message || "Gagal menghapus pegawai.";
    }
  }

  onMount(() => {
    loadUsers();
  });
</script>

<svelte:head>
  <title>Data Pegawai ASN — PENTA+ Trenggalek</title>
</svelte:head>

<div class="users-page">
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
          <h3>Data Pegawai ASN &amp; Asesor</h3>
          <p class="section-desc">Pemerintah Kabupaten Trenggalek (Total: {totalUsers} Pegawai)</p>
        </div>
        <Button variant="gold" size="md" onclick={openCreateModal}>
          + Tambah Pegawai Baru
        </Button>
      </div>
    {/snippet}

    <!-- Filters & Search Bar -->
    <div class="filter-bar">
      <div class="filter-item search-item">
        <label for="search-user" class="filter-label">Cari Nama atau NIP:</label>
        <input
          id="search-user"
          type="search"
          placeholder="Ketik nama atau 18 digit NIP..."
          bind:value={searchQuery}
          oninput={loadUsers}
          class="search-input-field"
        />
      </div>

      <div class="filter-item">
        <label for="role-filter" class="filter-label">Role Akses:</label>
        <select id="role-filter" bind:value={filterRole} onchange={loadUsers} class="select-input">
          <option value="">Semua Role</option>
          <option value="PESERTA">Peserta ASN</option>
          <option value="ADMIN">Asesor / Admin</option>
        </select>
      </div>

      <div class="filter-item">
        <label for="jenjang-filter" class="filter-label">Jenjang Jabatan:</label>
        <select id="jenjang-filter" bind:value={filterJenjang} onchange={loadUsers} class="select-input">
          <option value="">Semua Jenjang</option>
          <option value="PELAKSANA">Pelaksana</option>
          <option value="PENGAWAS">Pengawas (Eselon IV)</option>
          <option value="ADMINISTRATOR">Administrator (Eselon III)</option>
          <option value="JPT">JPT (Eselon II)</option>
        </select>
      </div>
    </div>

    <!-- Table -->
    {#if isLoading}
      <div class="loading-state">
        <span class="spinner" aria-hidden="true"></span>
        <span>Memuat data pegawai ASN...</span>
      </div>
    {:else if users.length === 0}
      <div class="empty-state">
        <p>Tidak ada data pegawai yang cocok dengan filter pencarian.</p>
      </div>
    {:else}
      <div class="table-container">
        <table class="data-table" aria-label="Tabel Data Pegawai">
          <thead>
            <tr>
              <th scope="col">Nama &amp; NIP Pegawai</th>
              <th scope="col">Jabatan &amp; Unit Kerja</th>
              <th scope="col">Jenjang</th>
              <th scope="col">Role</th>
              <th scope="col">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {#each users as u}
              <tr>
                <td>
                  <div class="user-meta-cell">
                    <strong class="user-name">{u.nama}</strong>
                    <span class="user-nip">NIP: {u.nip}</span>
                    {#if u.email}
                      <small class="user-email">{u.email}</small>
                    {/if}
                  </div>
                </td>
                <td>
                  <div class="job-cell">
                    <span>{u.jabatan || "-"}</span>
                    <small>{u.unit_kerja || "Pemkab Trenggalek"}</small>
                  </div>
                </td>
                <td>
                  <Badge variant="default" size="sm">
                    {u.jenjang_jabatan}
                  </Badge>
                </td>
                <td>
                  <Badge variant={u.role === "ADMIN" ? "gold" : "info"} size="sm">
                    {u.role}
                  </Badge>
                </td>
                <td>
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => handleDeleteUser(u)}
                    class="btn-delete"
                  >
                    Hapus
                  </Button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>
</div>

<!-- Modal Tambah Pegawai ASN -->
<Modal
  bind:isOpen={isCreateModalOpen}
  title="Tambah Pegawai ASN / Asesor Baru"
  size="md"
>
  <form onsubmit={(e) => { e.preventDefault(); handleCreateUser(); }} class="modal-form">
    <Input
      label="Nomor Induk Pegawai (NIP)"
      placeholder="Contoh: 199001012015011001"
      required
      bind:value={newNip}
      disabled={isSubmitting}
      helperText="18 digit angka NIP resmi"
    />

    <Input
      label="Nama Lengkap & Gelar"
      placeholder="Contoh: Budi Santoso, S.STP, M.Si"
      required
      bind:value={newNama}
      disabled={isSubmitting}
    />

    <div class="form-row">
      <Input
        label="Email (Opsional)"
        type="email"
        placeholder="budi@trenggalekkab.go.id"
        bind:value={newEmail}
        disabled={isSubmitting}
      />

      <Input
        label="Kata Sandi Akun"
        type="text"
        required
        bind:value={newPassword}
        disabled={isSubmitting}
        helperText="Default: password123"
      />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="user-role" class="input-label">Role Akses:</label>
        <select id="user-role" bind:value={newRole} class="select-input full-width">
          <option value="PESERTA">Peserta Ujian ASN</option>
          <option value="ADMIN">Administrator / Asesor</option>
        </select>
      </div>

      <div class="form-group">
        <label for="user-jenjang" class="input-label">Jenjang Jabatan:</label>
        <select id="user-jenjang" bind:value={newJenjang} class="select-input full-width">
          <option value="PELAKSANA">Pelaksana</option>
          <option value="PENGAWAS">Pengawas (Eselon IV)</option>
          <option value="ADMINISTRATOR">Administrator (Eselon III)</option>
          <option value="JPT">JPT Pratama (Eselon II)</option>
        </select>
      </div>
    </div>

    <Input
      label="Jabatan Saat Ini"
      placeholder="Contoh: Analis Kebijakan Ahli Muda"
      bind:value={newJabatan}
      disabled={isSubmitting}
    />

    <Input
      label="Unit Kerja (OPD)"
      placeholder="Contoh: Badan Kepegawaian dan Pengembangan Sumber Daya Manusia"
      bind:value={newUnitKerja}
      disabled={isSubmitting}
    />
  </form>

  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isCreateModalOpen = false)} disabled={isSubmitting}>
      Batal
    </Button>
    <Button variant="gold" onclick={handleCreateUser} isLoading={isSubmitting}>
      {isSubmitting ? "Menyimpan..." : "Simpan Pegawai"}
    </Button>
  {/snippet}
</Modal>

<style>
  .users-page {
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

  .filter-bar {
    display: flex;
    align-items: flex-end;
    gap: var(--space-4);
    padding: var(--space-4);
    background-color: var(--color-bg-subtle);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-4);
    flex-wrap: wrap;
  }

  .filter-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .filter-label {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-muted);
  }

  .search-item {
    flex: 1 1 240px;
  }

  .select-input, .search-input-field {
    height: 38px;
    padding: 0 var(--space-3);
    font-size: var(--font-size-xs);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    background-color: var(--color-bg-surface);
    color: var(--color-text-main);
  }

  .search-input-field {
    width: 100%;
  }

  .table-container {
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

  .user-meta-cell, .job-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .user-name {
    color: var(--color-brand-primary);
  }

  .user-nip, .user-email, .job-cell small {
    font-size: 11px;
    color: var(--color-text-subtle);
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

  .full-width {
    width: 100%;
  }

  .input-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-main);
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
