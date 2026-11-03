import { useState } from 'react'
import { useData } from '../lib/DataContext'
import { ESPECIALIDADES, tarifaGeneral, type TecnicoX } from '../lib/calc'
import { cop, num } from '../lib/format'
import { Button, Card, Confirm, DataTable, FormModal, IconButton, PageHeader, type Column, type FieldDef, type Values } from '../components/ui'
import type { Row } from '../lib/types'

export function Tecnicos() {
  const { db, tecnicos, ordenes, insert, update, remove, params } = useData()
  const [editing, setEditing] = useState<Values | null>(null)
  const [isEdit, setIsEdit] = useState(false)
  const [deleting, setDeleting] = useState<TecnicoX | null>(null)
  const tg = tarifaGeneral(params)

  const fields: FieldDef[] = [
    { name: 'id', label: 'ID', type: 'text', required: true, lockOnEdit: true, placeholder: 'MEC-12' },
    { name: 'nombre', label: 'Nombre', type: 'text', required: true },
    { name: 'especialidad', label: 'Especialidad', type: 'select', options: ESPECIALIDADES },
    { name: 'turno', label: 'Turno', type: 'select', options: ['Turno 1', 'Turno 2', 'Turno 3', 'Administrativo'] },
    { name: 'tarifa_hora', label: 'Tarifa por hora (COP)', type: 'number', min: 0, help: `Vacío = tarifa general (${cop(tg)}).` },
  ]
  const save = async (v: Values) => {
    const row = v as Row
    if (isEdit) { const { id, ...patch } = row; return update('tecnicos', id, patch) }
    return insert('tecnicos', row)
  }
  const nOT = deleting ? ordenes.filter((o) => o.tecnico === deleting.id).length : 0

  const columns: Column<TecnicoX>[] = [
    { key: 'id', header: 'ID', mono: true },
    { key: 'nombre', header: 'Nombre' },
    { key: 'especialidad', header: 'Especialidad' },
    { key: 'turno', header: 'Turno' },
    { key: 'tarifa', header: 'Tarifa hora', align: 'right', render: (t) => cop(t.tarifa) },
    { key: 'otPeriodo', header: 'OT (periodo)', align: 'right', render: (t) => num(t.otPeriodo) },
    { key: 'horasHombre', header: 'Horas-hombre', align: 'right', render: (t) => num(t.horasHombre, 1) },
    { key: 'costoMO', header: 'Costo MO', align: 'right', render: (t) => cop(t.costoMO) },
    { key: 'otAbiertas', header: 'OT abiertas', align: 'center', render: (t) => (t.otAbiertas ? <b className="text-warn">{t.otAbiertas}</b> : '0') },
  ]

  return (
    <>
      <PageHeader title="Técnicos" subtitle="Personal de mantenimiento, tarifa y carga de trabajo del periodo."
        actions={<Button variant="primary" icon="plus" onClick={() => { setIsEdit(false); setEditing({ especialidad: 'Mecánico', turno: 'Turno 1' }) }}>Nuevo técnico</Button>} />
      <Card>
        <DataTable rows={tecnicos} columns={columns} search={(t) => `${t.id} ${t.nombre} ${t.especialidad ?? ''}`}
          onRowClick={(t) => { setIsEdit(true); setEditing({ ...(db?.tecnicos.find((x) => x.id === t.id) as unknown as Values) }) }}
          actions={(t) => <>
            <IconButton icon="edit" label={`Editar ${t.nombre}`} onClick={() => { setIsEdit(true); setEditing({ ...(db?.tecnicos.find((x) => x.id === t.id) as unknown as Values) }) }} />
            <IconButton icon="trash" label={`Eliminar ${t.nombre}`} tone="danger" onClick={() => setDeleting(t)} />
          </>} />
      </Card>
      {editing && <FormModal title={isEdit ? `Técnico ${editing.id}` : 'Nuevo técnico'} fields={fields} initial={editing} isEdit={isEdit} onSubmit={save} onClose={() => setEditing(null)} />}
      {deleting && <Confirm title="Eliminar técnico" onClose={() => setDeleting(null)} onConfirm={async () => { await remove('tecnicos', deleting.id) }}
        text={<>¿Eliminar a <b>{deleting.nombre}</b>?{nOT > 0 && <> Sus {num(nOT)} órdenes se conservan, pero quedan sin técnico asignado.</>}</>} />}
    </>
  )
}
