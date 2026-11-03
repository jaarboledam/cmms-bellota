import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useData } from '../lib/DataContext'
import { TIPOS_MANT } from '../lib/calc'
import { cop, fecha, horas, num, pct } from '../lib/format'
import { Card, DataTable, FilterSelect, PageHeader, StatCard, type Column } from '../components/ui'
import { Badge } from '../components/badges'
import type { OrdenX } from '../lib/calc'

export function HojaVida() {
  const { equipos, ordenes, fallas, plan } = useData()
  const [sp, setSp] = useSearchParams()
  const [tipo, setTipo] = useState('')
  const sel = sp.get('equipo') ?? equipos[0]?.id ?? ''
  const e = equipos.find((x) => x.id === sel)

  const hist = useMemo(() => ordenes.filter((o) => o.codigo_equipo === sel && (!tipo || o.tipo === tipo)), [ordenes, sel, tipo])
  const topFallas = useMemo(() => fallas.filter((f) => f.codigo_equipo === sel && f.eventos > 0).sort((a, b) => b.eventos - a.eventos).slice(0, 5), [fallas, sel])
  const planes = plan.filter((p) => p.codigo_equipo === sel)

  const columns: Column<OrdenX>[] = [
    { key: 'id', header: 'N° OT', mono: true, render: (o) => <Link to={`/ordenes?ot=${o.id}`} className="text-info">{o.id}</Link> },
    { key: 'fecha_solicitud', header: 'Fecha', render: (o) => fecha(o.fecha_solicitud) },
    { key: 'tipo', header: 'Tipo', render: (o) => <Badge v={o.tipo} /> },
    { key: 'motivo', header: 'Falla / actividad' },
    { key: 'causa', header: 'Causa', render: (o) => o.causa ?? '—' },
    { key: 'subsistema', header: 'Sub-sistema', render: (o) => o.subsistema ?? '—' },
    { key: 'tecnicoNombre', header: 'Técnico' },
    { key: 'horasParo', header: 'Paro', align: 'right', render: (o) => num(o.horasParo, 1) },
    { key: 'costoTotal', header: 'Costo', align: 'right', render: (o) => cop(o.costoTotal) },
    { key: 'estado', header: 'Estado', render: (o) => <Badge v={o.estado} /> },
  ]

  return (
    <>
      <PageHeader title="Hoja de vida del equipo" subtitle="Ficha, indicadores e historial completo de intervenciones."
        actions={<FilterSelect label="Equipo" value={sel} onChange={(v) => setSp(v ? { equipo: v } : {})} options={equipos.map((x) => ({ value: x.id, label: `${x.id} · ${x.nombre}` }))} />} />
      {!e ? <p className="text-sm text-muted">Seleccione un equipo.</p> : (
        <>
          <div className="flex flex-wrap gap-4">
            <Card title={e.nombre_planta ?? e.nombre} className="flex-[1_1_380px]">
              <dl className="grid grid-cols-[150px_1fr] gap-x-4 gap-y-2 px-5 pb-5 m-0 text-sm">
                {([['Código', e.id], ['Línea / sección', `${e.linea ?? '—'} / ${e.seccion ?? '—'}`], ['Tipo', e.tipo], ['Fabricante / modelo', `${e.fabricante ?? '—'} / ${e.modelo ?? '—'}`],
                  ['Fecha de creación', fecha(e.fecha_creacion)], ['Capacidad', e.capacidad], ['Fuente de trabajo', e.fuente_trabajo]] as [string, string | null][]).map(([k, v]) => (
                  <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className="m-0">{v ?? '—'}</dd></div>
                ))}
                <dt className="text-muted">Criticidad</dt><dd className="m-0 flex items-center gap-2">{e.indice ?? '—'} <Badge v={e.nivel} /></dd>
                <dt className="text-muted">Estado</dt><dd className="m-0"><Badge v={e.estadoOperativo} /></dd>
              </dl>
            </Card>
            <div className="flex-[1_1_420px] grid gap-4 grid-cols-[repeat(auto-fit,minmax(150px,1fr))] content-start">
              <StatCard label="Fallas (periodo)" value={num(e.fallas)} />
              <StatCard label="MTBF" value={horas(e.mtbf)} />
              <StatCard label="MTTR" value={horas(e.mttr)} />
              <StatCard label="Disponibilidad" value={pct(e.disponibilidad)} noteTone={e.disponibilidad < 0.9 ? 'warn' : 'good'} note={e.disponibilidad < 0.9 ? 'Bajo la meta' : 'Cumple la meta'} />
              <StatCard label="Costo (periodo)" value={cop(e.costo)} />
              <StatCard label="Planes vencidos" value={e.planesVencidos} noteTone={e.planesVencidos ? 'warn' : 'good'} note={`${planes.length} actividades en el plan`} />
            </div>
          </div>
          <Card title="Modos de falla más frecuentes (periodo)">
            <ul className="list-none m-0 px-5 pb-4 flex flex-col gap-2">
              {topFallas.length === 0 && <li className="text-sm text-muted">Sin fallas en el periodo.</li>}
              {topFallas.map((f) => (
                <li key={f.id} className="grid grid-cols-[minmax(160px,280px)_1fr_120px] gap-3 items-center text-sm">
                  <span>{f.motivo}</span>
                  <div className="h-2.5 bg-line-soft rounded-full overflow-hidden"><div className="h-full bg-[#c2410c] rounded-full" style={{ width: `${(f.eventos / (topFallas[0]?.eventos || 1)) * 100}%` }} /></div>
                  <span className="text-right text-muted">{f.eventos} eventos · {num(f.horasParo)} h</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Historial de intervenciones">
            <DataTable rows={hist} columns={columns} initialSort={{ key: 'fecha_solicitud', dir: -1 }} search={(o) => `${o.id} ${o.motivo} ${o.causa ?? ''} ${o.accion ?? ''}`}
              toolbar={<FilterSelect label="Tipo" value={tipo} onChange={setTipo} options={TIPOS_MANT} />} />
          </Card>
        </>
      )}
    </>
  )
}
