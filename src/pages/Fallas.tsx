import { useMemo, useState } from 'react'
import { useData } from '../lib/DataContext'
import type { FallaX } from '../lib/calc'
import { num, pct } from '../lib/format'
import { Button, Card, Confirm, DataTable, FilterSelect, FormModal, IconButton, PageHeader, type Column, type FieldDef, type Values } from '../components/ui'
import { CritDot } from '../components/badges'
import type { Row } from '../lib/types'

export function Fallas() {
  const { db, fallas, ordenes, insert, update, remove } = useData()
  const [fEquipo, setFEquipo] = useState('')
  const [editing, setEditing] = useState<Values | null>(null)
  const [isEdit, setIsEdit] = useState(false)
  const [deleting, setDeleting] = useState<FallaX | null>(null)
  const rows = useMemo(() => fallas.filter((f) => !fEquipo || f.codigo_equipo === fEquipo), [fallas, fEquipo])

  const fields: FieldDef[] = [
    { name: 'codigo_equipo', label: 'Equipo', type: 'select', required: true, options: (db?.equipos ?? []).map((e) => ({ value: e.id, label: `${e.id} · ${e.nombre}` })) },
    { name: 'motivo', label: 'Modo de falla', type: 'text', required: true, help: 'Debe escribirse igual que en las órdenes de trabajo.' },
    { name: 'criticidad', label: 'Criticidad (1-10)', type: 'number', min: 1, max: 10, step: 1, required: true },
  ]
  const nextId = () => {
    const max = (db?.fallas ?? []).map((f) => Number(f.id.replace(/\D/g, '')) || 0).reduce((a, b) => Math.max(a, b), 0)
    return `FM-${String(max + 1).padStart(3, '0')}`
  }
  const save = async (v: Values) => {
    if (isEdit) {
      const id = editing!.id as string
      const old = db?.fallas.find((f) => f.id === id)
      const ok = await update('fallas', id, v as Partial<Row>)
      // Si cambia el nombre del modo, se actualizan las OT que lo usan
      if (ok && old && (old.motivo !== v.motivo || old.codigo_equipo !== v.codigo_equipo)) {
        for (const o of ordenes.filter((x) => x.codigo_equipo === old.codigo_equipo && x.motivo === old.motivo && x.tipo === 'Correctivo')) {
          await update('ordenes', o.id, { codigo_equipo: v.codigo_equipo, motivo: v.motivo } as Partial<Row>)
        }
      }
      return ok
    }
    return insert('fallas', { id: nextId(), ...v } as Row)
  }
  const validate = (v: Values) => {
    const n = v.criticidad as number
    if (!Number.isInteger(n) || n < 1 || n > 10) return 'La criticidad debe ser un entero entre 1 y 10.'
    const dup = (db?.fallas ?? []).find((f) => f.codigo_equipo === v.codigo_equipo && f.motivo.toLowerCase() === String(v.motivo).toLowerCase() && f.id !== editing?.id)
    if (dup) return 'Ese modo de falla ya existe para el equipo.'
    return null
  }
  const usos = deleting ? ordenes.filter((o) => o.codigo_equipo === deleting.codigo_equipo && o.motivo === deleting.motivo).length : 0

  const columns: Column<FallaX>[] = [
    { key: 'ranking', header: '#', align: 'center', render: (f) => <span className={f.ranking <= 10 ? 'text-bad font-bold' : 'text-muted'}>{f.ranking}</span> },
    { key: 'equipoNombre', header: 'Equipo' },
    { key: 'motivo', header: 'Modo de falla' },
    { key: 'criticidad', header: 'Criticidad', align: 'center', render: (f) => <CritDot n={f.criticidad} /> },
    { key: 'eventos', header: 'Eventos', align: 'right', render: (f) => (
      <span className="inline-flex items-center gap-2 justify-end w-full"><span className="h-2 rounded-full bg-[#f4b183]" style={{ width: `${Math.min(80, f.eventos * 2)}px` }} />{f.eventos}</span>) },
    { key: 'horasParo', header: 'Horas paro', align: 'right', render: (f) => num(f.horasParo, 1) },
    { key: 'mttr', header: 'MTTR modo', align: 'right', render: (f) => `${num(f.mttr, 1)} h` },
    { key: 'pctEquipo', header: '% del equipo', align: 'right', render: (f) => pct(f.pctEquipo) },
  ]

  return (
    <>
      <PageHeader title="Catálogo de fallas" subtitle="Modos de falla por equipo con su criticidad. Eventos, horas y ranking se calculan desde las OT del periodo."
        actions={<Button variant="primary" icon="plus" onClick={() => { setIsEdit(false); setEditing({ codigo_equipo: fEquipo || null }) }}>Nuevo modo de falla</Button>} />
      <Card>
        <DataTable rows={rows} columns={columns} initialSort={{ key: 'ranking', dir: 1 }} pageSize={25} search={(f) => `${f.equipoNombre} ${f.motivo}`}
          onRowClick={(f) => { setIsEdit(true); setEditing({ id: f.id, codigo_equipo: f.codigo_equipo, motivo: f.motivo, criticidad: f.criticidad }) }}
          toolbar={<FilterSelect label="Equipo" value={fEquipo} onChange={setFEquipo} options={(db?.equipos ?? []).map((e) => ({ value: e.id, label: e.nombre }))} />}
          actions={(f) => <>
            <IconButton icon="edit" label={`Editar ${f.motivo}`} onClick={() => { setIsEdit(true); setEditing({ id: f.id, codigo_equipo: f.codigo_equipo, motivo: f.motivo, criticidad: f.criticidad }) }} />
            <IconButton icon="trash" label={`Eliminar ${f.motivo}`} tone="danger" onClick={() => setDeleting(f)} />
          </>} />
      </Card>
      {editing && <FormModal title={isEdit ? 'Editar modo de falla' : 'Nuevo modo de falla'} fields={fields} initial={editing} isEdit={isEdit} onSubmit={save} onClose={() => setEditing(null)} validate={validate} />}
      {deleting && (
        <Confirm title="Eliminar modo de falla" onClose={() => setDeleting(null)} onConfirm={async () => { await remove('fallas', deleting.id) }}
          text={<>¿Eliminar <b>{deleting.motivo}</b> de {deleting.equipoNombre}?{usos > 0 && <> Hay {usos} órdenes con este modo: se conservan, pero ya no mostrarán su criticidad.</>}</>} />
      )}
    </>
  )
}
