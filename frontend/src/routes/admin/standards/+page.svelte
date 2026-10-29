<script lang="ts">
  import { onMount } from "svelte";
  import { ApiClient } from "../../../lib/api/client";
  import { Card, Badge, Button, Alert } from "../../../lib/components/ui";
  import type { MasterJabatan, Competency } from "../../../lib/types";

  // Tab State
  let activeTab = $state<"matriks" | "kamus">("matriks");

  // Data State
  let isLoading = $state(true);
  let errorMessage = $state<string | null>(null);
  let jabatanList = $state<MasterJabatan[]>([]);
  let competenciesList = $state<Competency[]>([]);

  // Filter Matriks
  let selectedKelompok = $state<string>("");

  // Detail Matriks Jenjang
  let selectedJabatan = $state<MasterJabatan | null>(null);
  let jabatanStandards = $state<Array<{
    competency_id: number;
    competency_kode?: string;
    competency_nama?: string;
    kode_kompetensi?: string;
    nama_kompetensi?: string;
    kategori?: "MANAJERIAL" | "SOSIO_KULTURAL";
    target_level: number;
  }>>([]);
  let isStandardsLoading = $state(false);

  // Kamus State
  let selectedCompetencyId = $state<number>(1);
  let isIndicatorsLoading = $state(false);
  let currentCompetency = $state<Competency | null>(null);
  let currentIndicators = $state<Array<{
    id: number;
    level: number;
    nama_level?: string;
    deskripsi_level?: string;
    nomor_indikator: number;
    deskripsi_indikator: string;
  }>>([]);

  // Cache
  let standardsCache = $state<Record<number, any[]>>({});
  let indicatorsCache = $state<Record<number, { competency: any; indicators: any[] }>>({});

  // 14 Jenjang fallback
  const FALLBACK_JABATAN: MasterJabatan[] = [
    { id: 1, kode: "JPT_UTAMA", nama: "JPT Utama", kelompok_jabatan: "Jabatan Pimpinan Tinggi", level_standar_umum: 5 },
    { id: 2, kode: "JPT_MADYA", nama: "JPT Madya", kelompok_jabatan: "Jabatan Pimpinan Tinggi", level_standar_umum: 5 },
    { id: 3, kode: "JPT_PRATAMA", nama: "JPT Pratama", kelompok_jabatan: "Jabatan Pimpinan Tinggi", level_standar_umum: 4 },
    { id: 4, kode: "ADMINISTRATOR", nama: "Jabatan Administrator", kelompok_jabatan: "Jabatan Administrasi", level_standar_umum: 3 },
    { id: 5, kode: "PENGAWAS", nama: "Jabatan Pengawas", kelompok_jabatan: "Jabatan Administrasi", level_standar_umum: 2 },
    { id: 6, kode: "PELAKSANA", nama: "Jabatan Pelaksana", kelompok_jabatan: "Jabatan Administrasi", level_standar_umum: 1 },
    { id: 7, kode: "JF_AHLI_UTAMA", nama: "JF Ahli Utama", kelompok_jabatan: "JF Keahlian", level_standar_umum: 4 },
    { id: 8, kode: "JF_AHLI_MADYA", nama: "JF Ahli Madya", kelompok_jabatan: "JF Keahlian", level_standar_umum: 4 },
    { id: 9, kode: "JF_AHLI_MUDA", nama: "JF Ahli Muda", kelompok_jabatan: "JF Keahlian", level_standar_umum: 3 },
    { id: 10, kode: "JF_AHLI_PERTAMA", nama: "JF Ahli Pertama", kelompok_jabatan: "JF Keahlian", level_standar_umum: 2 },
    { id: 11, kode: "JF_PENYELIA", nama: "JF Penyelia", kelompok_jabatan: "JF Keterampilan", level_standar_umum: 3 },
    { id: 12, kode: "JF_MAHIR", nama: "JF Mahir", kelompok_jabatan: "JF Keterampilan", level_standar_umum: 2 },
    { id: 13, kode: "JF_TERAMPIL", nama: "JF Terampil", kelompok_jabatan: "JF Keterampilan", level_standar_umum: 2 },
    { id: 14, kode: "JF_PEMULA", nama: "JF Pemula", kelompok_jabatan: "JF Keterampilan", level_standar_umum: 1 },
  ];

  // Matriks lengkap map jenjang_id -> competency_kode -> target_level
  let fullMatrix = $state<Record<number, Record<string, number>>>({});

  async function loadInitialData() {
    isLoading = true;
    errorMessage = null;

    try {
      // 1. Load Jabatan
      const resJabatan = await ApiClient.get<MasterJabatan[]>("/jabatan");
      if (resJabatan.success && resJabatan.data && resJabatan.data.length > 0) {
        jabatanList = resJabatan.data;
      } else {
        jabatanList = FALLBACK_JABATAN;
      }

      // 2. Load Competencies
      const resComp = await ApiClient.get<Competency[]>("/competencies");
      if (resComp.success && resComp.data && resComp.data.length > 0) {
        competenciesList = resComp.data;
        selectedCompetencyId = resComp.data[0]!.id;
      }

      // 3. Load Matrix Standards untuk semua jenjang
      await loadAllStandards();

      // 4. Default pilih jabatan pertama
      if (jabatanList.length > 0) {
        selectJabatan(jabatanList[0]!);
      }

      // 5. Default load indikator kompetensi pertama
      if (competenciesList.length > 0) {
        selectCompetency(competenciesList[0]!.id);
      }
    } catch (err: any) {
      errorMessage = err.message || "Gagal memuat master data standar ASN.";
      jabatanList = FALLBACK_JABATAN;
    } finally {
      isLoading = false;
    }
  }

  async function loadAllStandards() {
    const matrix: Record<number, Record<string, number>> = {};

    // 1. Coba ambil seluruh matriks sekaligus via /jabatan/standards
    try {
      const resAll = await ApiClient.get<any[]>("/jabatan/standards");
      if (resAll.success && resAll.data && Array.isArray(resAll.data) && resAll.data.length > 0) {
        for (const s of resAll.data) {
          const jId = s.jenjang_jabatan_id;
          if (!matrix[jId]) {
            matrix[jId] = {};
          }
          const compKode = s.kode_kompetensi || s.competency?.kode || s.competency_kode;
          if (compKode) {
            matrix[jId]![compKode] = s.target_level;
          }
          if (!standardsCache[jId]) {
            standardsCache[jId] = [];
          }
          standardsCache[jId].push(s);
        }
        fullMatrix = matrix;
        return;
      }
    } catch (e) {
      console.warn("Fallback to per-jabatan standards loading", e);
    }

    // 2. Fallback: ambil standar per jenjang secara paralel
    await Promise.all(
      jabatanList.map(async (j) => {
        try {
          const res = await ApiClient.get<any>(`/jabatan/${j.id}/standards`);
          if (res.success && res.data && res.data.standards) {
            standardsCache[j.id] = res.data.standards;
            matrix[j.id] = {};
            for (const s of res.data.standards) {
              const compKode = s.kode_kompetensi || s.competency?.kode || s.competency_kode;
              if (compKode) {
                matrix[j.id]![compKode] = s.target_level;
              }
            }
          }
        } catch {
          // Abaikan per item bila offline/gagal
        }
      })
    );
    fullMatrix = matrix;
  }

  async function selectJabatan(j: MasterJabatan) {
    selectedJabatan = j;
    if (standardsCache[j.id] && standardsCache[j.id].length > 0) {
      jabatanStandards = standardsCache[j.id]!;
      return;
    }

    isStandardsLoading = true;
    try {
      const res = await ApiClient.get<any>(`/jabatan/${j.id}/standards`);
      if (res.success && res.data && res.data.standards) {
        jabatanStandards = res.data.standards;
        standardsCache[j.id] = res.data.standards;
      }
    } catch (err: any) {
      console.error("Gagal memuat standar jenjang:", err);
    } finally {
      isStandardsLoading = false;
    }
  }

  async function selectCompetency(id: number) {
    selectedCompetencyId = id;
    const found = competenciesList.find((c) => c.id === id);
    currentCompetency = found || null;

    if (indicatorsCache[id]) {
      currentIndicators = indicatorsCache[id]!.indicators;
      return;
    }

    isIndicatorsLoading = true;
    try {
      const res = await ApiClient.get<any>(`/competencies/${id}/indicators`);
      if (res.success && res.data) {
        currentIndicators = res.data.indicators || [];
        indicatorsCache[id] = res.data;
      }
    } catch (err: any) {
      console.error("Gagal memuat indikator kompetensi:", err);
    } finally {
      isIndicatorsLoading = false;
    }
  }

  function normalizeKelompok(k: string | null | undefined): string {
    if (!k) return "";
    const str = k.toUpperCase().replace(/[\s_-]+/g, "");
    if (str.includes("PIMPINANTINGGI") || str === "JPT") return "JPT";
    if (str.includes("ADMINISTRASI")) return "ADMINISTRASI";
    if (str.includes("KEAHLIAN")) return "JF_KEAHLIAN";
    if (str.includes("KETERAMPILAN")) return "JF_KETERAMPILAN";
    return str;
  }

  const filteredJabatanList = $derived(
    selectedKelompok
      ? jabatanList.filter((j) => {
          return (
            j.kelompok_jabatan === selectedKelompok ||
            normalizeKelompok(j.kelompok_jabatan) === normalizeKelompok(selectedKelompok)
          );
        })
      : jabatanList
  );

  function getKelompokLabel(k: string) {
    const norm = normalizeKelompok(k);
    switch (norm) {
      case "JPT":
        return "JPT (Pimpinan Tinggi)";
      case "ADMINISTRASI":
        return "Jabatan Administrasi";
      case "JF_KEAHLIAN":
        return "JF Keahlian";
      case "JF_KETERAMPILAN":
        return "JF Keterampilan";
      default:
        return k;
    }
  }

  onMount(() => {
    loadInitialData();
  });
