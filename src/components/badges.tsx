import { Chip, type Tone } from './ui'

const T: Record<string, Tone> = {
  Pendiente: 'warn', 'En proceso': 'info', Completado: 'good',
  Vencido: 'bad', 'Próximo': 'warn', 'Al día': 'good', 'Por evento': 'neutral',
  Agotado: 'bad', Reponer: 'warn', OK: 'good',
  'A tiempo': 'good', 'Fuera de plazo': 'bad', Atrasada: 'bad', 'En plazo': 'info',
  Alta: 'bad', Media: 'warn', Baja: 'neutral',
  'Alto / Crítico': 'bad', Medio: 'warn', Bajo: 'good',
  'En mantenimiento': 'info', 'Con OT pendiente': 'warn', Operativo: 'good',
  Correctivo: 'accent', Preventivo: 'info', Predictivo: 'neutral', Mejora: 'neutral',
}

export function Badge({ v }: { v: string | null | undefined }) {
  if (!v) return <span className="text-muted">—</span>
  return <Chip tone={T[v] ?? 'neutral'}>{v}</Chip>
}

export function CritDot({ n }: { n: number | null }) {
  if (n === null || n === undefined) return <span className="text-muted">—</span>
  const tone = n >= 6 ? 'bg-bad-soft text-bad' : n >= 4 ? 'bg-warn-soft text-warn' : 'bg-good-soft text-good'
  return <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${tone}`}>{n}</span>
}
