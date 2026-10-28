<script lang="ts">
  import type { RadarDimensionItem } from "../../types";

  export interface RadarChartProps {
    data: RadarDimensionItem[];
    maxLevel?: number;
    size?: number;
    showLegend?: boolean;
    class?: string;
  }

  let {
    data = [],
    maxLevel = 5,
    size = 460,
    showLegend = true,
    class: className = "",
  }: RadarChartProps = $props();

  const center = $derived(size / 2);
  const radius = $derived(size * 0.38);
  const numAxes = $derived(data.length || 9);
  const angleStep = $derived((Math.PI * 2) / numAxes);

  // Active hover tooltip state
  let hoveredIndex = $state<number | null>(null);

  // Helper polar to cartesian coordinates
  function getCoordinates(index: number, value: number, max: number) {
    const angle = index * angleStep - Math.PI / 2;
    const distance = (value / max) * radius;
    return {
      x: center + distance * Math.cos(angle),
      y: center + distance * Math.sin(angle),
    };
  }

  // Calculate polygon points string for SVG <polygon>
  function calculatePolygonPoints(type: "skor" | "standar"): string {
    if (!data.length) return "";
    return data
      .map((item, index) => {
        const val = type === "skor" ? item.skor : item.standar;
        const coords = getCoordinates(index, val, maxLevel);
        return `${coords.x},${coords.y}`;
      })
      .join(" ");
  }

  // Grid concentric polygon levels (1 to maxLevel)
  const gridLevels = $derived(
    Array.from({ length: maxLevel }, (_, i) => i + 1)
  );

  function getGridPoints(level: number): string {
    return Array.from({ length: numAxes }, (_, i) => {
      const coords = getCoordinates(i, level, maxLevel);
      return `${coords.x},${coords.y}`;
    }).join(" ");
  }
</script>

