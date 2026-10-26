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

  // Filter & Pagination state
  let selectedCompetencyId = $state<string>("");
  let selectedTargetLevel = $state<string>("");
  let searchQuery = $state<string>("");
  let currentPage = $state(1);
  let pageSize = $state(5); // Default 5 soal per halaman agar tidak terlalu panjang scroll
  let totalQuestions = $state(0);
  let totalPages = $state(1);

  // Modal Tambah Soal
  let isCreateModalOpen = $state(false);
  let newCompetencyId = $state<number>(1);
  let newTargetLevel = $state<number>(3);
  let newKasus = $state("");
  let optionA = $state({ teks: "", bobot: 4 });
  let optionB = $state({ teks: "", bobot: 3 });
  let optionC = $state({ teks: "", bobot: 2 });
  let optionD = $state({ teks: "", bobot: 1 });

  // Modal Ubah / Edit Soal
  let isEditModalOpen = $state(false);
  let editingQuestion = $state<Question | null>(null);
  let editCompetencyId = $state<number>(1);
  let editTargetLevel = $state<number>(3);
  let editKasus = $state("");
  let editOptionA = $state({ teks: "", bobot: 4 });
  let editOptionB = $state({ teks: "", bobot: 3 });
  let editOptionC = $state({ teks: "", bobot: 2 });
  let editOptionD = $state({ teks: "", bobot: 1 });

  async function loadData(page: number = currentPage) {
    currentPage = page;
    isLoading = true;
    errorMessage = null;

    try {
      const params: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
      };
      if (selectedCompetencyId) params.competency_id = selectedCompetencyId;
      if (selectedTargetLevel) params.target_level = selectedTargetLevel;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [questionsRes, compRes] = await Promise.all([
        ApiClient.get<Question[]>("/questions", params),
        ApiClient.get<Competency[]>("/competencies"),
      ]);

      if (questionsRes.success && questionsRes.data) {
        questions = questionsRes.data;
        if (questionsRes.pagination) {
          totalQuestions = questionsRes.pagination.total;
          totalPages = questionsRes.pagination.totalPages;
        } else {
          totalQuestions = questionsRes.data.length;
          totalPages = 1;
        }
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

  function handleFilterChange() {
    currentPage = 1;
    loadData(1);
  }

  function goToPage(page: number) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    loadData(page);
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
        skenario_kasus: newKasus.trim(),
        options: [
          { label: "A", teks_opsi: optionA.teks.trim(), bobot_nilai: Number(optionA.bobot) },
          { label: "B", teks_opsi: optionB.teks.trim(), bobot_nilai: Number(optionB.bobot) },
          { label: "C", teks_opsi: optionC.teks.trim(), bobot_nilai: Number(optionC.bobot) },
          { label: "D", teks_opsi: optionD.teks.trim(), bobot_nilai: Number(optionD.bobot) },
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

  function openEditModal(q: Question) {
    editingQuestion = q;
    editCompetencyId = q.competency_id;
    editTargetLevel = q.target_level;
    editKasus = q.skenario_kasus || q.kasus || "";

    const opts = q.options || [];
    const getOpt = (label: string, fallbackIdx: number, defaultBobot: number) => {
      const found = opts.find((o) => o.label?.toUpperCase() === label) || opts[fallbackIdx];
      return {
        teks: found?.teks_opsi || "",
        bobot: Number(found?.bobot_nilai ?? found?.bobot ?? defaultBobot),
      };
    };

    editOptionA = getOpt("A", 0, 4);
    editOptionB = getOpt("B", 1, 3);
    editOptionC = getOpt("C", 2, 2);
    editOptionD = getOpt("D", 3, 1);
    isEditModalOpen = true;
  }

  async function handleUpdateQuestion() {
    if (!editingQuestion) return;

    if (!editKasus.trim()) {
      errorMessage = "Deskripsi skenario kasus wajib diisi.";
      return;
    }
    if (
      !editOptionA.teks.trim() ||
      !editOptionB.teks.trim() ||
      !editOptionC.teks.trim() ||
      !editOptionD.teks.trim()
    ) {
      errorMessage = "Seluruh 4 pilihan respon (A, B, C, D) wajib diisi.";
      return;
    }

    const weights = [
      Number(editOptionA.bobot),
      Number(editOptionB.bobot),
      Number(editOptionC.bobot),
      Number(editOptionD.bobot),
    ];
    const uniqueWeights = new Set(weights);
    if (uniqueWeights.size !== 4 || weights.some((w) => w < 1 || w > 4)) {
      errorMessage =
        "Kombinasi bobot nilai opsi jawaban harus tepat mencakup angka 1, 2, 3, dan 4 tanpa duplikasi.";
      return;
    }

    isSubmitting = true;
    errorMessage = null;

    try {
      const res = await ApiClient.put<Question>(`/questions/${editingQuestion.id}`, {
        competency_id: Number(editCompetencyId),
        target_level: Number(editTargetLevel),
        skenario_kasus: editKasus.trim(),
        options: [
          { label: "A", teks_opsi: editOptionA.teks.trim(), bobot_nilai: Number(editOptionA.bobot) },
          { label: "B", teks_opsi: editOptionB.teks.trim(), bobot_nilai: Number(editOptionB.bobot) },
          { label: "C", teks_opsi: editOptionC.teks.trim(), bobot_nilai: Number(editOptionC.bobot) },
          { label: "D", teks_opsi: editOptionD.teks.trim(), bobot_nilai: Number(editOptionD.bobot) },
        ],
      });

      if (res.success) {
        successMessage = `Butir soal #${editingQuestion.id} berhasil diperbarui.`;
        isEditModalOpen = false;
        editingQuestion = null;
        await loadData();
      } else {
        errorMessage = res.message || "Gagal memperbarui butir soal.";
      }
    } catch (err: any) {
      errorMessage = err.message || "Terjadi kesalahan saat memperbarui butir soal.";
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
        <select id="comp-filter" bind:value={selectedCompetencyId} onchange={handleFilterChange} class="select-input">
          <option value="">Semua 9 Dimensi</option>
          {#each competencies as c}
            <option value={c.id}>{c.kode} - {c.nama}</option>
          {/each}
        </select>
      </div>

      <div class="filter-item">
        <label for="level-filter" class="filter-label">Target Level Jabatan:</label>
        <select id="level-filter" bind:value={selectedTargetLevel} onchange={handleFilterChange} class="select-input">
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
          oninput={handleFilterChange}
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
                <span class="q-number">#{(currentPage - 1) * pageSize + index + 1} (ID: {q.id})</span>
                {#if q.competency}
                  <Badge variant="gold" size="sm">
                    {q.competency.kode} · {q.competency.nama}
                  </Badge>
                {/if}
                <Badge variant="default" size="sm">
                  Target Level {q.target_level}
                </Badge>
              </div>

              <div class="q-actions">
                <Button variant="outline" size="sm" onclick={() => openEditModal(q)}>
                  Ubah
                </Button>
                <Button variant="ghost" size="sm" onclick={() => handleDeleteQuestion(q)} class="btn-delete">
                  Hapus
                </Button>
              </div>
            </div>

            <p class="q-kasus">{q.skenario_kasus || q.kasus}</p>

            <div class="options-grid">
              {#each q.options as opt}
                {@const optBobot = opt.bobot_nilai ?? opt.bobot}
                <div class="option-item" class:opt-best={optBobot === 4}>
                  <div class="opt-left">
                    <span class="opt-label">{opt.label}</span>
                    <span class="opt-text">{opt.teks_opsi}</span>
                  </div>
                  <div class="opt-right">
                    <span class="bobot-badge" class:bobot-4={optBobot === 4}>
                      Bobot: {optBobot}
                    </span>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>

      <!-- Pagination Controls -->
      {#if totalQuestions > 0}
        <div class="pagination-bar">
          <div class="pagination-info">
            Menampilkan <strong>{Math.min((currentPage - 1) * pageSize + 1, totalQuestions)}</strong> - <strong>{Math.min(currentPage * pageSize, totalQuestions)}</strong> dari <strong>{totalQuestions}</strong> butir soal
          </div>

          <div class="pagination-actions">
            <div class="page-size-selector">
              <label for="page-size-select" class="page-size-label">Per halaman:</label>
              <select
                id="page-size-select"
                bind:value={pageSize}
                onchange={() => { currentPage = 1; loadData(1); }}
                class="select-input select-page-size"
              >
                <option value={5}>5 butir</option>
                <option value={10}>10 butir</option>
                <option value={15}>15 butir</option>
                <option value={20}>20 butir</option>
              </select>
            </div>

            <div class="page-nav-buttons">
              <button
                type="button"
                class="page-nav-btn"
                onclick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
                aria-label="Halaman sebelumnya"
              >
                ← Sebelumnya
              </button>

              {#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
                <button
                  type="button"
                  class="page-num-btn"
                  class:active={p === currentPage}
                  onclick={() => goToPage(p)}
                  disabled={isLoading}
                >
                  {p}
                </button>
              {/each}

              <button
                type="button"
                class="page-nav-btn"
                onclick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages || isLoading}
                aria-label="Halaman selanjutnya"
              >
                Selanjutnya →
              </button>
            </div>
          </div>
        </div>
      {/if}
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

<!-- Modal Ubah Butir Soal SJT -->
<Modal
  bind:isOpen={isEditModalOpen}
  title={`Ubah Butir Soal SJT #${editingQuestion?.id || ""}`}
  size="lg"
>
  <form onsubmit={(e) => { e.preventDefault(); handleUpdateQuestion(); }} class="modal-form">
    <div class="form-row">
      <div class="form-group">
        <label for="edit-modal-comp" class="input-label">Dimensi Kompetensi PermenPANRB:</label>
        <select id="edit-modal-comp" bind:value={editCompetencyId} class="select-input full-width">
          {#each competencies as c}
            <option value={c.id}>[{c.kategori}] {c.kode} - {c.nama}</option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label for="edit-modal-lvl" class="input-label">Target Level Jabatan:</label>
        <select id="edit-modal-lvl" bind:value={editTargetLevel} class="select-input full-width">
          <option value={1}>Level 1 - Pelaksana</option>
          <option value={2}>Level 2 - Pengawas / Eselon IV</option>
          <option value={3}>Level 3 - Administrator / Eselon III</option>
          <option value={4}>Level 4 - JPT Pratama / Eselon II</option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label for="edit-modal-kasus" class="input-label">Skenario Studi Kasus Pemerintahan (SJT):</label>
      <textarea
        id="edit-modal-kasus"
        rows="4"
        placeholder="Deskripsikan situasi dilema atau tantangan birokrasi nyata..."
        bind:value={editKasus}
        class="textarea-input"
        required
      ></textarea>
    </div>

    <div class="options-builder">
      <span class="builder-title">4 Pilihan Respon Tindakan &amp; Bobot Skor (1-4):</span>

      <div class="option-builder-row">
        <span class="builder-label">Opsi A</span>
        <input type="text" placeholder="Teks respon tindakan A..." bind:value={editOptionA.teks} class="builder-input" required />
        <select bind:value={editOptionA.bobot} class="builder-bobot">
          <option value={4}>Bobot 4 (Efektif)</option>
          <option value={3}>Bobot 3</option>
          <option value={2}>Bobot 2</option>
          <option value={1}>Bobot 1 (Kurang)</option>
        </select>
      </div>

      <div class="option-builder-row">
        <span class="builder-label">Opsi B</span>
        <input type="text" placeholder="Teks respon tindakan B..." bind:value={editOptionB.teks} class="builder-input" required />
        <select bind:value={editOptionB.bobot} class="builder-bobot">
          <option value={4}>Bobot 4 (Efektif)</option>
          <option value={3}>Bobot 3</option>
          <option value={2}>Bobot 2</option>
          <option value={1}>Bobot 1 (Kurang)</option>
        </select>
      </div>

      <div class="option-builder-row">
        <span class="builder-label">Opsi C</span>
        <input type="text" placeholder="Teks respon tindakan C..." bind:value={editOptionC.teks} class="builder-input" required />
        <select bind:value={editOptionC.bobot} class="builder-bobot">
          <option value={4}>Bobot 4 (Efektif)</option>
          <option value={3}>Bobot 3</option>
          <option value={2}>Bobot 2</option>
          <option value={1}>Bobot 1 (Kurang)</option>
        </select>
      </div>

      <div class="option-builder-row">
        <span class="builder-label">Opsi D</span>
        <input type="text" placeholder="Teks respon tindakan D..." bind:value={editOptionD.teks} class="builder-input" required />
        <select bind:value={editOptionD.bobot} class="builder-bobot">
          <option value={4}>Bobot 4 (Efektif)</option>
          <option value={3}>Bobot 3</option>
          <option value={2}>Bobot 2</option>
          <option value={1}>Bobot 1 (Kurang)</option>
        </select>
      </div>
    </div>
  </form>

  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isEditModalOpen = false)} disabled={isSubmitting}>
      Batal
    </Button>
    <Button variant="gold" onclick={handleUpdateQuestion} isLoading={isSubmitting}>
      {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
    </Button>
  {/snippet}
</Modal>

<style>
  .q-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

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

  .pagination-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-4);
    margin-top: var(--space-6);
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border-default);
  }

  .pagination-info {
    font-size: var(--font-size-xs);
    color: var(--color-text-subtle);
  }

  .pagination-actions {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  .page-size-selector {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .page-size-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .select-page-size {
    height: 32px;
    padding: 0 var(--space-2);
    font-size: var(--font-size-xs);
  }

  .page-nav-buttons {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .page-nav-btn, .page-num-btn {
    height: 32px;
    padding: 0 var(--space-3);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    border: 1px solid var(--color-border-default);
    background-color: var(--color-bg-surface);
    color: var(--color-text-main);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .page-num-btn {
    min-width: 32px;
    padding: 0 var(--space-2);
  }

  .page-nav-btn:hover:not(:disabled), .page-num-btn:hover:not(:disabled) {
    background-color: var(--color-bg-subtle);
    border-color: var(--color-brand-primary);
    color: var(--color-brand-primary);
  }

  .page-num-btn.active {
    background-color: var(--color-brand-primary);
    color: #ffffff;
    border-color: var(--color-brand-primary);
    font-weight: var(--font-weight-bold);
  }

  .page-nav-btn:disabled, .page-num-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    .options-grid {
      grid-template-columns: 1fr;
    }

    .pagination-bar {
      flex-direction: column;
      align-items: stretch;
      gap: var(--space-3);
    }

    .pagination-actions {
      justify-content: space-between;
    }
  }
</style>
