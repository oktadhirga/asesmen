<script lang="ts">
  import { auth } from "../../stores/auth.svelte";
  import Badge from "./Badge.svelte";
  import Button from "./Button.svelte";

  function handleLogout() {
    if (confirm("Apakah Anda yakin ingin keluar dari sistem asesmen?")) {
      auth.logout();
    }
  }
</script>

<header class="navbar-wrapper">
  <div class="top-accent-bar" aria-hidden="true"></div>

  <div class="navbar container">
    <!-- Brand / Logo -->
    <a href="/" class="brand-link" aria-label="Beranda Portal Asesmen ASN">
      <div class="brand-emblem" aria-hidden="true">
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
      <div class="brand-info">
        <span class="brand-title">ASESMEN KOMPETENSI ASN</span>
        <span class="brand-subtitle">Standar PermenPANRB No. 38 Tahun 2017</span>
      </div>
    </a>

    <!-- Nav Links & User Section -->
    <div class="nav-right">
      {#if auth.isAuthenticated && auth.user}
        <nav class="nav-links" aria-label="Navigasi Utama">
          {#if auth.isAdmin}
            <a href="/admin/dashboard" class="nav-item">Dashboard</a>
            <a href="/admin/sessions" class="nav-item">Sesi Asesmen</a>
            <a href="/admin/questions" class="nav-item">Bank Soal</a>
            <a href="/admin/users" class="nav-item">Pegawai</a>
            <a href="/admin/reports" class="nav-item">Laporan & Rekap</a>
          {:else}
            <a href="/participant/dashboard" class="nav-item">Jadwal Ujian Saya</a>
          {/if}
        </nav>

        <div class="user-profile-pill">
          <div class="user-avatar" aria-hidden="true">
            {auth.user.nama.charAt(0)}
          </div>
          <div class="user-details">
            <span class="user-name">{auth.user.nama}</span>
            <span class="user-nip">NIP: {auth.user.nip}</span>
          </div>
          <Badge variant={auth.isAdmin ? "gold" : "info"} size="sm">
            {auth.user.role}
          </Badge>
          <Button variant="ghost" size="sm" onclick={handleLogout} title="Keluar">
            Keluar
          </Button>
        </div>
      {:else}
        <div class="guest-actions">
          <Button variant="gold" size="sm" onclick={() => (window.location.href = "/login")}>
            Masuk ke Sistem
          </Button>
        </div>
      {/if}
    </div>
  </div>
</header>

<style>
  .navbar-wrapper {
    background-color: var(--color-bg-surface);
    border-bottom: 1px solid var(--color-border-default);
    box-shadow: var(--shadow-xs);
    position: sticky;
    top: 0;
    z-index: 40;
  }

  .top-accent-bar {
    height: 4px;
    background: linear-gradient(90deg, var(--color-brand-primary) 0%, var(--color-gold) 50%, var(--color-brand-primary) 100%);
  }

  .navbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 70px;
    padding-top: var(--space-2);
    padding-bottom: var(--space-2);
  }

  .brand-link {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    text-decoration: none;
  }

  .brand-emblem {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .emblem-svg {
    width: 100%;
    height: 100%;
  }

  .brand-info {
    display: flex;
    flex-direction: column;
  }

  .brand-title {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-bold);
    color: var(--color-brand-primary);
    letter-spacing: -0.01em;
    line-height: 1.2;
  }

  .brand-subtitle {
    font-size: var(--font-size-xs);
    color: var(--color-text-subtle);
    font-weight: var(--font-weight-medium);
  }

  .nav-right {
    display: flex;
    align-items: center;
    gap: var(--space-6);
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .nav-item {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    text-decoration: none;
    transition: all var(--transition-fast);
  }

  .nav-item:hover {
    color: var(--color-brand-primary);
    background-color: var(--color-bg-subtle);
    text-decoration: none;
  }

  .user-profile-pill {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-1) var(--space-2) var(--space-1) var(--space-3);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-full);
    background-color: var(--color-bg-app);
  }

  .user-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background-color: var(--color-brand-primary);
    color: var(--color-text-inverse);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .user-details {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }

  .user-name {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-main);
  }

  .user-nip {
    font-size: 10px;
    color: var(--color-text-subtle);
  }

  @media (max-width: 860px) {
    .nav-links {
      display: none;
    }
  }
</style>