<div class="radar-container {className}">
  <svg
    viewBox="0 0 {size} {size}"
    class="radar-svg"
    role="img"
    aria-label="Grafik Radar 9 Dimensi Kompetensi Asesmen ASN"
  >
    <!-- Background Grid Polygons -->
    {#each gridLevels as level}
      <polygon
        points={getGridPoints(level)}
        class="grid-polygon"
      />
      <!-- Level number indicators on top axis -->
      <text
        x={center + 6}
        y={center - (level / maxLevel) * radius + 4}
        class="grid-level-label"
      >
        {level}
      </text>
    {/each}

    <!-- Radial Spokes & Axis Labels -->
    {#each data as item, i}
      {@const outerCoords = getCoordinates(i, maxLevel, maxLevel)}
      {@const labelCoords = getCoordinates(i, maxLevel + 0.55, maxLevel)}
      <line
        x1={center}
        y1={center}
        x2={outerCoords.x}
        y2={outerCoords.y}
        class="axis-line"
      />

      <!-- Dimension Label -->
      <text
        x={labelCoords.x}
        y={labelCoords.y}
        class="axis-label"
        class:is-active={hoveredIndex === i}
        text-anchor="middle"
        dominant-baseline="central"
      >
        {item.kode}
      </text>
    {/each}

    <!-- Standard Benchmark Polygon (Dashed Gold) -->
    {#if data.length > 0}
      <polygon
        points={calculatePolygonPoints("standar")}
        class="polygon-standard"
      />
    {/if}

    <!-- Real Participant Score Polygon (Emerald Filled) -->
    {#if data.length > 0}
      <polygon
        points={calculatePolygonPoints("skor")}
        class="polygon-score"
      />

      <!-- Node Dots for Real Score with interactive hover -->
      {#each data as item, i}
        {@const dotCoords = getCoordinates(i, item.skor, maxLevel)}
        <circle
          cx={dotCoords.x}
          cy={dotCoords.y}
          r={hoveredIndex === i ? 7 : 4}
          class="score-node"
          role="button"
          tabindex="0"
          aria-label="{item.nama}: skor {item.skor}"
          onmouseenter={() => (hoveredIndex = i)}
          onmouseleave={() => (hoveredIndex = null)}
          onfocus={() => (hoveredIndex = i)}
          onblur={() => (hoveredIndex = null)}
        />
      {/each}
    {/if}
  </svg>

  <!-- Interactive Detail Tooltip / Card on Hover -->
  {#if hoveredIndex !== null && data[hoveredIndex]}
    {@const activeItem = data[hoveredIndex]}
    <div class="hover-tooltip" role="status">
      <span class="tooltip-title">{activeItem.nama} ({activeItem.kode})</span>
      <div class="tooltip-grid">
        <span class="tooltip-label">Skor Riil:</span>
        <span class="tooltip-val val-skor">{activeItem.skor.toFixed(2)}</span>
        <span class="tooltip-label">Standar Level:</span>
        <span class="tooltip-val val-std">{activeItem.standar}</span>
        <span class="tooltip-label">Gap:</span>
        <span
          class="tooltip-val"
          class:text-success={activeItem.gap >= 0}
          class:text-danger={activeItem.gap < 0}
        >
          {activeItem.gap > 0 ? `+${activeItem.gap.toFixed(2)}` : activeItem.gap.toFixed(2)}
        </span>
      </div>
    </div>
  {/if}

  <!-- Chart Legend -->
  {#if showLegend}
    <div class="radar-legend">
      <div class="legend-item">
        <span class="legend-color color-score"></span>
        <span class="legend-text">Skor Riil Capaian ASN</span>
      </div>
      <div class="legend-item">
        <span class="legend-color color-standard"></span>
        <span class="legend-text">Standar Kompetensi Jabatan</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .radar-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    width: 100%;
    max-width: 520px;
    margin: 0 auto;
  }

  .radar-svg {
    width: 100%;
    height: auto;
    overflow: visible;
  }

  .grid-polygon {
    fill: transparent;
    stroke: var(--color-border-default);
    stroke-width: 1;
  }

  .grid-level-label {
    font-size: 10px;
    fill: var(--color-text-subtle);
    font-family: var(--font-family-mono);
  }

  .axis-line {
    stroke: var(--color-border-default);
    stroke-width: 1;
    stroke-dasharray: 2 2;
  }

  .axis-label {
    font-size: 11px;
    font-weight: var(--font-weight-semibold);
    fill: var(--color-text-muted);
    font-family: var(--font-family-sans);
    transition: all var(--transition-fast);
  }

  .axis-label.is-active {
    fill: var(--color-brand-primary);
    font-weight: var(--font-weight-bold);
  }

  .polygon-standard {
    fill: rgba(201, 151, 56, 0.08);
    stroke: var(--color-gold);
    stroke-width: 2;
    stroke-dasharray: 4 3;
  }

  .polygon-score {
    fill: rgba(5, 150, 105, 0.25);
    stroke: var(--color-success);
    stroke-width: 2.5;
    transition: all var(--transition-normal);
  }

  .score-node {
    fill: var(--color-success);
    stroke: #ffffff;
    stroke-width: 2;
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  .score-node:hover {
    fill: var(--color-brand-primary);
    stroke-width: 3;
  }

  .hover-tooltip {
    position: absolute;
    bottom: 50px;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-xs);
    pointer-events: none;
    z-index: 10;
    animation: fadeIn var(--transition-fast) forwards;
  }

  .tooltip-title {
    font-weight: var(--font-weight-bold);
    color: var(--color-brand-primary);
    display: block;
    margin-bottom: 4px;
  }

  .tooltip-grid {
    display: grid;
    grid-template-columns: auto auto;
    gap: 2px 8px;
  }

  .tooltip-label {
    color: var(--color-text-subtle);
  }

  .tooltip-val {
    font-weight: var(--font-weight-semibold);
    font-family: var(--font-family-mono);
  }

  .val-skor {
    color: var(--color-success);
  }
  .val-std {
    color: var(--color-gold-dark);
  }
  .text-success {
    color: var(--color-success);
  }
  .text-danger {
    color: var(--color-danger);
  }

  .radar-legend {
    display: flex;
    justify-content: center;
    gap: var(--space-6);
    margin-top: var(--space-4);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
  }

  .legend-color {
    width: 14px;
    height: 14px;
    border-radius: var(--radius-sm);
  }

  .color-score {
    background-color: rgba(5, 150, 105, 0.4);
    border: 1.5px solid var(--color-success);
  }

  .color-standard {
    background-color: rgba(201, 151, 56, 0.2);
    border: 1.5px dashed var(--color-gold);
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
