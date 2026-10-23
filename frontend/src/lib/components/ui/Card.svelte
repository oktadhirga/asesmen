<script lang="ts">
  import type { Snippet } from "svelte";

  export interface CardProps {
    header?: Snippet;
    children?: Snippet;
    footer?: Snippet;
    hoverable?: boolean;
    class?: string;
  }

  let {
    header,
    children,
    footer,
    hoverable = false,
    class: className = "",
  }: CardProps = $props();
</script>

<div class="card {className}" class:hoverable>
  {#if header}
    <div class="card-header">
      {@render header()}
    </div>
  {/if}

  {#if children}
    <div class="card-body">
      {@render children()}
    </div>
  {/if}

  {#if footer}
    <div class="card-footer">
      {@render footer()}
    </div>
  {/if}
</div>

<style>
  .card {
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: all var(--transition-normal);
  }

  .card.hoverable:hover {
    border-color: var(--color-brand-accent-light);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }

  .card-header {
    padding: var(--space-4) var(--space-6);
    border-bottom: 1px solid var(--color-border-subtle);
    background-color: var(--color-bg-surface);
  }

  .card-body {
    padding: var(--space-6);
    flex: 1 1 auto;
  }

  .card-footer {
    padding: var(--space-4) var(--space-6);
    border-top: 1px solid var(--color-border-subtle);
    background-color: var(--color-bg-subtle);
  }
</style>
