<script lang="ts">
  import { auth } from "../../lib/stores/auth.svelte";
  import { Button, Input, Card, Alert, Badge } from "../../lib/components/ui";

  let nip = $state("");
  let password = $state("");
  let formError = $state<string | null>(null);

  async function handleLogin(e: SubmitEvent) {
    e.preventDefault();
    formError = null;

    if (!nip.trim()) {
      formError = "Nomor Induk Pegawai (NIP) wajib diisi.";
      return;
    }
    if (!password.trim()) {
      formError = "Kata sandi wajib diisi.";
      return;
    }

    const success = await auth.login(nip.trim(), password);
    if (success) {
      if (auth.isAdmin) {
        window.location.href = "/admin/dashboard";
      } else {
        window.location.href = "/participant/dashboard";
      }
    } else {
      formError = auth.error || "Kombinasi NIP dan kata sandi tidak valid.";
    }
  }

  function setDemoAccount(demoNip: string) {
    nip = demoNip;
    password = "password123";
    formError = null;
  }
</script>

<svelte:head>
  <title>Masuk — Portal Asesmen Kompetensi ASN</title>
</svelte:head>

<div class="login-page container-narrow">
  <Card class="login-card">
    {#snippet header()}
      <div class="login-header">
        <div class="emblem-wrapper" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" class="emblem-svg">
            <path
              d="M12 2L3 7V12C3 17.5 7 21.5 12 22C17 21.5 21 17.5 21 12V7L12 2Z"
              fill="#0a2540"
              stroke="#c99738"
              stroke-width="1.5"
            />
            <path
              d="M12 6L14 10H18L15 13L16 17L12 14.5L8 17L9 13L6 10H10L12 6Z"
              fill="#c99738"
            />
          </svg>
        </div>
        <h2 class="title">Masuk ke Portal Asesmen</h2>
        <p class="subtitle">
          Silakan masukkan Nomor Induk Pegawai (NIP) dan kata sandi akun resmi Anda
        </p>
      </div>
    {/snippet}

    <form onsubmit={handleLogin} class="login-form">
      {#if formError}
        <Alert variant="error" dismissible onDismiss={() => (formError = null)}>
          {formError}
        </Alert>
      {/if}

      <Input
        label="Nomor Induk Pegawai (NIP)"
        type="text"
        placeholder="Masukkan 18 digit NIP"
        required
        bind:value={nip}
        disabled={auth.isLoading}
        autocomplete="username"
      />

      <Input
        label="Kata Sandi"
        type="password"
        placeholder="Masukkan kata sandi"
        required
        bind:value={password}
        disabled={auth.isLoading}
        autocomplete="current-password"
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={auth.isLoading}
        class="submit-btn"
      >
        {auth.isLoading ? "Memverifikasi Kredensial..." : "Masuk ke Sistem"}
      </Button>
    </form>

    {#snippet footer()}
      <div class="quick-login-section">
        <span class="quick-label">Akses Cepat Akun Demo (1-Klik):</span>
        <div class="quick-btn-group">
          <button
            type="button"
            class="quick-pill"
            onclick={() => setDemoAccount("198501012010011001")}
          >
            <Badge variant="gold" size="sm">Admin</Badge>
            <span>Dr. H. Bambang</span>
          </button>

          <button
            type="button"
            class="quick-pill"
            onclick={() => setDemoAccount("199505122020121002")}
          >
            <Badge variant="info" size="sm">Pelaksana</Badge>
            <span>Ahmad Fauzi</span>
          </button>

          <button
            type="button"
            class="quick-pill"
            onclick={() => setDemoAccount("198808172014032003")}
          >
            <Badge variant="info" size="sm">Pengawas</Badge>
            <span>Siti Rahmawati</span>
          </button>
        </div>
      </div>
    {/snippet}
  </Card>
</div>

<style>
  .login-page {
    margin-top: var(--space-8);
    margin-bottom: var(--space-8);
  }

  :global(.login-card) {
    box-shadow: var(--shadow-lg);
  }

  .login-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: var(--space-4) 0 var(--space-2);
  }

  .emblem-wrapper {
    width: 52px;
    height: 52px;
    margin-bottom: var(--space-3);
  }

  .emblem-svg {
    width: 100%;
    height: 100%;
  }

  .title {
    font-size: var(--font-size-xl);
    color: var(--color-brand-primary);
    margin-bottom: var(--space-1);
  }

  .subtitle {
    font-size: var(--font-size-sm);
    color: var(--color-text-subtle);
    max-width: 440px;
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .quick-login-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .quick-label {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-subtle);
  }

  .quick-btn-group {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .quick-pill {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-3);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-full);
    background-color: var(--color-bg-surface);
    cursor: pointer;
    font-size: var(--font-size-xs);
    font-family: var(--font-family-sans);
    color: var(--color-text-main);
    transition: all var(--transition-fast);
  }

  .quick-pill:hover {
    border-color: var(--color-brand-accent);
    background-color: var(--color-bg-subtle);
    transform: translateY(-1px);
  }
</style>
