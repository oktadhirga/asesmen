<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";

  export interface InputProps extends HTMLInputAttributes {
    label?: string;
    helperText?: string;
    errorMessage?: string;
    id?: string;
    value?: string | number;
  }

  let {
    label,
    helperText,
    errorMessage,
    id = `input-${Math.random().toString(36).substring(2, 9)}`,
    value = $bindable(""),
    disabled = false,
    required = false,
    class: className = "",
    ...restProps
  }: InputProps = $props();

  const isError = $derived(!!errorMessage);
  const describedBy = $derived(
    isError ? `${id}-error` : helperText ? `${id}-helper` : undefined
  );
</script>

<div class="input-group {className}">
  {#if label}
    <label for={id} class="input-label">
      {label}
      {#if required}
        <span class="required-indicator" aria-hidden="true">*</span>
      {/if}
    </label>
  {/if}

  <div class="input-wrapper">
    <input
      {id}
      bind:value
      {disabled}
      {required}
      aria-invalid={isError}
      aria-describedby={describedBy}
      class="form-control"
      class:has-error={isError}
      {...restProps}
    />
  </div>

  {#if errorMessage}
    <p id="{id}-error" class="error-text" role="alert">
      {errorMessage}
    </p>
  {:else if helperText}
    <p id="{id}-helper" class="helper-text">
      {helperText}
    </p>
  {/if}
</div>

<style>
  .input-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    width: 100%;
  }

  .input-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-main);
  }

  .required-indicator {
    color: var(--color-danger);
    margin-left: 2px;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .form-control {
    width: 100%;
    height: 40px;
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-family-sans);
    font-size: var(--font-size-sm);
    color: var(--color-text-main);
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
    outline: none;
  }

  .form-control::placeholder {
    color: var(--color-text-subtle);
  }

  .form-control:focus {
    border-color: var(--color-brand-accent);
    box-shadow: var(--focus-ring);
  }

  .form-control.has-error {
    border-color: var(--color-danger);
    background-color: #fffafa;
  }

  .form-control.has-error:focus {
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.2);
  }

  .form-control:disabled {
    background-color: var(--color-bg-subtle);
    color: var(--color-text-subtle);
    cursor: not-allowed;
    border-color: var(--color-border-default);
  }

  .error-text {
    font-size: var(--font-size-xs);
    color: var(--color-danger);
    font-weight: var(--font-weight-medium);
    margin-top: 2px;
  }

  .helper-text {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin-top: 2px;
  }
</style>