</script>

<svelte:head>
  <title>Kamus & Standar Kompetensi ASN — PENTA+ Trenggalek</title>
</svelte:head>

<div class="standards-page">
  <!-- Header Card -->
  <Card>
    <div class="page-header-content">
      <div>
        <span class="badge-regulation">PERMENPANRB NO. 38 TAHUN 2017</span>
        <h2 class="page-title">Kamus Kompetensi &amp; Standar Jabatan ASN</h2>
        <p class="page-desc">
          Katalog standar nasional kompetensi ASN: 9 Dimensi (Integritas, Kerjasama, Komunikasi, Orientasi pada Hasil, 
          Pelayanan Publik, Pengembangan Diri &amp; Orang Lain, Mengelola Perubahan, Pengambilan Keputusan, dan Perekat Bangsa) 
          dengan matriks pemetaan standar level pada 14 tingkatan jenjang jabatan ASN.
        </p>
      </div>

      <!-- Tab Navigator -->
      <div class="tab-buttons-wrap">
        <button
          type="button"
          class="tab-btn"
          class:active={activeTab === "matriks"}
          onclick={() => (activeTab = "matriks")}
        >
          📊 Matriks Standar Level (14 Jenjang)
        </button>
        <button
          type="button"
          class="tab-btn"
          class:active={activeTab === "kamus"}
          onclick={() => (activeTab = "kamus")}
        >
          📖 Kamus Indikator Perilaku (Level 1–5)
        </button>
      </div>
    </div>
  </Card>

  {#if errorMessage}
    <Alert variant="error" dismissible onDismiss={() => (errorMessage = null)}>
      {errorMessage}
    </Alert>
  {/if}

  {#if isLoading}
    <div class="loading-state card-modern">
      <span class="spinner-large" aria-hidden="true"></span>
      <p>Menyiapkan katalog standar kompetensi ASN...</p>
    </div>
  {:else if activeTab === "matriks"}
    <!-- TAB 1: MATRIKS STANDAR LEVEL -->
    <div class="tab-content-matriks">
      <Card>
        <div class="filter-controls-row">
          <div class="filter-group">
            <label for="kelompok-filter" class="filter-label">Kelompok Jabatan:</label>
            <select
              id="kelompok-filter"
              bind:value={selectedKelompok}
              class="select-input"
            >
              <option value="">Semua Kelompok Jabatan</option>
              <option value="JPT">Jabatan Pimpinan Tinggi (JPT)</option>
              <option value="ADMINISTRASI">Jabatan Administrasi</option>
              <option value="JF_KEAHLIAN">Jabatan Fungsional Keahlian</option>
              <option value="JF_KETERAMPILAN">Jabatan Fungsional Keterampilan</option>
            </select>
          </div>
          <div class="matrix-info-note">
            <span>Standar Level: <strong>Level 1 s.d. Level 5</strong></span>
          </div>
        </div>

        <div class="table-responsive-matriks">
          <table class="matrix-table" aria-label="Tabel Matriks Standar Kompetensi Jabatan ASN">
            <thead>
              <tr>
                <th class="col-sticky">Jenjang Jabatan</th>
                <th>Kelompok</th>
                <th class="text-center">Level Umum</th>
                {#each competenciesList as c}
                  <th class="text-center comp-header-th" title="{c.kode} - {c.nama}">
                    <span class="comp-th-code">{c.kode}</span>
                  </th>
                {/each}
                <th class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredJabatanList as j}
                <tr
                  class="matrix-row"
                  class:is-selected={selectedJabatan?.id === j.id}
                  onclick={() => selectJabatan(j)}
                >
                  <td class="col-sticky font-semibold">
                    <span class="jabatan-nama-text">{j.nama}</span>
                    <span class="jabatan-kode-sub">{j.kode}</span>
                  </td>
                  <td>
                    <Badge variant="default" size="sm">
                      {getKelompokLabel(j.kelompok_jabatan)}
                    </Badge>
                  </td>
                  <td class="text-center font-mono font-bold">
                    Level {j.level_standar_umum}
                  </td>
                  {#each competenciesList as c}
                    {@const targetLvl = fullMatrix[j.id]?.[c.kode]}
                    <td class="text-center font-mono">
                      {#if targetLvl}
                        <span class="level-cell-badge lvl-{targetLvl}">
                          Level {targetLvl}
                        </span>
                      {:else}
                        <span class="level-cell-empty">-</span>
                      {/if}
                    </td>
                  {/each}
                  <td class="text-center">
                    <button
                      type="button"
                      class="btn-detail-row"
                      onclick={() => selectJabatan(j)}
                    >
                      Rincian
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </Card>

      <!-- Panel Rincian Standar Jenjang Terpilih -->
      {#if selectedJabatan}
        {@const currentSelected = selectedJabatan}
        <Card class="mt-4">
          {#snippet header()}
            <div class="detail-panel-header">
              <div>
                <h3>Standar Kompetensi: {currentSelected.nama}</h3>
                <p class="panel-subtitle">
                  Kelompok: {getKelompokLabel(currentSelected.kelompok_jabatan)} • Standar Umum: Level {currentSelected.level_standar_umum}
                </p>
              </div>
              <Badge variant="gold">Level {currentSelected.level_standar_umum}</Badge>
            </div>
          {/snippet}

          {#if isStandardsLoading}
            <div class="loading-state">
              <span class="spinner-large" aria-hidden="true"></span>
              <p>Memuat standar kompetensi jenjang...</p>
            </div>
          {:else if jabatanStandards.length > 0}
            <div class="standards-cards-grid">
              {#each jabatanStandards as item}
                {@const compInfo = competenciesList.find((c) => c.id === item.competency_id) || {
                  kode: item.kode_kompetensi || item.competency_kode || "-",
                  nama: item.nama_kompetensi || item.competency_nama || "-",
                  kategori: item.kategori || "MANAJERIAL",
                }}
                <div class="standard-item-box">
                  <div class="std-box-top">
                    <span class="comp-badge-code font-mono">{compInfo.kode}</span>
                    <span class="target-lvl-pill lvl-{item.target_level}">
                      Level {item.target_level}
                    </span>
                  </div>
                  <strong class="std-comp-title">{compInfo.nama}</strong>
                  <span class="std-comp-cat">{compInfo.kategori === "SOSIO_KULTURAL" ? "Sosial Kultural" : "Manajerial"}</span>
                </div>
              {/each}
            </div>
          {:else}
            <p class="empty-state-text">Standar rincian untuk jenjang ini belum tersedia.</p>
          {/if}
        </Card>
      {/if}
    </div>
  {:else}
    <!-- TAB 2: KAMUS INDIKATOR PERILAKU -->
    <div class="tab-content-kamus">
      <div class="kamus-layout-grid">
        <!-- Sidebar Daftar 9 Kompetensi -->
        <Card class="kamus-nav-card">
          <h4 class="sidebar-heading">9 Dimensi Kompetensi PermenPANRB</h4>
          <div class="comp-nav-list">
            {#each competenciesList as c}
              <button
                type="button"
                class="comp-nav-item"
                class:active={selectedCompetencyId === c.id}
                onclick={() => selectCompetency(c.id)}
              >
                <div class="nav-item-top">
                  <span class="nav-comp-code font-mono">{c.kode}</span>
                  <span class="nav-comp-cat-tag">
                    {c.kategori === "MANAJERIAL" ? "M" : "SK"}
                  </span>
                </div>
                <span class="nav-comp-title">{c.nama}</span>
              </button>
            {/each}
          </div>
        </Card>

        <!-- Panel Detail Indikator 5 Level -->
        <Card class="kamus-detail-card">
          {#if currentCompetency}
            <div class="comp-detail-header">
              <div class="detail-tags-row">
                <Badge variant={currentCompetency.kategori === "MANAJERIAL" ? "default" : "gold"}>
                  {currentCompetency.kategori === "MANAJERIAL" ? "Kompetensi Manajerial" : "Kompetensi Sosial Kultural"}
                </Badge>
                <span class="font-mono comp-code-chip">{currentCompetency.kode}</span>
              </div>
              <h3 class="comp-detail-name">{currentCompetency.nama}</h3>
              <p class="comp-detail-desc">{currentCompetency.deskripsi}</p>
            </div>

            <div class="divider-line"></div>

            {#if isIndicatorsLoading}
              <div class="loading-state">
                <span class="spinner-large" aria-hidden="true"></span>
                <p>Memuat butir indikator perilaku PermenPANRB...</p>
              </div>
            {:else}
              <div class="levels-accordion-stack">
                <h4 class="levels-section-title">Indikator Perilaku Level 1 s.d. Level 5</h4>
                {#each [1, 2, 3, 4, 5] as lvl}
                  {@const lvlItems = currentIndicators.filter((ind) => ind.level === lvl)}
                  <div class="level-box">
                    <div class="level-box-header">
                      <span class="level-tag-badge lvl-{lvl}">Level {lvl}</span>
                      {#if lvlItems[0]?.deskripsi_level}
                        <p class="level-def-text">{lvlItems[0].deskripsi_level}</p>
                      {/if}
                    </div>

                    {#if lvlItems.length > 0}
                      <ul class="indicators-items-list">
                        {#each lvlItems as ind}
                          <li class="indicator-item">
                            <span class="ind-dot font-mono">{lvl}.{ind.nomor_indikator}</span>
                            <span class="ind-desc">{ind.deskripsi_indikator}</span>
                          </li>
                        {/each}
                      </ul>
                    {:else}
                      <p class="no-ind-text">Belum ada rincian indikator untuk level ini.</p>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          {/if}
        </Card>
      </div>
    </div>
  {/if}
</div>

<style>
  .standards-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .badge-regulation {
    font-size: 11px;
    font-weight: 800;
    color: var(--color-gold-dark, #b45309);
    letter-spacing: 0.08em;
  }

  .page-title {
    font-size: var(--font-size-xl);
    font-weight: 800;
    color: var(--color-brand-navy);
    margin: var(--space-1) 0;
  }

  .page-desc {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    max-width: 900px;
    line-height: 1.5;
    margin: 0;
  }

  .page-header-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .tab-buttons-wrap {
    display: flex;
    gap: var(--space-2);
    border-bottom: 2px solid var(--color-border);
    padding-bottom: var(--space-2);
    margin-top: var(--space-2);
  }

  .tab-btn {
    background: transparent;
    border: none;
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-sm);
    font-weight: 700;
    color: var(--color-text-muted);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .tab-btn:hover {
    background: var(--color-bg-alt);
    color: var(--color-brand-primary);
  }

  .tab-btn.active {
    background: var(--color-brand-primary);
    color: #ffffff;
  }

  /* Filter Controls */
  .filter-controls-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .filter-label {
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .select-input {
    padding: 6px 12px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    background: #ffffff;
  }

  .matrix-info-note {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  /* Table Matriks */
  .table-responsive-matriks {
    overflow-x: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .matrix-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-xs);
    white-space: nowrap;
  }

  .matrix-table th {
    background: var(--color-bg-alt);
    padding: 10px 12px;
    font-weight: 700;
    color: var(--color-brand-navy);
    border-bottom: 2px solid var(--color-border);
  }

  .matrix-table td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--color-border);
  }

  .matrix-row {
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .matrix-row:hover {
    background: #f8fafc;
  }

  .matrix-row.is-selected {
    background: #eff6ff;
  }

  .col-sticky {
    position: sticky;
    left: 0;
    background: #ffffff;
    z-index: 1;
    min-width: 180px;
  }

  .matrix-row:hover .col-sticky {
    background: #f8fafc;
  }

  .matrix-row.is-selected .col-sticky {
    background: #eff6ff;
  }

  .jabatan-nama-text {
    display: block;
    font-weight: 700;
    color: var(--color-text-main);
  }

  .jabatan-kode-sub {
    display: block;
    font-size: 10px;
    color: var(--color-text-muted);
    font-family: monospace;
  }

  .comp-header-th {
    min-width: 55px;
  }

  .comp-th-code {
    display: inline-block;
    padding: 2px 4px;
    background: #e2e8f0;
    border-radius: var(--radius-sm);
    font-family: monospace;
  }

  /* Level Badges */
  .level-cell-badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-size: 11px;
    font-weight: 700;
  }

  .lvl-1 { background: #e0f2fe; color: #0369a1; }
  .lvl-2 { background: #dcfce7; color: #15803d; }
  .lvl-3 { background: #fef3c7; color: #b45309; }
  .lvl-4 { background: #fed7aa; color: #c2410c; }
  .lvl-5 { background: #fce7f3; color: #be185d; }

  .level-cell-empty {
    color: var(--color-text-muted);
  }

  .btn-detail-row {
    background: transparent;
    border: 1px solid var(--color-border);
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-detail-row:hover {
    background: var(--color-brand-primary);
    color: #ffffff;
  }

  /* Detail Panel */
  .detail-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .panel-subtitle {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin: 2px 0 0 0;
  }

  .standards-cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--space-3);
    margin-top: var(--space-3);
  }

  .standard-item-box {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: #ffffff;
  }

  .std-box-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .comp-badge-code {
    font-size: 11px;
    background: var(--color-border);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }

  .target-lvl-pill {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 9999px;
  }

  .std-comp-title {
    font-size: var(--font-size-xs);
    color: var(--color-brand-navy);
    line-height: 1.3;
  }

  .std-comp-cat {
    font-size: 10px;
    color: var(--color-text-muted);
  }

  /* TAB 2: KAMUS */
  .kamus-layout-grid {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: var(--space-4);
  }

  .sidebar-heading {
    font-size: var(--font-size-sm);
    font-weight: 700;
    color: var(--color-brand-navy);
    margin: 0 0 var(--space-3) 0;
  }

  .comp-nav-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .comp-nav-item {
    text-align: left;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .comp-nav-item:hover {
    background: var(--color-bg-alt);
  }

  .comp-nav-item.active {
    background: #eff6ff;
    border-color: #bfdbfe;
  }

  .nav-item-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .nav-comp-code {
    font-size: 11px;
    font-weight: 700;
    color: var(--color-brand-primary);
  }

  .nav-comp-cat-tag {
    font-size: 10px;
    background: var(--color-border);
    padding: 1px 4px;
    border-radius: var(--radius-sm);
  }

  .nav-comp-title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-main);
  }

  /* Kamus Detail */
  .comp-detail-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .detail-tags-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .comp-code-chip {
    font-size: 11px;
    background: var(--color-border);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-weight: 700;
  }

  .comp-detail-name {
    font-size: var(--font-size-lg);
    font-weight: 800;
    color: var(--color-brand-navy);
    margin: 0;
  }

  .comp-detail-desc {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    line-height: 1.5;
    margin: 0;
  }

  .divider-line {
    height: 1px;
    background: var(--color-border);
    margin: var(--space-4) 0;
  }

  .levels-section-title {
    font-size: var(--font-size-sm);
    font-weight: 700;
    margin: 0 0 var(--space-3) 0;
  }

  .levels-accordion-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .level-box {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    background: #ffffff;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .level-box-header {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
  }

  .level-tag-badge {
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    white-space: nowrap;
  }

  .level-def-text {
    font-size: var(--font-size-xs);
    color: var(--color-text-main);
    font-style: italic;
    margin: 0;
    line-height: 1.4;
  }

  .indicators-items-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    border-top: 1px dashed var(--color-border);
    padding-top: var(--space-2);
  }

  .indicator-item {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    font-size: var(--font-size-xs);
    line-height: 1.4;
  }

  .ind-dot {
    font-weight: 700;
    color: var(--color-brand-primary);
    min-width: 24px;
  }

  .ind-desc {
    color: var(--color-text-main);
  }

  .no-ind-text, .empty-state-text {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    font-style: italic;
    margin: 0;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-8);
    gap: var(--space-3);
    color: var(--color-text-muted);
  }

  .spinner-large {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-brand-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 900px) {
    .kamus-layout-grid {
      grid-template-columns: 1fr;
    }
  }
</style>