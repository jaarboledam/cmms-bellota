import { useMemo, useState } from 'react'
import { useData } from '../lib/DataContext'
import { SUBSISTEMAS, type RepuestoX } from '../lib/calc'
import { cop, num } from '../lib/format'
import { Button, Card, Confirm, DataTable, FilterSelect, FormModal, IconButton, PageHeader, StatCard, type Column, type FieldDef, type Values } from '../components/ui'
import { Badge } from '../components/badges'
import type { Row } from '../lib/types'

export function Repuestos() {
  const { db, repuestos, insert, update, remove } = useData()
  const [fEstado, setFEstado] = useState('')
  const [editing, setEditing] = useState<Values | null>(null)
  const [isEdit, setIsEdit] = useState(false)
  const [deleting, setDeleting] = useState<RepuestoX | null>(null)
  const rows = useMemo(() => repuestos.filter((r) => !fEstado || r.estadoStock === fEstado), [repuestos, fEstado])

  const fields: FieldDef[] = [
    { name: 'id', label: 'Código', type: 'text', required: true, lockOnEdit: true },
    { name: 'descripcion', label: 'Descripción', type: 'text', required: true },
    { name: 'codigo_equipo', label: 'Equipo asociado', type: 'select', options: (db?.equipos ?? []).map((e) => ({ value: e.id, label: `${e.id} · ${e.nombre}` })) },
    { name: 'subsistema', label: 'Sub-sistema', type: 'select', options: SUBSISTEMAS },
    { name: 'unidad', label: 'Unidad', type: 'text', placeholder: 'und, kit, caneca…' },
    { name: 'costo_unitario', label: 'Costo unitario (COP)', type: 'number', min: 0, required: true },
    { name: 'stock_actual', label: 'Stock actual', type: 'number', min: 0, required: true },
    { name: 'stock_minimo', label: 'Stock mínimo', type: 'number', min: 0, required: true },
  ]
  const nextId = () => {
    const max = repuestos.map((r) => Number(r.id.replace(/\D/g, '')) || 0).reduce((a, b) => Math.max(a, b), 0)
    return `REP-${String(max + 1).padStart(3, '0')}`
  }
  const save = async (v: Values) => {
    const row = v as Row
    if (isEdit) { const { id, ...patch } = row; return update('repuestos', id, patch) }
    return insert('repuestos', row)
  }

  const columns: Column<RepuestoX>[] = [
    { key: 'id', header: 'Código', mono: true },
    { key: 'descripcion', header: 'Descripción' },
    { key: 'equipoNombre', header: 'Equipo' },
    { key: 'stock_actual', header: 'Stock', align: 'right', render: (r) => `${num(r.stock_actual)} ${r.unidad ?? ''}` },
    { key: 'stock_minimo', header: 'Mínimo', align: 'right', render: (r) => num(r.stock_minimo) },
    { key: 'costo_unitario', header: 'Costo unit.', align: 'right', render: (r) => cop(r.costo_unitario) },
    { key: 'valor', header: 'Valor inventario', align: 'right', render: (r) => cop(r.valor) },
    { key: 'estadoStock', header: 'Estado', render: (r) => <Badge v={r.estadoStock} /> },
    { key: 'aPedir', header: 'A pedir', align: 'right', render: (r) => (r.aPedir ? <b>{num(r.aPedir)}</b> : '0') },
  ]

  return (
    <>
      <PageHeader title="Repuestos" subtitle="Stock de repuestos críticos con alertas de reposición (cantidad a pedir = 2 × mínimo − stock)."
        actions={<Button variant="primary" icon="plus" onClick={() => { setIsEdit(false); setEditing({ id: nextId(), stock_actual: 0, stock_minimo: 1 }) }}>Nuevo repuesto</Button>} />
      <section className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
        <StatCard label="Referencias" value={repuestos.length} />
        <StatCard label="Agotados" value={repuestos.filter((r) => r.estadoStock === 'Agotado').length} noteTone="warn" note="Stock en cero" />
        <StatCard label="Por reponer" value={repuestos.filter((r) => r.estadoStock === 'Reponer').length} note="En o bajo el mínimo" />
        <StatCard label="Valor del inventario" value={cop(repuestos.reduce((s, r) => s + r.valor, 0))} />
      </section>
      <Card>
        <DataTable rows={rows} columns={columns} search={(r) => `${r.id} ${r.descripcion} ${r.equipoNombre}`}
          onRowClick={(r) => { setIsEdit(true); setEditing({ ...(db?.repuestos.find((x) => x.id === r.id) as unknown as Values) }) }}
          toolbar={<FilterSelect label="Estado" value={fEstado} onChange={setFEstado} options={['Agotado', 'Reponer', 'OK']} />}
          actions={(r) => <>
            <IconButton icon="edit" label={`Editar ${r.descripcion}`} onClick={() => { setIsEdit(true); setEditing({ ...(db?.repuestos.find((x) => x.id === r.id) as unknown as Values) }) }} />
            <IconButton icon="trash" label={`Eliminar ${r.descripcion}`} tone="danger" onClick={() => setDeleting(r)} />
          </>} />
      </Card>
      {editing && <FormModal title={isEdit ? `Repuesto ${editing.id}` : 'Nuevo repuesto'} fields={fields} initial={editing} isEdit={isEdit} onSubmit={save} onClose={() => setEditing(null)} />}
      {deleting && <Confirm title="Eliminar repuesto" onClose={() => setDeleting(null)} onConfirm={async () => { await remove('repuestos', deleting.id) }} text={<>¿Eliminar <b>{deleting.descripcion}</b> ({deleting.id})?</>} />}
    </>
  )
}
