<script lang="ts">
  import { onMount } from "svelte";
  import { ApiClient } from "../../../lib/api/client";
  import { Card, Badge, Button, Input, Modal, Alert } from "../../../lib/components/ui";
  import type { Question, Competency } from "../../../lib/types";

  let questions = $state<Question[]>([]);
  let competencies = $state<Competency[]>([]);
  let isLoading = $state(true);
  let isSubmitting = $state(false);
  let errorMessage = $state<string | null>(null);
  let successMessage = $state<string | null>(null);

  // Filter state
  let selectedCompetencyId = $state<string>("");
  let selectedTargetLevel = $state<string>("");
  let searchQuery = $state<string>("");

  // Modal Tambah Soal
  let isCreateModalOpen = $state(false);
  let newCompetencyId = $state<number>(1);
  let newTargetLevel = $state<number>(3);
  let newKasus = $state("");
  let optionA = $state({ teks: "", bobot: 4 });
  let optionB = $state({ teks: "", bobot: 3 });
  let optionC = $state({ teks: "", bobot: 2 });
  let optionD = $state({ teks: "", bobot: 1 });

  async function loadData() {
    isLoading = true;
    errorMessage = null;

    try {
      const params: Record<string, any> = {};
      if (selectedCompetencyId) params.competency_id = selectedCompetencyId;
      if (selectedTargetLevel) params.target_level = selectedTargetLevel;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [questionsRes, compRes] = await Promise.all([
        ApiClient.get<Question[]>("/questions", params),
        ApiClient.get<Competency[]>("/competencies"),
      ]);

      if (questionsRes.success && questionsRes.data) {
        questions = questionsRes.data;
      }
      if (compRes.success && compRes.data) {
        competencies = compRes.data;
        if (competencies.length > 0 && !newCompetencyId) {
          newCompetencyId = competencies[0]!.id;
        }
      }
    } catch (err: any) {
      errorMessage = err.message || "Gagal memuat bank soal SJT.";
    } finally {
      isLoading = false;
    }
  }

  function openCreateModal() {
    newKasus = "";
    newTargetLevel = 3;
    if (competencies.length > 0) newCompetencyId = competencies[0]!.id;
    optionA = { teks: "", bobot: 4 };
    optionB = { teks: "", bobot: 3 };
    optionC = { teks: "", bobot: 2 };
    optionD = { teks: "", bobot: 1 };
    isCreateModalOpen = true;
  }

  async function handleCreateQuestion() {
    if (!newKasus.trim()) {
      errorMessage = "Deskripsi skenario kasus wajib diisi.";
      return;
    }
    if (!optionA.teks.trim() || !optionB.teks.trim() || !optionC.teks.trim() || !optionD.teks.trim()) {
      errorMessage = "Seluruh 4 pilihan respon (A, B, C, D) wajib diisi.";
      return;
    }

    // Validasi bobot unik 1, 2, 3, 4
    const weights = [Number(optionA.bobot), Number(optionB.bobot), Number(optionC.bobot), Number(optionD.bobot)];
    const uniqueWeights = new Set(weights);
    if (uniqueWeights.size !== 4 || weights.some((w) => w < 1 || w > 4)) {
      errorMessage = "Kombinasi bobot nilai opsi jawaban harus tepat mencakup angka 1, 2, 3, dan 4 tanpa duplikasi.";
      return;
    }

    isSubmitting = true;
    errorMessage = null;

    try {
      const res = await ApiClient.post<Question>("/questions", {
        competency_id: Number(newCompetencyId),
        target_level: Number(newTargetLevel),
        kasus: newKasus.trim(),
        options: [
          { label: "A", teks_opsi: optionA.teks.trim(), bobot: Number(optionA.bobot) },
          { label: "B", teks_opsi: optionB.teks.trim(), bobot: Number(optionB.bobot) },
          { label: "C", teks_opsi: optionC.teks.trim(), bobot: Number(optionC.bobot) },
          { label: "D", teks_opsi: optionD.teks.trim(), bobot: Number(optionD.bobot) },
        ],
      });

      if (res.success) {
        successMessage = "Butir soal SJT baru berhasil ditambahkan.";
        isCreateModalOpen = false;
        await loadData();
      } else {
        errorMessage = res.message || "Gagal membuat butir soal.";
      }
    } catch (err: any) {
      errorMessage = err.message || "Terjadi kesalahan saat menambahkan butir soal.";
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDeleteQuestion(q: Question) {
    if (!confirm(`Hapus butir soal #${q.id} beserta seluruh opsi jawabannya?`)) return;

    try {
      const res = await ApiClient.delete(`/questions/${q.id}`);
      if (res.success) {
        successMessage = `Butir soal #${q.id} berhasil dihapus.`;
        await loadData();
      } else {
        errorMessage = res.message || "Gagal menghapus butir soal.";
      }
    } catch (err: any) {
      errorMessage = err.message || "Gagal menghapus butir soal.";
    }
  }

  onMount(() => {
    loadData();
  });
</script>

<svelte:head>
  <title>Bank Soal SJT PermenPANRB — PENTA+ Trenggalek</title>
</svelte:head>

<div class="questions-page">
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
          <h3>Bank Soal Situational Judgment Test (SJT)</h3>
          <p class="section-desc">Standar 9 Dimensi Kompetensi PermenPANRB No. 38 Tahun 2017</p>
        </div>
        <Button variant="gold" size="md" onclick={openCreateModal}>
          + Tambah Butir Soal SJT
        </Button>
      </div>
    {/snippet}

    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="filter-item">
        <label for="comp-filter" class="filter-label">Dimensi Kompetensi:</label>
        <select id="comp-filter" bind:value={selectedCompetencyId} onchange={loadData} class="select-input">
          <option value="">Semua 9 Dimensi</option>
          {#each competencies as c}
            <option value={c.id}>{c.kode} - {c.nama}</option>
          {/each}
        </select>
      </div>

      <div class="filter-item">
        <label for="level-filter" class="filter-label">Target Level Jabatan:</label>
        <select id="level-filter" bind:value={selectedTargetLevel} onchange={loadData} class="select-input">
          <option value="">Semua Level (1-4)</option>
          <option value="1">Level 1 (Pelaksana)</option>
          <option value="2">Level 2 (Pengawas / Eselon IV)</option>
          <option value="3">Level 3 (Administrator / Eselon III)</option>
          <option value="4">Level 4 (JPT Pratama / Eselon II)</option>
        </select>
      </div>

      <div class="filter-item search-item">
        <label for="search-input" class="filter-label">Cari Skenario Kasus:</label>
        <input
          id="search-input"
          type="search"
          placeholder="Kata kunci kasus..."
          bind:value={searchQuery}
          oninput={loadData}
          class="search-input-field"
        />
      </div>
    </div>

    <!-- Questions List -->
    {#if isLoading}
      <div class="loading-state">
        <span class="spinner" aria-hidden="true"></span>
        <span>Memuat bank butir soal...</span>
      </div>
    {:else if questions.length === 0}
      <div class="empty-state">
        <p>Tidak ada butir soal yang sesuai dengan kriteria filter.</p>
        <Button variant="gold" size="sm" onclick={openCreateModal}>
          Tambah Soal Baru
        </Button>
      </div>
    {:else}
      <div class="questions-stack">
        {#each questions as q, index}
          <div class="question-card">
            <div class="q-header">
              <div class="q-meta">
                <span class="q-number">#{index + 1} (ID: {q.id})</span>
                {#if q.competency}
                  <Badge variant="gold" size="sm">
                    {q.competency.kode} · {q.competency.nama}
                  </Badge>
                {/if}
                <Badge variant="default" size="sm">
                  Target Level {q.target_level}
                </Badge>
              </div>

              <Button variant="ghost" size="sm" onclick={() => handleDeleteQuestion(q)} class="btn-delete">
                Hapus
              </Button>
            </div>

            <p class="q-kasus">{q.kasus}</p>

            <div class="options-grid">
              {#each q.options as opt}
                <div class="option-item" class:opt-best={opt.bobot === 4}>
                  <div class="opt-left">
                    <span class="opt-label">{opt.label}</span>
                    <span class="opt-text">{opt.teks_opsi}</span>
                  </div>
                  <div class="opt-right">
                    <span class="bobot-badge" class:bobot-4={opt.bobot === 4}>
                      Bobot: {opt.bobot}
                    </span>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </Card>
</div>

<!-- Modal Tambah Butir Soal SJT -->
<Modal
  bind:isOpen={isCreateModalOpen}
  title="Tambah Butir Soal Situational Judgment Test (SJT)"
  size="lg"
>
  <form onsubmit={(e) => { e.preventDefault(); handleCreateQuestion(); }} class="modal-form">
    <div class="form-row">
      <div class="form-group">
        <label for="modal-comp" class="input-label">Dimensi Kompetensi PermenPANRB:</label>
        <select id="modal-comp" bind:value={newCompetencyId} class="select-input full-width">
          {#each competencies as c}
            <option value={c.id}>[{c.kategori}] {c.kode} - {c.nama}</option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label for="modal-lvl" class="input-label">Target Level Jabatan:</label>
        <select id="modal-lvl" bind:value={newTargetLevel} class="select-input full-width">
          <option value={1}>Level 1 - Pelaksana</option>
          <option value={2}>Level 2 - Pengawas / Eselon IV</option>
          <option value={3}>Level 3 - Administrator / Eselon III</option>
          <option value={4}>Level 4 - JPT Pratama / Eselon II</option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label for="modal-kasus" class="input-label">Skenario Studi Kasus Pemerintahan (SJT):</label>
      <textarea
        id="modal-kasus"
        rows="4"
        placeholder="Deskripsikan situasi dilema atau tantangan birokrasi nyata..."
        bind:value={newKasus}
        class="textarea-input"
        required
      ></textarea>
    </div>

    <div class="options-builder">
      <span class="builder-title">4 Pilihan Respon Tindakan &amp; Bobot Skor (1-4):</span>

      <div class="option-builder-row">
        <span class="builder-label">Opsi A</span>
        <input type="text" placeholder="Teks respon tindakan A..." bind:value={optionA.teks} class="builder-input" required />
        <select bind:value={optionA.bobot} class="builder-bobot">
          <option value={4}>Bobot 4 (Efektif)</option>
          <option value={3}>Bobot 3</option>
          <option value={2}>Bobot 2</option>
          <option value={1}>Bobot 1 (Kurang)</option>
        </select>
      </div>

      <div class="option-builder-row">
        <span class="builder-label">Opsi B</span>
        <input type="text" placeholder="Teks respon tindakan B..." bind:value={optionB.teks} class="builder-input" required />
        <select bind:value={optionB.bobot} class="builder-bobot">
          <option value={4}>Bobot 4</option>
          <option value={3}>Bobot 3</option>
          <option value={2}>Bobot 2</option>
          <option value={1}>Bobot 1</option>
        </select>
      </div>

      <div class="option-builder-row">
        <span class="builder-label">Opsi C</span>
        <input type="text" placeholder="Teks respon tindakan C..." bind:value={optionC.teks} class="builder-input" required />
        <select bind:value={optionC.bobot} class="builder-bobot">
          <option value={4}>Bobot 4</option>
          <option value={3}>Bobot 3</option>
          <option value={2}>Bobot 2</option>
          <option value={1}>Bobot 1</option>
        </select>
      </div>

      <div class="option-builder-row">
        <span class="builder-label">Opsi D</span>
        <input type="text" placeholder="Teks respon tindakan D..." bind:value={optionD.teks} class="builder-input" required />
        <select bind:value={optionD.bobot} class="builder-bobot">
          <option value={4}>Bobot 4</option>
          <option value={3}>Bobot 3</option>
          <option value={2}>Bobot 2</option>
          <option value={1}>Bobot 1</option>
        </select>
      </div>
    </div>
  </form>

  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isCreateModalOpen = false)} disabled={isSubmitting}>
      Batal
    </Button>
    <Button variant="gold" onclick={handleCreateQuestion} isLoading={isSubmitting}>
      {isSubmitting ? "Menyimpan..." : "Simpan Butir Soal"}
    </Button>
  {/snippet}
</Modal>

<style>
  .questions-page {
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

  .select-input, .search-input-field {
    height: 38px;
    padding: 0 var(--space-3);
    font-size: var(--font-size-xs);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    background-color: var(--color-bg-surface);
    color: var(--color-text-main);
  }

  .search-item {
    flex: 1 1 240px;
  }

  .search-input-field {
    width: 100%;
  }

  .questions-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .question-card {
    padding: var(--space-4);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    background-color: var(--color-bg-surface);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    transition: all var(--transition-fast);
  }

  .question-card:hover {
    border-color: var(--color-brand-accent-light);
    box-shadow: var(--shadow-sm);
  }

  .q-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .q-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .q-number {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-brand-primary);
  }

  .q-kasus {
    font-size: var(--font-size-sm);
    color: var(--color-text-main);
    line-height: 1.6;
    background-color: var(--color-bg-subtle);
    padding: var(--space-3);
    border-radius: var(--radius-sm);
  }

  .options-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }

  .option-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    background-color: var(--color-bg-surface);
  }

  .option-item.opt-best {
    border-color: var(--color-success-border);
    background-color: #f7fee7;
  }

  .opt-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .opt-label {
    font-weight: var(--font-weight-bold);
    color: var(--color-brand-primary);
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background-color: var(--color-bg-subtle);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    flex-shrink: 0;
  }

  .opt-text {
    color: var(--color-text-muted);
  }

  .bobot-badge {
    font-size: 10px;
    font-weight: var(--font-weight-bold);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    background-color: var(--color-bg-subtle);
    color: var(--color-text-subtle);
    white-space: nowrap;
  }

  .bobot-4 {
    background-color: var(--color-success);
    color: #ffffff;
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

  .textarea-input {
    width: 100%;
    padding: var(--space-3);
    font-family: var(--font-family-sans);
    font-size: var(--font-size-sm);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    outline: none;
    resize: vertical;
  }

  .textarea-input:focus {
    border-color: var(--color-brand-accent);
    box-shadow: var(--focus-ring);
  }

  .options-builder {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  .builder-title {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-brand-primary);
  }

  .option-builder-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .builder-label {
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-xs);
    width: 50px;
  }

  .builder-input {
    flex: 1 1 auto;
    height: 38px;
    padding: 0 var(--space-3);
    font-size: var(--font-size-xs);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
  }

  .builder-bobot {
    height: 38px;
    padding: 0 var(--space-2);
    font-size: var(--font-size-xs);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    background-color: var(--color-bg-surface);
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

  @media (max-width: 768px) {
    .options-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
