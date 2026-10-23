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
  <title>Masuk — PENTA+ Kabupaten Trenggalek</title>
</svelte:head>

<div class="login-page container-narrow">
  <Card class="login-card">
    {#snippet header()}
      <div class="login-header">
        <div class="emblem-wrapper">
          <img
            src="/logo-trenggalek.svg"
            alt="Lambang Daerah Kabupaten Trenggalek"
            class="login-logo-img"
          />
        </div>
        <div class="login-brand-title">
          PENTA<span class="brand-plus">+</span>
        </div>
        <span class="login-gov-badge">PEMERINTAH KABUPATEN TRENGGALEK</span>
        <h2 class="title">Masuk ke Portal Asesmen</h2>
        <p class="subtitle">
          Sistem Penilaian Kompetensi dan Potensi ASN (PermenPANRB No. 38 Tahun 2017)
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
    width: 60px;
    height: 75px;
    margin-bottom: var(--space-2);
  }

  .login-logo-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
  }

  .login-brand-title {
    font-size: 1.85rem;
    font-weight: 800;
    color: var(--color-brand-primary);
    letter-spacing: 0.04em;
    line-height: 1.1;
  }

  .brand-plus {
    color: var(--color-gold);
    font-size: 2rem;
    font-weight: 900;
  }

  .login-gov-badge {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--color-brand-secondary);
    background-color: var(--color-bg-subtle);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    padding: 2px 8px;
    margin-top: 4px;
    margin-bottom: var(--space-3);
  }

  .title {
    font-size: var(--font-size-lg);
    color: var(--color-brand-primary);
    margin-bottom: var(--space-1);
    font-weight: var(--font-weight-bold);
  }

  .subtitle {
    font-size: var(--font-size-xs);
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
