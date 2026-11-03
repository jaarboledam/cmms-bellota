import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../lib/DataContext'
import type { EquipoX } from '../lib/calc'
import { cop, horas, num, pct } from '../lib/format'
import { Button, Card, Confirm, DataTable, FormModal, IconButton, Modal, PageHeader, type Column, type FieldDef, type Values } from '../components/ui'
import { Badge } from '../components/badges'
import type { Row } from '../lib/types'

export const EQUIPO_FIELDS: FieldDef[] = [
  { name: 'id', label: 'Código', type: 'text', required: true, lockOnEdit: true, placeholder: 'BS-02' },
  { name: 'nombre', label: 'Equipo', type: 'text', required: true },
  { name: 'nombre_planta', label: 'Nombre en planta', type: 'text' },
  { name: 'linea', label: 'Línea', type: 'text' },
  { name: 'seccion', label: 'Sección', type: 'text' },
  { name: 'tipo', label: 'Tipo de equipo', type: 'text' },
  { name: 'fabricante', label: 'Fabricante', type: 'text' },
  { name: 'modelo', label: 'Modelo', type: 'text' },
  { name: 'activo_fijo', label: 'N° activo fijo', type: 'text' },
  { name: 'fecha_creacion', label: 'Fecha de creación', type: 'date' },
  { name: 'capacidad', label: 'Capacidad', type: 'text', full: true },
  { name: 'fuente_trabajo', label: 'Fuente de trabajo', type: 'text', full: true },
  { name: 'probabilidad', label: 'Probabilidad (1-5)', type: 'number', min: 1, max: 5, step: 1, help: 'Matriz de riesgos' },
  { name: 'consecuencia', label: 'Consecuencia (1-5)', type: 'number', min: 1, max: 5, step: 1 },
  { name: 'repuestos_promedio', label: 'Repuestos promedio por correctivo (COP)', type: 'number', min: 0 },
  { name: 'presupuesto_preventivo', label: 'Presupuesto preventivo anual (COP)', type: 'number', min: 0 },
]

export function Equipos() {
  const { db, equipos, ordenes, insert, update, remove } = useData()
  const [editing, setEditing] = useState<Values | null>(null)
  const [isEdit, setIsEdit] = useState(false)
  const [deleting, setDeleting] = useState<EquipoX | null>(null)

  const open = (e?: EquipoX) => {
    setIsEdit(!!e)
    setEditing(e ? { ...(db?.equipos.find((x) => x.id === e.id) as unknown as Values) } : { linea: 'Cuchillas' })
  }
  const save = async (v: Values) => {
    const row = v as Row
    if (isEdit) { const { id, ...patch } = row; return update('equipos', id, patch) }
    return insert('equipos', row)
  }
  const validate = (v: Values) => {
    for (const k of ['probabilidad', 'consecuencia']) {
      const n = v[k] as number | null
      if (n !== null && (n < 1 || n > 5 || !Number.isInteger(n))) return 'Probabilidad y consecuencia deben ser enteros entre 1 y 5.'
    }
    return null
  }
  const nOT = deleting ? ordenes.filter((o) => o.codigo_equipo === deleting.id).length : 0

  const columns: Column<EquipoX>[] = [
    { key: 'id', header: 'Código', mono: true },
    { key: 'nombre', header: 'Equipo', render: (e) => <Link to={`/hoja-de-vida?equipo=${e.id}`} className="text-info font-medium">{e.nombre}</Link> },
    { key: 'seccion', header: 'Sección' },
    { key: 'indice', header: 'P×C', align: 'center' },
    { key: 'nivel', header: 'Criticidad', render: (e) => <Badge v={e.nivel} /> },
    { key: 'fallas', header: 'Fallas', align: 'right', render: (e) => num(e.fallas) },
    { key: 'horasParo', header: 'Paro', align: 'right', render: (e) => horas(e.horasParo) },
    { key: 'mtbf', header: 'MTBF', align: 'right', render: (e) => horas(e.mtbf) },
    { key: 'mttr', header: 'MTTR', align: 'right', render: (e) => horas(e.mttr) },
    { key: 'disponibilidad', header: 'Disponib.', align: 'right', render: (e) => <span className={e.disponibilidad < 0.9 ? 'text-warn font-semibold' : ''}>{pct(e.disponibilidad)}</span> },
    { key: 'costo', header: 'Costo', align: 'right', render: (e) => cop(e.costo) },
    { key: 'planesVencidos', header: 'Planes venc.', align: 'center', render: (e) => (e.planesVencidos ? <span className="text-bad font-semibold">{e.planesVencidos}</span> : '0') },
    { key: 'estadoOperativo', header: 'Estado', render: (e) => <Badge v={e.estadoOperativo} /> },
  ]

  return (
    <>
      <PageHeader title="Inventario de equipos" subtitle="Activos de la línea con su criticidad e indicadores del periodo de análisis."
        actions={<Button variant="primary" icon="plus" onClick={() => open()}>Nuevo equipo</Button>} />
      <Card>
        <DataTable rows={equipos} columns={columns} search={(e) => `${e.id} ${e.nombre} ${e.seccion ?? ''} ${e.tipo ?? ''}`} onRowClick={(e) => open(e)}
          actions={(e) => <>
            <IconButton icon="edit" label={`Editar ${e.nombre}`} onClick={() => open(e)} />
            <IconButton icon="trash" label={`Eliminar ${e.nombre}`} tone="danger" onClick={() => setDeleting(e)} />
          </>} />
      </Card>
      {editing && <FormModal title={isEdit ? `Equipo ${editing.id}` : 'Nuevo equipo'} fields={EQUIPO_FIELDS} initial={editing} isEdit={isEdit} onSubmit={save} onClose={() => setEditing(null)} validate={validate} />}
      {deleting && (nOT > 0 ? (
        <Modal title="No se puede eliminar" onClose={() => setDeleting(null)} footer={<Button onClick={() => setDeleting(null)}>Entendido</Button>}>
          <p className="text-sm m-0">El equipo <b>{deleting.nombre}</b> tiene {num(nOT)} órdenes de trabajo registradas. Para conservar el historial no se puede eliminar.</p>
        </Modal>
      ) : (
        <Confirm title="Eliminar equipo" onClose={() => setDeleting(null)} onConfirm={async () => { await remove('equipos', deleting.id) }}
          text={<>¿Eliminar <b>{deleting.nombre}</b>? También se eliminan sus modos de falla y actividades del plan; los repuestos quedan sin equipo.</>} />
      ))}
    </>
  )
}
