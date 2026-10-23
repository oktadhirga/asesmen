<script lang="ts">
  import type { Snippet } from "svelte";

  export interface AlertProps {
    variant?: "info" | "success" | "warning" | "error";
    title?: string;
    dismissible?: boolean;
    children?: Snippet;
    onDismiss?: () => void;
    class?: string;
  }

  let {
    variant = "info",
    title,
    dismissible = false,
    children,
    onDismiss,
    class: className = "",
  }: AlertProps = $props();

  let isVisible = $state(true);

  function handleDismiss() {
    isVisible = false;
    onDismiss?.();
  }
</script>

{#if isVisible}
  <div class="alert alert-{variant} {className}" role="alert" aria-live="polite">
    <div class="alert-icon" aria-hidden="true">
      {#if variant === "info"}
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
      {:else if variant === "success"}
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
      {:else if variant === "warning"}
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
      {:else if variant === "error"}
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
      {/if}
    </div>

    <div class="alert-content">
      {#if title}
        <h4 class="alert-title">{title}</h4>
      {/if}
      {#if children}
        <div class="alert-body">
          {@render children()}
        </div>
      {/if}
    </div>

    {#if dismissible}
      <button
        type="button"
        class="alert-dismiss"
        aria-label="Tutup pemberitahuan"
        onclick={handleDismiss}
      >
        &times;
      </button>
    {/if}
  </div>
{/if}

<style>
  .alert {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-4);
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    margin-bottom: var(--space-4);
  }

  .alert-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }
  .alert-icon svg {
    width: 100%;
    height: 100%;
  }

  .alert-content {
    flex: 1 1 auto;
  }

  .alert-title {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    margin-bottom: 2px;
    color: inherit;
  }

  .alert-body {
    font-size: var(--font-size-sm);
    line-height: 1.5;
  }

  .alert-dismiss {
    background: transparent;
    border: none;
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    color: inherit;
    opacity: 0.6;
    transition: opacity var(--transition-fast);
    padding: 0 var(--space-1);
  }
  .alert-dismiss:hover {
    opacity: 1;
  }

  /* Variants */
  .alert-info {
    background-color: var(--color-info-bg);
    border-color: var(--color-info-border);
    color: var(--color-info-text);
  }

  .alert-success {
    background-color: var(--color-success-bg);
    border-color: var(--color-success-border);
    color: var(--color-success-text);
  }

  .alert-warning {
    background-color: var(--color-warning-bg);
    border-color: var(--color-warning-border);
    color: var(--color-warning-text);
  }

  .alert-error {
    background-color: var(--color-danger-bg);
    border-color: var(--color-danger-border);
    color: var(--color-danger-text);
  }
</style>
