/**
 * Badge semántico de estado de asignación.
 * Verde = ASIGNADA, Amarillo = PENDIENTE, Rojo = CONFLICTO
 * Fiel al diseño del PDF Actividad 4 / Prompt Midjourney.
 */
export function Badge({ estado }) {
  const map = {
    ASIGNADA:  { cls: 'badge-asignada',  label: 'Asignada' },
    PENDIENTE: { cls: 'badge-pendiente', label: 'Pendiente' },
    CONFLICTO: { cls: 'badge-conflicto', label: 'Conflicto' },
  }
  const cfg = map[estado] || { cls: 'badge-pendiente', label: estado }
  return (
    <span className={`badge ${cfg.cls}`}>
      <span className="badge-dot" />
      {cfg.label}
    </span>
  )
}

/**
 * Chip de carrera (pills azul claro #DBEAFE)
 * Del prompt Midjourney: "compact multi-value chips/tags"
 */
export function CarreraChip({ nombre }) {
  return <span className="chip">{nombre}</span>
}
