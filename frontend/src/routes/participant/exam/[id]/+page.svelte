<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/state";
  import { ApiClient } from "../../../../lib/api/client";
  import { auth } from "../../../../lib/stores/auth.svelte";
  import {
    Button,
    Card,
    Badge,
    Alert,
    Modal,
  } from "../../../../lib/components/ui";

  interface QuestionOption {
    id: number;
    question_id: number;
    label: string;
    teks_opsi: string;
  }

  interface ExamQuestion {
    nomor_urut: number;
    id: number;
    competency_id: number;
    kode_soal: string;
    skenario_kasus: string;
    target_level: number;
    options: QuestionOption[];
    jawaban_peserta: {
      selected_option_id: number | null;
      is_ragu: boolean;
    } | null;
  }

  interface ExamStatusData {
    session_participant_id: number;
    session_id: number;
    judul_sesi: string;
    durasi_menit: number;
    status: string;
    sisa_waktu_detik: number;
    tab_switch_count: number;
  }

  // Parameter dari Route & Query
  const sessionId = $derived(Number(page.params.id));
  const participantIdQuery = $derived(
    Number(page.url.searchParams.get("participantId"))
  );

  let participantId = $state<number>(0);
  let questions = $state<ExamQuestion[]>([]);
  let currentIndex = $state(0);
  let isLoading = $state(true);
  let errorMessage = $state<string | null>(null);

  // Status Sesi & Ujian
  let examStatus = $state<ExamStatusData | null>(null);
  let remainingSeconds = $state(0);
  let timerInterval: any = null;
  let tabSwitchCount = $state(0);
  let lastTabSwitchWarning = $state<string | null>(null);
  let showTabSwitchModal = $state(false);

  // Status Autosave
  let isSavingAnswer = $state(false);
  let saveSuccessNotice = $state(false);

  // Status Modal Konfirmasi Submit Akhir
  let isSubmitModalOpen = $state(false);
  let isSubmitting = $state(false);
  let submitError = $state<string | null>(null);

  // Question aktif saat ini
  const currentQuestion = $derived(questions[currentIndex] || null);

  // Statistik Jawaban
  const answeredCount = $derived(
    questions.filter((q) => q.jawaban_peserta?.selected_option_id).length
  );
  const raguCount = $derived(
    questions.filter((q) => q.jawaban_peserta?.is_ragu).length
  );
  const unansweredCount = $derived(questions.length - answeredCount);

  // Format Timer HH:MM:SS
  const formattedTimer = $derived.by(() => {
    if (remainingSeconds <= 0) return "00:00:00";
    const h = Math.floor(remainingSeconds / 3600);
    const m = Math.floor((remainingSeconds % 3600) / 60);
    const s = remainingSeconds % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  });

  const isTimerCritical = $derived(remainingSeconds < 600); // Kurang dari 10 menit

  // Ambil Data Lembar Soal Ujian
  async function loadExamData() {
    isLoading = true;
    errorMessage = null;

    try {
      // 1. Tentukan participantId
      let pId = participantIdQuery;
      if (!pId || isNaN(pId)) {
        // Ambil dari sesi saya jika query param kosong
        const mySessionsRes = await ApiClient.get<any[]>("/sessions/my-sessions");
        const found = mySessionsRes.data?.find((s) => s.session_id === sessionId);
        if (found) {
          pId = found.participant_id;
        } else {
          throw new Error("Anda tidak terdaftar dalam sesi asesmen ini.");
        }
      }
      participantId = pId;

      // 2. Ambil Status Timer & Proctoring
      const statusRes = await ApiClient.get<ExamStatusData>(
        `/exams/${participantId}/status`
      );
      if (statusRes.success && statusRes.data) {
        examStatus = statusRes.data;
        remainingSeconds = statusRes.data.sisa_waktu_detik;
        tabSwitchCount = statusRes.data.tab_switch_count || 0;

        if (statusRes.data.status === "SELESAI") {
          window.location.href = `/participant/reports/${participantId}`;
          return;
        }
      }

      // 3. Ambil Daftar Soal Ujian
      const questionsRes = await ApiClient.get<ExamQuestion[]>(
        `/exams/${participantId}/questions`
      );
      if (questionsRes.success && questionsRes.data) {
        questions = questionsRes.data;
      } else {
        errorMessage = questionsRes.message || "Gagal memuat butir soal ujian.";
      }

      // 4. Jalankan Countdown Timer
      startCountdownTimer();
    } catch (err: any) {
      errorMessage = err.message || "Gagal menghubungi server ujian.";
    } finally {
      isLoading = false;
    }
  }

  // Timer Countdown Function
  function startCountdownTimer() {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
      if (remainingSeconds > 0) {
        remainingSeconds -= 1;
      } else {
        clearInterval(timerInterval);
        handleTimeUpAutoSubmit();
      }
    }, 1000);
  }

  // Auto-submit saat waktu habis
  async function handleTimeUpAutoSubmit() {
    alert("Waktu ujian telah berakhir! Sistem akan mengumpulkan lembar jawaban Anda secara otomatis.");
    await executeSubmit();
  }

  // Autosave Jawaban Saat Peserta Memilih Opsi
  async function selectOption(optionId: number) {
    if (!currentQuestion) return;

    // Optimistic Update di UI
    const existing = currentQuestion.jawaban_peserta;
    const isRagu = existing ? existing.is_ragu : false;

    currentQuestion.jawaban_peserta = {
      selected_option_id: optionId,
      is_ragu: isRagu,
    };

    // Kirim Autosave ke Server
    isSavingAnswer = true;
    saveSuccessNotice = false;

    try {
      const res = await ApiClient.post<any>(`/exams/${participantId}/answers`, {
        question_id: currentQuestion.id,
        selected_option_id: optionId,
        is_ragu: isRagu,
      });

      if (res.success) {
        saveSuccessNotice = true;
        setTimeout(() => {
          saveSuccessNotice = false;
        }, 1200);
      }
    } catch (err) {
      console.error("Gagal autosave jawaban:", err);
    } finally {
      isSavingAnswer = false;
    }
  }

  // Toggle Ragu-ragu
  async function toggleRagu() {
    if (!currentQuestion) return;

    const existing = currentQuestion.jawaban_peserta;
    const newRaguState = !(existing?.is_ragu);

    if (existing) {
      existing.is_ragu = newRaguState;
    } else {
      currentQuestion.jawaban_peserta = {
        selected_option_id: null,
        is_ragu: newRaguState,
      };
    }

    if (currentQuestion.jawaban_peserta?.selected_option_id) {
      try {
        await ApiClient.post<any>(`/exams/${participantId}/answers`, {
          question_id: currentQuestion.id,
          selected_option_id: currentQuestion.jawaban_peserta.selected_option_id,
          is_ragu: newRaguState,
        });
      } catch (err) {
        console.error("Gagal update status ragu:", err);
      }
    }
  }

  // Navigasi Soal
  function goToQuestion(index: number) {
    if (index >= 0 && index < questions.length) {
      currentIndex = index;
    }
  }

  function nextQuestion() {
    if (currentIndex < questions.length - 1) {
      currentIndex += 1;
    } else {
      isSubmitModalOpen = true;
    }
  }

  function prevQuestion() {
    if (currentIndex > 0) {
      currentIndex -= 1;
    }
  }

  // Submit Ujian Akhir
  async function executeSubmit() {
    isSubmitting = true;
    submitError = null;

    try {
      const res = await ApiClient.post<any>(`/exams/${participantId}/submit`, {});
      if (res.success) {
        // Sukses submit, alihkan ke laporan individu
        window.location.href = `/participant/reports/${participantId}`;
      } else {
        submitError = res.message || "Gagal mengumpulkan lembar jawaban.";
      }
    } catch (err: any) {
      submitError = err.message || "Terjadi kesalahan koneksi saat submit.";
    } finally {
      isSubmitting = false;
    }
  }

  // Proctoring: Deteksi Tab Switch & Window Blur
  let tabSwitchDebounce = false;

  async function handleTabSwitchEvent() {
    if (tabSwitchDebounce || isLoading) return;
    tabSwitchDebounce = true;
    setTimeout(() => {
      tabSwitchDebounce = false;
    }, 2000);

    try {
      const res: any = await ApiClient.post<any>(
        `/exams/${participantId}/tab-switch`,
        {}
      );
      if (res && res.success) {
        tabSwitchCount = res.tab_switch_count ?? 0;
        lastTabSwitchWarning =
          res.warning ||
          `Peringatan: Anda berpindah tab/jendela (# ke-${res.tab_switch_count}). Aktivitas ini tercatat dalam log proctoring.`;
        showTabSwitchModal = true;
      }
    } catch (err) {
      console.error("Gagal mencatat log proctoring:", err);
    }
  }

  function onVisibilityChange() {
    if (document.hidden) {
      handleTabSwitchEvent();
    }
  }

  function onWindowBlur() {
    handleTabSwitchEvent();
  }

  onMount(() => {
    loadExamData();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);
  });

  onDestroy(() => {
    if (timerInterval) clearInterval(timerInterval);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("blur", onWindowBlur);
  });
