<script lang="ts">
  import type { Snippet } from "svelte";

  export interface BadgeProps {
    variant?: "default" | "success" | "warning" | "danger" | "info" | "gold";
    size?: "sm" | "md";
    dot?: boolean;
    children?: Snippet;
    class?: string;
  }

  let {
    variant = "default",
    size = "md",
    dot = false,
    children,
    class: className = "",
  }: BadgeProps = $props();
</script>

<span class="badge badge-{variant} badge-{size} {className}">
  {#if dot}
    <span class="badge-dot" aria-hidden="true"></span>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-family-sans);
    font-weight: var(--font-weight-semibold);
    border-radius: var(--radius-full);
    border: 1px solid transparent;
    white-space: nowrap;
    line-height: 1;
  }

  .badge-sm {
    padding: 3px 8px;
    font-size: var(--font-size-xs);
  }

  .badge-md {
    padding: 5px 12px;
    font-size: var(--font-size-sm);
  }

  .badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: currentColor;
  }

  /* Variants */
  .badge-default {
    background-color: var(--color-bg-subtle);
    color: var(--color-text-muted);
    border-color: var(--color-border-default);
  }

  .badge-success {
    background-color: var(--color-success-bg);
    color: var(--color-success-text);
    border-color: var(--color-success-border);
  }

  .badge-warning {
    background-color: var(--color-warning-bg);
    color: var(--color-warning-text);
    border-color: var(--color-warning-border);
  }

  .badge-danger {
    background-color: var(--color-danger-bg);
    color: var(--color-danger-text);
    border-color: var(--color-danger-border);
  }

  .badge-info {
    background-color: var(--color-info-bg);
    color: var(--color-info-text);
    border-color: var(--color-info-border);
  }

  .badge-gold {
    background-color: var(--color-gold-light);
    color: var(--color-gold-dark);
    border-color: var(--color-gold);
  }
</style>
