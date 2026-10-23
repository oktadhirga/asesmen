<script lang="ts">
  import { onMount } from "svelte";
  import { auth } from "../../lib/stores/auth.svelte";
  import type { LayoutProps } from "./$types";

  let { children }: LayoutProps = $props();
  let isChecking = $state(true);

  onMount(async () => {
    if (auth.isLoading) {
      await auth.init();
    }
    isChecking = false;

    // Pastikan user sudah login
    if (!auth.isAuthenticated) {
      window.location.href = "/login";
    }
  });
</script>

{#if isChecking || auth.isLoading}
  <div class="participant-loading-screen container">
    <span class="spinner-large" aria-hidden="true"></span>
    <p>Memverifikasi sesi portal peserta...</p>
  </div>
{:else if auth.isAuthenticated}
  <div class="participant-layout-container container">
    <!-- Sub-Header Portal Peserta -->
    <header class="participant-subnav glass-panel">
      <div class="participant-info-area">
        <span class="portal-badge">PORTAL PESERTA ASESMEN ASN</span>
        <h2 class="portal-title">PENTA+ Trenggalek</h2>
        {#if auth.user}
          <div class="user-meta">
            <span class="meta-item">
              <strong>Nama:</strong> {auth.user.nama}
            </span>
            <span class="meta-separator">•</span>
            <span class="meta-item">
              <strong>NIP:</strong> {auth.user.nip}
            </span>
            <span class="meta-separator">•</span>
            <span class="meta-item">
              <strong>Jenjang:</strong> {auth.user.jenjang_jabatan}
            </span>
          </div>
        {/if}
      </div>

      <nav class="participant-menu" aria-label="Menu Navigasi Peserta">
        <a href="/participant/dashboard" class="participant-tab">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          Sesi Asesmen Saya
        </a>
      </nav>
    </header>

    <main class="participant-page-body">
      {@render children()}
    </main>
  </div>
{/if}

<style>
  .participant-loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
    gap: var(--space-4);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  .spinner-large {
    width: 36px;
    height: 36px;
    border: 3px solid var(--color-border-strong);
    border-top-color: var(--color-brand-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .participant-layout-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .participant-subnav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-6);
    flex-wrap: wrap;
    gap: var(--space-4);
  }

  .participant-info-area {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .portal-badge {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--color-gold-dark);
  }

  .portal-title {
    font-size: var(--font-size-lg);
    font-weight: 700;
    color: var(--color-text-main);
    margin: 0;
  }

  .user-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    flex-wrap: wrap;
    margin-top: 2px;
  }

  .meta-separator {
    color: var(--color-border-strong);
  }

  .participant-menu {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .participant-tab {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-brand-navy);
    background-color: rgba(10, 37, 64, 0.06);
    text-decoration: none;
    transition: all var(--transition-fast);
  }

  .participant-tab:hover {
    background-color: rgba(10, 37, 64, 0.12);
  }

  .participant-page-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 640px) {
    .participant-subnav {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
