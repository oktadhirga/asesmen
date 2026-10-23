<script lang="ts">
  import "../styles/global.css";
  import { onMount } from "svelte";
  import { auth } from "../lib/stores/auth.svelte";
  import Navbar from "../lib/components/ui/Navbar.svelte";
  import type { LayoutProps } from "./$types";

  let { children }: LayoutProps = $props();

  onMount(() => {
    auth.init();
  });
</script>

<svelte:head>
  <title>Portal Asesmen Kompetensi ASN — PermenPANRB No. 38 Tahun 2017</title>
</svelte:head>

<div class="app-layout">
  <Navbar />

  <main class="main-content" id="main-content">
    {@render children()}
  </main>

  <footer class="app-footer">
    <div class="container footer-content">
      <div class="footer-left">
        <span class="footer-title">Sistem Asesmen Kompetensi Aparatur Sipil Negara</span>
        <span class="footer-desc">
          Berdasarkan Peraturan Menteri PANRB No. 38 Tahun 2017 tentang Standar Kompetensi Jabatan ASN.
        </span>
      </div>
      <div class="footer-right">
        <span class="footer-copy">&copy; 2026 Badan Kepegawaian Negara / Instansi Pemerintah. Hak Cipta Dilindungi.</span>
      </div>
    </div>
  </footer>
</div>

<style>
  .app-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: var(--color-bg-app);
  }

  .main-content {
    flex: 1 0 auto;
    padding-top: var(--space-6);
    padding-bottom: var(--space-12);
  }

  .app-footer {
    flex-shrink: 0;
    background-color: var(--color-brand-primary);
    color: var(--color-text-inverse);
    padding-top: var(--space-6);
    padding-bottom: var(--space-6);
    border-top: 3px solid var(--color-gold);
  }

  .footer-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  .footer-left {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .footer-title {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: #ffffff;
  }

  .footer-desc {
    font-size: var(--font-size-xs);
    color: #94a3b8;
  }

  .footer-copy {
    font-size: var(--font-size-xs);
    color: #94a3b8;
  }

  @media (max-width: 768px) {
    .footer-content {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
