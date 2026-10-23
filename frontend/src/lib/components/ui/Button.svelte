<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";

  export interface ButtonProps extends HTMLButtonAttributes {
    variant?: "primary" | "secondary" | "danger" | "outline" | "ghost" | "gold";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
    disabled?: boolean;
    children?: Snippet;
  }

  let {
    variant = "primary",
    size = "md",
    isLoading = false,
    disabled = false,
    children,
    class: className = "",
    type = "button",
    ...restProps
  }: ButtonProps = $props();
</script>

<button
  type={type}
  disabled={disabled || isLoading}
  aria-busy={isLoading}
  class="btn btn-{variant} btn-{size} {className}"
  {...restProps}
>
  {#if isLoading}
    <span class="spinner" aria-hidden="true"></span>
    <span class="sr-only">Memproses...</span>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    font-family: var(--font-family-sans);
    font-weight: var(--font-weight-semibold);
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    cursor: pointer;
    transition: all var(--transition-fast);
    text-decoration: none;
    white-space: nowrap;
    position: relative;
    user-select: none;
  }

  /* Sizes */
  .btn-sm {
    padding: var(--space-1) var(--space-3);
    font-size: var(--font-size-xs);
    height: 32px;
  }

  .btn-md {
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-sm);
    height: 40px;
  }

  .btn-lg {
    padding: var(--space-3) var(--space-6);
    font-size: var(--font-size-base);
    height: 48px;
  }

  /* Variants */
  .btn-primary {
    background-color: var(--color-brand-primary);
    color: var(--color-text-inverse);
    border-color: var(--color-brand-primary);
    box-shadow: var(--shadow-xs);
  }
  .btn-primary:hover:not(:disabled) {
    background-color: var(--color-brand-primary-hover);
    box-shadow: var(--shadow-sm);
    transform: translateY(-1px);
  }

  .btn-gold {
    background-color: var(--color-gold);
    color: var(--color-text-inverse);
    border-color: var(--color-gold);
    box-shadow: var(--shadow-xs);
  }
  .btn-gold:hover:not(:disabled) {
    background-color: var(--color-gold-dark);
    box-shadow: var(--shadow-sm);
    transform: translateY(-1px);
  }

  .btn-secondary {
    background-color: var(--color-bg-subtle);
    color: var(--color-text-main);
    border-color: var(--color-border-default);
  }
  .btn-secondary:hover:not(:disabled) {
    background-color: var(--color-border-subtle);
    border-color: var(--color-border-strong);
  }

  .btn-outline {
    background-color: transparent;
    color: var(--color-brand-primary);
    border-color: var(--color-border-strong);
  }
  .btn-outline:hover:not(:disabled) {
    background-color: var(--color-bg-subtle);
    border-color: var(--color-brand-primary);
  }

  .btn-danger {
    background-color: var(--color-danger);
    color: var(--color-text-inverse);
    border-color: var(--color-danger);
  }
  .btn-danger:hover:not(:disabled) {
    background-color: #b91c1c;
    box-shadow: var(--shadow-sm);
  }

  .btn-ghost {
    background-color: transparent;
    color: var(--color-text-muted);
  }
  .btn-ghost:hover:not(:disabled) {
    background-color: var(--color-bg-subtle);
    color: var(--color-text-main);
  }

  /* Disabled State */
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }

  /* Spinner */
  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
