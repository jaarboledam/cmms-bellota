import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../lib/DataContext'
import { FRECUENCIAS, type PlanX } from '../lib/calc'
import { todayISO } from '../lib/dates'
import { cop, fecha, num, pct } from '../lib/format'
import { Button, Card, Confirm, DataTable, FilterSelect, FormModal, IconButton, PageHeader, StatCard, type Column, type FieldDef, type Values } from '../components/ui'
import { Badge } from '../components/badges'
import type { Row } from '../lib/types'

export function PlanPage() {
  const { db, plan, insert, update, remove, ordenes } = useData()
  const nav = useNavigate()
  const [fEstado, setFEstado] = useState('')
  const [fEquipo, setFEquipo] = useState('')
  const [editing, setEditing] = useState<Values | null>(null)
  const [isEdit, setIsEdit] = useState(false)
  const [deleting, setDeleting] = useState<PlanX | null>(null)

  const rows = useMemo(() => plan.filter((p) => (!fEstado || p.estado === fEstado) && (!fEquipo || p.codigo_equipo === fEquipo)), [plan, fEstado, fEquipo])
  const horasMes = plan.reduce((s, p) => s + p.horasMes, 0)
  const esp = plan.reduce((s, p) => s + p.esperadas, 0)
  const ej = plan.reduce((s, p) => s + p.ejecutadas, 0)

  const fields: FieldDef[] = [
    { name: 'id', label: 'ID del plan', type: 'text', required: true, lockOnEdit: true, placeholder: 'PM-HC-13' },
    { name: 'codigo_equipo', label: 'Equipo', type: 'select', required: true, options: (db?.equipos ?? []).map((e) => ({ value: e.id, label: `${e.id} · ${e.nombre}` })) },
    { name: 'actividad', label: 'Actividad', type: 'text', required: true, full: true },
    { name: 'descripcion', label: 'Descripción', type: 'textarea', full: true },
    { name: 'frecuencia', label: 'Frecuencia', type: 'select', required: true, options: FRECUENCIAS.map((f) => f.nombre) },
    { name: 'responsable', label: 'Responsable', type: 'text', placeholder: 'Mecánico + Eléctrico' },
    { name: 'duracion_h', label: 'Duración (h)', type: 'number', min: 0 },
    { name: 'costo_insumos', label: 'Costo de insumos por ejecución (COP)', type: 'number', min: 0 },
    { name: 'fecha_inicio', label: 'Fecha de inicio', type: 'date', required: true, help: 'Primera fecha programada.' },
    { name: 'observaciones', label: 'Observaciones', type: 'textarea', full: true },
  ]

  const nextId = (eq: string | null) => {
    if (!eq) return ''
    const pref = `PM-${eq.split('-')[0]}-`
    const max = plan.filter((p) => p.id.startsWith(pref)).map((p) => Number(p.id.slice(pref.length)) || 0).reduce((a, b) => Math.max(a, b), 0)
    return `${pref}${String(max + 1).padStart(2, '0')}`
  }

  const save = async (v: Values) => {
    const row = v as Row
    if (isEdit) { const { id, ...patch } = row; return update('plan', id, patch) }
    return insert('plan', row)
  }

  const columns: Column<PlanX>[] = [
    { key: 'id', header: 'ID', mono: true },
    { key: 'equipoNombre', header: 'Equipo' },
    { key: 'actividad', header: 'Actividad', render: (p) => <span className="line-clamp-2">{p.actividad}</span> },
    { key: 'frecuencia', header: 'Frecuencia' },
    { key: 'duracion_h', header: 'Duración', align: 'right', render: (p) => `${num(p.duracion_h, 1)} h` },
    { key: 'ultima', header: 'Última', render: (p) => fecha(p.ultima) },
    { key: 'proxima', header: 'Próxima', render: (p) => fecha(p.proxima) },
    { key: 'diasRestantes', header: 'Días', align: 'right', render: (p) => p.diasRestantes === null ? '—' : <span className={p.diasRestantes < 0 ? 'text-bad font-semibold' : ''}>{p.diasRestantes}</span> },
    { key: 'estado', header: 'Estado', render: (p) => <Badge v={p.estado} /> },
    { key: 'cumplimiento', header: 'Cumplim.', align: 'right', render: (p) => (p.cumplimiento === null ? '—' : pct(p.cumplimiento, 0)) },
  ]

  return (
    <>
      <PageHeader title="Plan de mantenimiento preventivo" subtitle="Actividades del cronograma. La próxima fecha se recalcula al cerrar una OT preventiva con su ID de plan."
        actions={<Button variant="primary" icon="plus" onClick={() => { setIsEdit(false); setEditing({ frecuencia: 'Mensual', fecha_inicio: todayISO() }) }}>Nueva actividad</Button>} />
      <section className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
        <StatCard label="Actividades" value={plan.length} note={`${num(horasMes, 1)} h de mantenimiento al mes`} />
        <StatCard label="Vencidas" value={plan.filter((p) => p.estado === 'Vencido').length} noteTone="warn" note="Requieren programación" />
        <StatCard label="Próximas" value={plan.filter((p) => p.estado === 'Próximo').length} note="Dentro del aviso" />
        <StatCard label="Cumplimiento" value={pct(esp ? ej / esp : 0)} note={`${ej} de ${esp} ejecuciones esperadas`} />
        <StatCard label="Costo mensual de insumos" value={cop(plan.reduce((s, p) => s + (p.costo_insumos ?? 0) * p.porMes, 0))} note="Estimado según frecuencias" />
      </section>
      <Card>
        <DataTable rows={rows} columns={columns} initialSort={{ key: 'diasRestantes', dir: 1 }}
          search={(p) => `${p.id} ${p.equipoNombre} ${p.actividad} ${p.responsable ?? ''}`}
          onRowClick={(p) => { setIsEdit(true); setEditing({ ...(db?.plan.find((x) => x.id === p.id) as unknown as Values) }) }}
          toolbar={<>
            <FilterSelect label="Estado" value={fEstado} onChange={setFEstado} options={['Vencido', 'Próximo', 'Al día', 'Por evento']} />
            <FilterSelect label="Equipo" value={fEquipo} onChange={setFEquipo} options={(db?.equipos ?? []).map((e) => ({ value: e.id, label: e.nombre }))} />
          </>}
          actions={(p) => <>
            {p.frecDias > 0 && <Button className="h-9 px-3 text-xs" onClick={() => nav(`/ordenes?plan=${p.id}`)}>Registrar ejecución</Button>}
            <IconButton icon="edit" label={`Editar ${p.id}`} onClick={() => { setIsEdit(true); setEditing({ ...(db?.plan.find((x) => x.id === p.id) as unknown as Values) }) }} />
            <IconButton icon="trash" label={`Eliminar ${p.id}`} tone="danger" onClick={() => setDeleting(p)} />
          </>} />
      </Card>
      {editing && (
        <FormModal title={isEdit ? `Actividad ${editing.id}` : 'Nueva actividad preventiva'} fields={fields} initial={editing} isEdit={isEdit} onSubmit={save} onClose={() => setEditing(null)}
          onChangeValues={(v, k) => (k === 'codigo_equipo' && !isEdit ? { ...v, id: nextId(v.codigo_equipo as string) } : v)} />
      )}
      {deleting && (
        <Confirm title="Eliminar actividad" onClose={() => setDeleting(null)} onConfirm={async () => { await remove('plan', deleting.id) }}
          text={<>¿Eliminar <b>{deleting.id}</b> · {deleting.actividad}? Las {ordenes.filter((o) => o.id_plan === deleting.id).length} órdenes vinculadas se conservan, pero quedan sin plan.</>} />
      )}
    </>
  )
}