</script>

<svelte:head>
  <title>Ruang Ujian SJT — PENTA+ Trenggalek</title>
</svelte:head>

<div class="exam-room-wrapper">
  <!-- Sticky Proctoring & Timer Header -->
  <header class="exam-header glass-panel">
    <div class="exam-header-left">
      <div class="exam-brand">
        <span class="exam-tag">SESI ASESMEN SJT</span>
        <h2 class="exam-title">
          {examStatus?.judul_sesi || "Asesmen Kompetensi ASN"}
        </h2>
      </div>
      {#if auth.user}
        <span class="exam-user-info">
          Peserta: <strong>{auth.user.nama}</strong> ({auth.user.nip})
        </span>
      {/if}
    </div>

    <!-- Proctoring Alert Indicator & Timer -->
    <div class="exam-header-right">
      <!-- Badge Proctoring Pelanggaran Tab -->
      <div
        class="proctor-pill"
        class:warning={tabSwitchCount > 0}
        title="Jumlah catatan perpindahan jendela/tab browser"
      >
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          stroke="currentColor"
          stroke-width="2"
          fill="none"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
        <span>Tab-Switch: <strong>{tabSwitchCount}x</strong></span>
      </div>

      <!-- Sisa Waktu Ujian (Timer) -->
      <div class="timer-box" class:timer-alert={isTimerCritical}>
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          stroke="currentColor"
          stroke-width="2"
          fill="none"
          class="timer-icon"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <div class="timer-digits font-mono">
          {formattedTimer}
        </div>
      </div>

      <!-- Tombol Selesaikan Ujian -->
      <Button
        variant="gold"
        size="sm"
        onclick={() => (isSubmitModalOpen = true)}
        disabled={isLoading || isSubmitting}
      >
        Kumpulkan Ujian
      </Button>
    </div>
  </header>

  <!-- Error / Loading State -->
  {#if errorMessage}
    <Alert variant="error">
      {errorMessage}
    </Alert>
  {/if}

  {#if isLoading}
    <div class="loading-screen card-modern">
      <span class="spinner-large" aria-hidden="true"></span>
      <p>Menyiapkan lembar soal Situational Judgment Test (SJT)...</p>
    </div>
  {:else if questions.length === 0}
    <div class="empty-screen card-modern">
      <h3>Belum Ada Soal Tersedia</h3>
      <p>Panitia belum menambahkan butir soal untuk sesi asesmen ini.</p>
    </div>
  {:else if currentQuestion}
    <!-- Layout 2 Kolom: Kiri Soal, Kanan Palet Nomor -->
    <div class="exam-main-grid">
      <!-- Area Soal SJT -->
      <div class="question-column">
        <Card class="question-card">
          {#snippet header()}
            <div class="question-header">
              <div class="q-left">
                <span class="q-number-badge">
                  Soal No. {currentQuestion.nomor_urut} dari {questions.length}
                </span>
                <span class="q-code">{currentQuestion.kode_soal}</span>
                <Badge variant="default" size="sm">
                  Target Level {currentQuestion.target_level}
                </Badge>
              </div>

              <!-- Autosave Status Indicator -->
              <div class="autosave-status">
                {#if isSavingAnswer}
                  <span class="saving-text">
                    <span class="spinner-mini"></span> Menyimpan jawaban...
                  </span>
                {:else if saveSuccessNotice}
                  <span class="saved-text">
                    ✓ Tersimpan
                  </span>
                {/if}
              </div>
            </div>
          {/snippet}

          <!-- Skenario Kasus SJT -->
          <div class="scenario-box">
            <h4 class="scenario-label">Deskripsi Skenario Situasi Kerja:</h4>
            <p class="scenario-text">
              {currentQuestion.skenario_kasus}
            </p>
          </div>

          <!-- Opsi Jawaban Respon A, B, C, D -->
          <div class="options-container" role="radiogroup" aria-label="Pilihan respon perilaku">
            <h4 class="options-label">
              Pilihlah respon perilaku yang menurut Anda paling tepat dan efektif:
            </h4>

            <div class="options-list">
              {#each currentQuestion.options as opt, optIdx (opt.id)}
                {@const isSelected =
                  currentQuestion.jawaban_peserta?.selected_option_id === opt.id}
                <button
                  type="button"
                  class="option-card"
                  class:selected={isSelected}
                  onclick={() => selectOption(opt.id)}
                  aria-checked={isSelected}
                  role="radio"
                >
                  <div class="option-letter" class:letter-selected={isSelected}>
                    {opt.label || String.fromCharCode(65 + optIdx)}
                  </div>
                  <div class="option-body">
                    <p class="option-text">{opt.teks_opsi}</p>
                  </div>
                </button>
              {/each}
            </div>
          </div>

          <!-- Kontrol Navigasi Bawah -->
          <div class="question-bottom-nav">
            <Button
              variant="secondary"
              size="sm"
              onclick={prevQuestion}
              disabled={currentIndex === 0}
            >
              ← Soal Sebelumnya
            </Button>

            <!-- Checkbox Tandai Ragu-ragu -->
            <button
              type="button"
              class="btn-ragu"
              class:is-active={currentQuestion.jawaban_peserta?.is_ragu}
              onclick={toggleRagu}
            >
              <input
                type="checkbox"
                checked={currentQuestion.jawaban_peserta?.is_ragu || false}
                tabindex="-1"
                aria-hidden="true"
              />
              <span>Tandai Ragu-Ragu (Kuning)</span>
            </button>

            {#if currentIndex < questions.length - 1}
              <Button variant="primary" size="sm" onclick={nextQuestion}>
                Soal Selanjutnya →
              </Button>
            {:else}
              <Button
                variant="gold"
                size="sm"
                onclick={() => (isSubmitModalOpen = true)}
              >
                Tinjau & Selesaikan Ujian
              </Button>
            {/if}
          </div>
        </Card>
      </div>

      <!-- Kolom Kanan: Palet Nomor Soal & Ringkasan -->
      <aside class="palette-column">
        <Card class="palette-card">
          {#snippet header()}
            <div class="palette-header">
              <h3 class="palette-title">Daftar Nomor Soal</h3>
              <span class="palette-progress">
                <strong>{answeredCount}</strong>/{questions.length} Terjawab
              </span>
            </div>
          {/snippet}

          <!-- Grid Nomor Soal -->
          <div class="numbers-grid" role="navigation" aria-label="Palet Soal">
            {#each questions as q, idx (q.id)}
              {@const isCurrent = idx === currentIndex}
              {@const isAnswered = !!q.jawaban_peserta?.selected_option_id}
              {@const isRagu = !!q.jawaban_peserta?.is_ragu}
              <button
                type="button"
                class="num-btn"
                class:active={isCurrent}
                class:answered={isAnswered && !isRagu}
                class:ragu={isRagu}
                onclick={() => goToQuestion(idx)}
                aria-label={`Pindah ke soal nomor ${q.nomor_urut}`}
              >
                {q.nomor_urut}
              </button>
            {/each}
          </div>

          <!-- Keterangan Legend Status -->
          <div class="palette-legend">
            <div class="legend-item">
              <span class="legend-swatch answered"></span>
              <span class="legend-label">Sudah Dijawab ({answeredCount - raguCount})</span>
            </div>
            <div class="legend-item">
              <span class="legend-swatch ragu"></span>
              <span class="legend-label">Ragu-ragu ({raguCount})</span>
            </div>
            <div class="legend-item">
              <span class="legend-swatch unanswered"></span>
              <span class="legend-label">Belum Dijawab ({unansweredCount})</span>
            </div>
          </div>

          <!-- Quick Action Selesai -->
          <div class="palette-submit-area">
            <Button
              variant="gold"
              class="w-full"
              onclick={() => (isSubmitModalOpen = true)}
            >
              Kumpulkan Lembar Ujian
            </Button>
          </div>
        </Card>
      </aside>
    </div>
  {/if}
</div>

<!-- Modal Peringatan Proctoring (Tab Switch) -->
{#if showTabSwitchModal}
  <Modal
    title="Peringatan Integritas Proctoring Ujian"
    size="sm"
    isOpen={showTabSwitchModal}
    onClose={() => (showTabSwitchModal = false)}
  >
    <div class="proctor-warning-content">
      <div class="proctor-warning-icon">⚠️</div>
      <h4 class="warning-title">Perpindahan Jendela Terdeteksi!</h4>
      <p class="warning-text">
        {lastTabSwitchWarning || "Anda terdeteksi meninggalkan halaman pengerjaan ujian."}
      </p>
      <div class="warning-counter-pill">
        Total Catatan Pelanggaran: <strong>{tabSwitchCount} kali</strong>
      </div>
      <p class="warning-subtext">
        Seluruh log perpindahan tab terekam secara otomatis dalam database pengawasan 
        dan dapat mempengaruhi evaluasi integritas kompetensi ASN Anda.
      </p>
    </div>

    {#snippet footer()}
      <Button
        variant="primary"
        class="w-full"
        onclick={() => (showTabSwitchModal = false)}
      >
        Saya Mengerti, Kembali ke Ujian
      </Button>
    {/snippet}
  </Modal>
{/if}

<!-- Modal Konfirmasi Kumpulkan Ujian -->
{#if isSubmitModalOpen}
  <Modal
    title="Konfirmasi Pengumpulan Ujian Asesmen"
    size="md"
    isOpen={isSubmitModalOpen}
    onClose={() => (isSubmitModalOpen = false)}
  >
    <div class="submit-confirm-content">
      {#if submitError}
        <Alert variant="error">
          {submitError}
        </Alert>
      {/if}

      <p class="submit-confirm-text">
        Apakah Anda yakin ingin menyelesaikan dan mengumpulkan lembar jawaban ujian asesmen ini?
      </p>

      <!-- Ringkasan Lembar Jawaban -->
      <div class="recap-grid">
        <div class="recap-card">
          <span class="recap-val">{questions.length}</span>
          <span class="recap-lbl">Total Soal</span>
        </div>
        <div class="recap-card highlight-success">
          <span class="recap-val">{answeredCount}</span>
          <span class="recap-lbl">Sudah Dijawab</span>
        </div>
        <div class="recap-card highlight-warning">
          <span class="recap-val">{raguCount}</span>
          <span class="recap-lbl">Masih Ragu</span>
        </div>
        <div class="recap-card highlight-danger">
          <span class="recap-val">{unansweredCount}</span>
          <span class="recap-lbl">Belum Dijawab</span>
        </div>
      </div>

      {#if unansweredCount > 0 || raguCount > 0}
        <Alert variant="warning">
          Masih terdapat <strong>{unansweredCount} soal belum dijawab</strong> dan 
          <strong>{raguCount} soal bertanda ragu-ragu</strong>. Setelah dikumpulkan, 
          Anda tidak dapat mengubah jawaban lagi.
        </Alert>
      {:else}
        <Alert variant="success">
          Luar biasa! Seluruh <strong>{questions.length} butir soal</strong> telah Anda jawab dengan lengkap.
        </Alert>
      {/if}
    </div>

    {#snippet footer()}
      <Button
        variant="ghost"
        onclick={() => (isSubmitModalOpen = false)}
        disabled={isSubmitting}
      >
        Periksa Kembali Soal
      </Button>
      <Button
        variant="gold"
        onclick={executeSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Mengumpulkan..." : "Ya, Kumpulkan Lembar Jawaban"}
      </Button>
    {/snippet}
  </Modal>
{/if}

<style>
  .exam-room-wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  /* Header Ujian & Timer */
  .exam-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) var(--space-6);
    position: sticky;
    top: var(--space-2);
    z-index: 20;
    gap: var(--space-4);
    flex-wrap: wrap;
    border-top: 3px solid var(--color-brand-primary);
  }

  .exam-header-left {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .exam-tag {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--color-gold-dark);
  }

  .exam-title {
    font-size: var(--font-size-base);
    font-weight: 700;
    color: var(--color-text-main);
    margin: 0;
  }

  .exam-user-info {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .exam-header-right {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .proctor-pill {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 6px 12px;
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: 600;
    background-color: rgba(16, 185, 129, 0.1);
    color: var(--color-success);
    border: 1px solid rgba(16, 185, 129, 0.2);
  }

  .proctor-pill.warning {
    background-color: rgba(239, 68, 68, 0.1);
    color: var(--color-danger);
    border-color: rgba(239, 68, 68, 0.2);
  }

  .timer-box {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 6px 14px;
    background-color: var(--color-brand-navy);
    color: #ffffff;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    box-shadow: var(--shadow-sm);
  }

  .timer-box.timer-alert {
    background-color: var(--color-danger);
    animation: pulse 1.2s infinite alternate;
  }

  .timer-digits {
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  @keyframes pulse {
    0% {
      opacity: 1;
    }
    100% {
      opacity: 0.8;
    }
  }

  /* Grid Soal & Palet */
  .exam-main-grid {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: var(--space-6);
    align-items: start;
  }

  .question-column {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .question-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2);
    padding-bottom: var(--space-2);
  }

  .q-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .q-number-badge {
    font-weight: 700;
    font-size: var(--font-size-sm);
    color: var(--color-brand-primary);
  }

  .q-code {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-text-muted);
  }

  .autosave-status {
    font-size: var(--font-size-xs);
    font-weight: 600;
    min-height: 20px;
  }

  .saving-text {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-text-muted);
  }

  .saved-text {
    color: var(--color-success);
  }

  .spinner-mini {
    width: 12px;
    height: 12px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-brand-primary);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    display: inline-block;
  }

  .scenario-box {
    background-color: var(--color-bg-alt);
    border-left: 4px solid var(--color-gold-dark);
    padding: var(--space-4) var(--space-6);
    border-radius: 0 var(--radius-md) var(--radius-md) 0;
    margin-bottom: var(--space-6);
  }

  .scenario-label {
    font-size: 11px;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--color-gold-dark);
    margin: 0 0 var(--space-2) 0;
    letter-spacing: 0.05em;
  }

  .scenario-text {
    font-size: var(--font-size-base);
    line-height: 1.7;
    color: var(--color-text-main);
    margin: 0;
  }

  .options-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .options-label {
    font-size: var(--font-size-sm);
    font-weight: 700;
    color: var(--color-brand-navy);
    margin: 0 0 var(--space-2) 0;
  }

  .options-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .option-card {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-5);
    background-color: #ffffff;
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-lg);
    cursor: pointer;
    text-align: left;
    transition: all var(--transition-fast);
    outline: none;
  }

  .option-card:hover {
    border-color: var(--color-brand-primary);
    background-color: rgba(10, 37, 64, 0.02);
  }

  .option-card.selected {
    border-color: var(--color-brand-primary);
    background-color: rgba(10, 37, 64, 0.05);
    box-shadow: 0 0 0 1px var(--color-brand-primary);
  }

  .option-letter {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: var(--color-bg-alt);
    border: 1.5px solid var(--color-border);
    color: var(--color-text-main);
    font-weight: 700;
    font-size: var(--font-size-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all var(--transition-fast);
  }

  .option-letter.letter-selected {
    background-color: var(--color-brand-primary);
    color: #ffffff;
    border-color: var(--color-brand-primary);
  }

  .option-body {
    flex: 1;
  }

  .option-text {
    font-size: var(--font-size-sm);
    line-height: 1.6;
    color: var(--color-text-main);
    margin: 0;
  }

  .question-bottom-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: var(--space-6);
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border);
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .btn-ragu {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 6px 14px;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    background-color: var(--color-bg-alt);
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .btn-ragu:hover {
    background-color: #fef3c7;
    border-color: var(--color-warning);
    color: #92400e;
  }

  .btn-ragu.is-active {
    background-color: #fef3c7;
    border-color: var(--color-warning);
    color: #92400e;
    font-weight: 700;
  }

  /* Palet Nomor Soal */
  .palette-column {
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 80px;
  }

  .palette-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-2);
    padding-bottom: var(--space-2);
  }

  .palette-title {
    font-size: var(--font-size-sm);
    font-weight: 700;
    color: var(--color-brand-navy);
    margin: 0;
  }

  .palette-progress {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .numbers-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    max-height: 340px;
    overflow-y: auto;
    padding: var(--space-2) 0;
  }

  .num-btn {
    height: 38px;
    border-radius: var(--radius-md);
    border: 1.5px solid var(--color-border);
    background-color: #ffffff;
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-main);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
  }

  .num-btn:hover {
    border-color: var(--color-brand-primary);
  }

  .num-btn.active {
    border-color: var(--color-gold, #c99738) !important;
    outline: 2px solid var(--color-gold, #c99738);
  }

  .num-btn.answered {
    background-color: var(--color-brand-navy, #0a2540) !important;
    color: #ffffff !important;
    border-color: var(--color-brand-navy, #0a2540) !important;
    font-weight: 700;
  }

  .num-btn.active.answered {
    border-color: var(--color-gold, #c99738) !important;
    outline: 2px solid var(--color-gold, #c99738);
  }

  .num-btn.ragu {
    background-color: #f59e0b !important;
    color: #ffffff !important;
    border-color: #d97706 !important;
    font-weight: 700;
  }

  .palette-legend {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: var(--space-4);
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 11px;
    color: var(--color-text-muted);
  }

  .legend-swatch {
    width: 14px;
    height: 14px;
    border-radius: 3px;
  }

  .legend-swatch.answered {
    background-color: var(--color-brand-navy);
  }

  .legend-swatch.ragu {
    background-color: #f59e0b;
  }

  .legend-swatch.unanswered {
    background-color: #ffffff;
    border: 1.5px solid var(--color-border);
  }

  .palette-submit-area {
    margin-top: var(--space-4);
  }

  .loading-screen,
  .empty-screen {
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

  /* Modal Proctoring Warning */
  .proctor-warning-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: var(--space-3);
  }

  .proctor-warning-icon {
    font-size: 48px;
  }

  .warning-title {
    font-size: var(--font-size-base);
    font-weight: 800;
    color: var(--color-danger);
    margin: 0;
  }

  .warning-text {
    font-size: var(--font-size-sm);
    color: var(--color-text-main);
    line-height: 1.5;
    margin: 0;
  }

  .warning-counter-pill {
    padding: 6px 16px;
    background-color: rgba(239, 68, 68, 0.1);
    color: var(--color-danger);
    font-size: var(--font-size-xs);
    border-radius: var(--radius-full);
    font-weight: 600;
  }

  .warning-subtext {
    font-size: 11px;
    color: var(--color-text-muted);
    line-height: 1.4;
    margin: 0;
  }

  /* Modal Konfirmasi Submit */
  .submit-confirm-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .submit-confirm-text {
    font-size: var(--font-size-sm);
    color: var(--color-text-main);
    margin: 0;
  }

  .recap-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-2);
  }

  .recap-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-3);
    border-radius: var(--radius-md);
    background-color: var(--color-bg-alt);
    border: 1px solid var(--color-border);
  }

  .recap-card.highlight-success {
    background-color: rgba(16, 185, 129, 0.08);
    border-color: rgba(16, 185, 129, 0.2);
    color: var(--color-success);
  }

  .recap-card.highlight-warning {
    background-color: rgba(245, 158, 11, 0.08);
    border-color: rgba(245, 158, 11, 0.2);
    color: #d97706;
  }

  .recap-card.highlight-danger {
    background-color: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.2);
    color: var(--color-danger);
  }

  .recap-val {
    font-size: var(--font-size-lg);
    font-weight: 800;
  }

  .recap-lbl {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 900px) {
    .exam-main-grid {
      grid-template-columns: 1fr;
    }
    .palette-column {
      order: 2;
      position: static;
    }
  }
</style>
