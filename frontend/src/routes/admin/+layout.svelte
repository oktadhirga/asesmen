<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { auth } from "../../lib/stores/auth.svelte";
  import type { LayoutProps } from "./$types";

  let { children }: LayoutProps = $props();
  let isChecking = $state(true);

  onMount(async () => {
    // Tunggu inisialisasi token auth
    if (auth.isLoading) {
      await auth.init();
    }
    isChecking = false;

    // Proteksi rute khusus Administrator / Asesor
    if (!auth.isAuthenticated || !auth.isAdmin) {
      window.location.href = "/login";
    }
  });

  const currentPath = $derived(page.url.pathname);
</script>

{#if isChecking || auth.isLoading}
  <div class="admin-loading-screen container">
    <span class="spinner-large" aria-hidden="true"></span>
    <p>Memverifikasi hak akses Administrator...</p>
  </div>
{:else if auth.isAuthenticated && auth.isAdmin}
  <div class="admin-layout-container container">
    <!-- Sub-Navbar / Breadcrumb Admin Menu -->
    <header class="admin-subnav glass-panel">
      <div class="admin-title-area">
        <span class="admin-badge">PANEL ADMINISTRATOR</span>
        <h2 class="admin-portal-title">Pusat Manajemen Asesmen PENTA+</h2>
      </div>

      <nav class="admin-menu" aria-label="Menu Administrator">
        <a
          href="/admin/dashboard"
          class="admin-tab"
          class:is-active={currentPath === "/admin/dashboard"}
        >
          Dashboard
        </a>
        <a
          href="/admin/sessions"
          class="admin-tab"
          class:is-active={currentPath.startsWith("/admin/sessions")}
        >
          Sesi &amp; Proctoring
        </a>
        <a
          href="/admin/questions"
          class="admin-tab"
          class:is-active={currentPath.startsWith("/admin/questions")}
        >
          Bank Soal SJT
        </a>
        <a
          href="/admin/users"
          class="admin-tab"
          class:is-active={currentPath.startsWith("/admin/users")}
        >
          Pegawai ASN
        </a>
        <a
          href="/admin/reports"
          class="admin-tab"
          class:is-active={currentPath.startsWith("/admin/reports")}
        >
          Rekapitulasi JPM
        </a>
        <a
          href="/admin/standards"
          class="admin-tab"
          class:is-active={currentPath.startsWith("/admin/standards")}
        >
          Kamus &amp; Standar ASN
        </a>
      </nav>
    </header>

    <div class="admin-page-body">
      {@render children()}
    </div>
  </div>
{/if}

<style>
  .admin-loading-screen {
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

  .admin-layout-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .admin-subnav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-6);
    flex-wrap: wrap;
    gap: var(--space-4);
  }

  .admin-title-area {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .admin-badge {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--color-gold-dark);
  }

  .admin-portal-title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-brand-primary);
  }

  .admin-menu {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .admin-tab {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    text-decoration: none;
    transition: all var(--transition-fast);
    background-color: var(--color-bg-subtle);
    border: 1px solid var(--color-border-default);
  }

  .admin-tab:hover {
    color: var(--color-brand-primary);
    background-color: var(--color-bg-surface);
    border-color: var(--color-brand-accent-light);
    transform: translateY(-1px);
    text-decoration: none;
  }

  .admin-tab.is-active {
    background-color: var(--color-brand-primary);
    color: #ffffff;
    border-color: var(--color-brand-primary);
    font-weight: var(--font-weight-bold);
    box-shadow: 0 2px 4px rgba(10, 37, 64, 0.15);
    position: relative;
  }

  .admin-tab.is-active:hover {
    background-color: var(--color-brand-primary);
    color: #ffffff;
    border-color: var(--color-brand-primary);
    transform: none;
  }

  .admin-tab.is-active::after {
    content: "";
    position: absolute;
    bottom: -1px;
    left: 20%;
    right: 20%;
    height: 2px;
    background-color: var(--color-gold);
    border-radius: var(--radius-full);
  }

  .admin-page-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .admin-subnav {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
