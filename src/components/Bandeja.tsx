/**
 * Marca: una bandeja de tres compartimentos, con los mismos colores que
 * clasifican los productos. El logo y la taxonomía son el mismo sistema.
 */
export function Bandeja({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 28 24"
      role="img"
      aria-label="Colaciones"
      focusable="false"
    >
      <rect x="0.75" y="0.75" width="26.5" height="22.5" rx="5.5" fill="var(--surface-sunken)" />
      <rect x="3" y="3" width="13" height="18" rx="3" fill="var(--cat-fondo)" />
      <rect x="18" y="3" width="7" height="8" rx="2.5" fill="var(--cat-ensalada)" />
      <rect x="18" y="13" width="7" height="8" rx="2.5" fill="var(--cat-agregado)" />
      <rect
        x="0.75"
        y="0.75"
        width="26.5"
        height="22.5"
        rx="5.5"
        fill="none"
        stroke="rgba(20,32,26,0.12)"
        strokeWidth="1.5"
      />
    </svg>
  );
}
