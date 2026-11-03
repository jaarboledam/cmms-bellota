import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useData } from '../lib/DataContext'
import { ORIGENES, SUBSISTEMAS, TIPOS_MANT, type OrdenX } from '../lib/calc'
import { todayISO } from '../lib/dates'
import { cop, fecha, num } from '../lib/format'
import { Button, Card, Confirm, DataTable, FilterSelect, FormModal, IconButton, PageHeader, type Column, type FieldDef, type Values } from '../components/ui'
import { Badge, CritDot } from '../components/badges'
import type { Row } from '../lib/types'

function nextOT(ids: string[]): string {
  const yy = todayISO().slice(2, 4)
  const pref = `OT-${yy}-`
  const max = ids.filter((i) => i.startsWith(pref)).map((i) => Number(i.slice(pref.length)) || 0).reduce((a, b) => Math.max(a, b), 0)
  return `${pref}${String(max + 1).padStart(4, '0')}`
}

export function Ordenes() {
  const { db, ordenes, plan, insert, update, remove, params } = useData()
  const [sp, setSp] = useSearchParams()
  const [fEstado, setFEstado] = useState('')
  const [fTipo, setFTipo] = useState('')
  const [fEquipo, setFEquipo] = useState('')
  const [editing, setEditing] = useState<Values | null>(null)
  const [isEdit, setIsEdit] = useState(false)
  const [deleting, setDeleting] = useState<OrdenX | null>(null)

  const openNew = () => {
    setIsEdit(false)
    setEditing({ id: nextOT(ordenes.map((o) => o.id)), origen: 'Registro CMMS', fecha_solicitud: todayISO(), tipo: 'Correctivo', prioridad: 'Media', detiene_produccion: true })
  }
  const openEdit = (o: OrdenX) => {
    setIsEdit(true)
    const base = db?.ordenes.find((x) => x.id === o.id)
    setEditing({ ...(base as unknown as Values) })
  }

  useEffect(() => {
    if (!db) return
    if (sp.get('nueva')) { openNew(); setSp({}, { replace: true }) }
    const pid = sp.get('plan')
    if (pid) {
      const p = plan.find((x) => x.id === pid)
      if (p) {
        setIsEdit(false)
        setEditing({ id: nextOT(ordenes.map((o) => o.id)), origen: 'Registro CMMS', fecha_solicitud: todayISO(), tipo: 'Preventivo', prioridad: 'Media',
          detiene_produccion: false, id_plan: p.id, codigo_equipo: p.codigo_equipo, motivo: p.actividad, horas_hombre: p.duracion_h, costo_repuestos: p.costo_insumos,
          fecha_inicio: todayISO(), fecha_fin: todayISO() })
      }
      setSp({}, { replace: true })
    }
    const ot = sp.get('ot')
    if (ot) { const o = ordenes.find((x) => x.id === ot); if (o) openEdit(o); setSp({}, { replace: true }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, sp])

  const rows = useMemo(() => ordenes.filter((o) =>
    (!fEstado || o.estado === fEstado) && (!fTipo || o.tipo === fTipo) && (!fEquipo || o.codigo_equipo === fEquipo)), [ordenes, fEstado, fTipo, fEquipo])

  const equiposOpt = (db?.equipos ?? []).map((e) => ({ value: e.id, label: `${e.id} · ${e.nombre}` }))
  const tecOpt = (db?.tecnicos ?? []).map((t) => ({ value: t.id, label: `${t.id} · ${t.nombre}` }))

  const fields = (v: Values): FieldDef[] => {
    const eq = v.codigo_equipo as string | null
    const tipo = v.tipo as string
    const motivos = (db?.fallas ?? []).filter((f) => !eq || f.codigo_equipo === eq).map((f) => f.motivo)
    const planes = plan.filter((p) => !eq || p.codigo_equipo === eq).map((p) => ({ value: p.id, label: `${p.id} · ${p.actividad}` }))
    return [
      { name: 'id', label: 'N° OT', type: 'text', required: true, lockOnEdit: true },
      { name: 'origen', label: 'Origen', type: 'select', options: ORIGENES },
      { name: 'fecha_solicitud', label: 'Fecha de solicitud', type: 'date', required: true },
      { name: 'codigo_equipo', label: 'Equipo', type: 'select', options: equiposOpt, required: true },
      { name: 'tipo', label: 'Tipo de mantenimiento', type: 'select', options: TIPOS_MANT, required: true },
      { name: 'id_plan', label: 'ID del plan preventivo', type: 'select', options: planes, required: tipo === 'Preventivo', help: tipo === 'Preventivo' ? 'Al cerrar la OT, el plan recalcula la próxima fecha.' : 'Solo para órdenes preventivas.' },
      tipo === 'Correctivo'
        ? { name: 'motivo', label: 'Modo de falla', type: 'select', options: motivos, required: true, help: 'Del catálogo de fallas del equipo.' }
        : { name: 'motivo', label: 'Actividad', type: 'text', required: true },
      { name: 'causa', label: 'Causa probable', type: 'text' },
      { name: 'subsistema', label: 'Sub-sistema', type: 'select', options: SUBSISTEMAS },
      { name: 'prioridad', label: 'Prioridad', type: 'select', options: params.prioridades.map((p) => p.nombre), required: true },
      { name: 'tecnico', label: 'Técnico', type: 'select', options: tecOpt },
      { name: 'detiene_produccion', label: 'Detiene producción', type: 'checkbox', help: 'Las horas cuentan como paro (MTBF, MTTR, disponibilidad).' },
      { name: 'fecha_inicio', label: 'Fecha de inicio', type: 'date' },
      { name: 'hora_inicio', label: 'Hora de inicio', type: 'time' },
      { name: 'fecha_fin', label: 'Fecha de fin', type: 'date', help: 'Al llenarla, la OT queda Completada.' },
      { name: 'hora_fin', label: 'Hora de fin', type: 'time' },
      { name: 'horas_hombre', label: 'Horas-hombre', type: 'number', min: 0 },
      { name: 'costo_repuestos', label: 'Costo de repuestos (COP)', type: 'number', min: 0 },
      { name: 'accion', label: 'Acción realizada', type: 'textarea', full: true },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', full: true },
    ]
  }

  const onChangeValues = (v: Values, changed: string): Values => {
    if (changed === 'id_plan' && v.id_plan) {
      const p = plan.find((x) => x.id === v.id_plan)
      if (p) return { ...v, codigo_equipo: p.codigo_equipo, motivo: p.actividad, horas_hombre: v.horas_hombre ?? p.duracion_h, costo_repuestos: v.costo_repuestos ?? p.costo_insumos }
    }
    if (changed === 'tipo') return { ...v, detiene_produccion: v.tipo === 'Correctivo', motivo: null, id_plan: v.tipo === 'Preventivo' ? v.id_plan : null }
    if (changed === 'codigo_equipo' && v.tipo === 'Correctivo') return { ...v, motivo: null }
    return v
  }

  const validate = (v: Values) => {
    if (v.fecha_fin && !v.fecha_inicio) return 'Para cerrar la OT primero debe tener fecha de inicio.'
    if (v.fecha_fin && v.fecha_inicio && (v.fecha_fin as string) < (v.fecha_inicio as string)) return 'La fecha de fin no puede ser anterior a la fecha de inicio.'
    if (v.fecha_fin && v.fecha_fin === v.fecha_inicio && v.hora_fin && v.hora_inicio && (v.hora_fin as string) < (v.hora_inicio as string)) return 'La hora de fin es anterior a la hora de inicio.'
    if (v.tipo === 'Preventivo' && !v.id_plan) return 'Las órdenes preventivas deben tener ID del plan.'
    return null
  }

  const preview = (v: Values) => {
    const estado = v.fecha_fin ? 'Completado' : v.fecha_inicio ? 'En proceso' : 'Pendiente'
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm bg-[#f7f8fa] rounded-lg px-3 py-2">
        <span className="text-muted">Estado automático:</span><Badge v={estado} />
        <span className="text-muted">El costo de mano de obra se calcula con la tarifa del técnico.</span>
      </div>
    )
  }

  const save = async (v: Values) => {
    const row = v as Row
    if (isEdit) {
      const { id, ...patch } = row
      return update('ordenes', id, patch)
    }
    return insert('ordenes', row)
  }

  const columns: Column<OrdenX>[] = [
    { key: 'id', header: 'N° OT', mono: true },
    { key: 'fecha_solicitud', header: 'Fecha', render: (o) => fecha(o.fecha_solicitud) },
    { key: 'equipoNombre', header: 'Equipo' },
    { key: 'tipo', header: 'Tipo', render: (o) => <Badge v={o.tipo} /> },
    { key: 'motivo', header: 'Falla / actividad', render: (o) => <span className="line-clamp-2">{o.motivo}</span> },
    { key: 'criticidad', header: 'Crit.', align: 'center', render: (o) => <CritDot n={o.criticidad} /> },
    { key: 'prioridad', header: 'Prioridad', render: (o) => <Badge v={o.prioridad} /> },
    { key: 'tecnicoNombre', header: 'Técnico', render: (o) => o.tecnicoNombre || '—' },
    { key: 'horasParo', header: 'Paro (h)', align: 'right', render: (o) => num(o.horasParo, 1) },
    { key: 'costoTotal', header: 'Costo', align: 'right', render: (o) => cop(o.costoTotal) },
    { key: 'estado', header: 'Estado', render: (o) => <Badge v={o.estado} /> },
    { key: 'cumplimientoSla', header: 'SLA', render: (o) => <Badge v={o.cumplimientoSla} /> },
  ]

  return (
    <>
      <PageHeader title="Órdenes de trabajo" subtitle="Registro de correctivos y preventivos. El estado, la duración, los costos y el SLA se calculan solos."
        actions={<Button variant="primary" icon="plus" onClick={openNew}>Nueva orden</Button>} />
      <Card>
        <DataTable rows={rows} columns={columns} initialSort={{ key: 'fecha_solicitud', dir: -1 }}
          search={(o) => `${o.id} ${o.equipoNombre} ${o.motivo} ${o.causa ?? ''} ${o.tecnicoNombre} ${o.accion ?? ''}`}
          onRowClick={openEdit}
          toolbar={<>
            <FilterSelect label="Estado" value={fEstado} onChange={setFEstado} options={['Pendiente', 'En proceso', 'Completado']} />
            <FilterSelect label="Tipo" value={fTipo} onChange={setFTipo} options={TIPOS_MANT} />
            <FilterSelect label="Equipo" value={fEquipo} onChange={setFEquipo} options={(db?.equipos ?? []).map((e) => ({ value: e.id, label: e.nombre }))} />
          </>}
          actions={(o) => <>
            <IconButton icon="edit" label={`Editar ${o.id}`} onClick={() => openEdit(o)} />
            <IconButton icon="trash" label={`Eliminar ${o.id}`} tone="danger" onClick={() => setDeleting(o)} />
          </>} />
      </Card>
      {editing && (
        <FormModal title={isEdit ? `Orden ${editing.id}` : 'Nueva orden de trabajo'} fields={fields} initial={editing} isEdit={isEdit}
          onSubmit={save} onClose={() => setEditing(null)} validate={validate} extra={preview} onChangeValues={onChangeValues} />
      )}
      {deleting && (
        <Confirm title="Eliminar orden" onClose={() => setDeleting(null)} onConfirm={async () => { await remove('ordenes', deleting.id) }}
          text={<>¿Eliminar la orden <b>{deleting.id}</b> ({deleting.motivo}, {deleting.equipoNombre})? Esta acción no se puede deshacer y recalcula los indicadores.</>} />
      )}
    </>
  )
}
