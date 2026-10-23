<script lang="ts">
  import type { Snippet } from "svelte";

  export interface ModalProps {
    isOpen?: boolean;
    title?: string;
    size?: "sm" | "md" | "lg";
    children?: Snippet;
    footer?: Snippet;
    onClose?: () => void;
  }

  let {
    isOpen = $bindable(false),
    title = "",
    size = "md",
    children,
    footer,
    onClose,
  }: ModalProps = $props();

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && isOpen) {
      close();
    }
  }

  function close() {
    isOpen = false;
    onClose?.();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="modal-backdrop"
    onclick={close}
    role="presentation"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="modal-dialog modal-{size}"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="modal-header">
        <h3 id="modal-title" class="modal-title">{title}</h3>
        <button
          type="button"
          class="modal-close"
          aria-label="Tutup dialog"
          onclick={close}
        >
          &times;
        </button>
      </div>

      <div class="modal-body">
        {#if children}
          {@render children()}
        {/if}
      </div>

      {#if footer}
        <div class="modal-footer">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    background-color: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    animation: fadeIn var(--transition-fast) forwards;
  }

  .modal-dialog {
    background-color: var(--color-bg-surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    border: 1px solid var(--color-border-default);
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: scaleUp var(--transition-fast) forwards;
  }

  .modal-sm { max-width: 440px; }
  .modal-md { max-width: 580px; }
  .modal-lg { max-width: 820px; }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-6);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .modal-title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-brand-primary);
  }

  .modal-close {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    line-height: 1;
    color: var(--color-text-subtle);
    cursor: pointer;
    padding: var(--space-1);
    border-radius: var(--radius-sm);
    transition: color var(--transition-fast);
  }
  .modal-close:hover {
    color: var(--color-brand-primary);
  }

  .modal-body {
    padding: var(--space-6);
    overflow-y: auto;
    font-size: var(--font-size-sm);
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-6);
    border-top: 1px solid var(--color-border-subtle);
    background-color: var(--color-bg-subtle);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleUp {
    from { transform: scale(0.96); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
</style>
