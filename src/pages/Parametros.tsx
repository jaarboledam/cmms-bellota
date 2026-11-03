import { useEffect, useState } from 'react'
import { useData } from '../lib/DataContext'
import { tarifaGeneral } from '../lib/calc'
import { cop } from '../lib/format'
import { Button, Card, Confirm, Field, PageHeader, type FieldDef } from '../components/ui'
import type { ParamValor, Row } from '../lib/types'

const FIELDS: FieldDef[] = [
  { name: 'horas_semana', label: 'Horas de operación por semana', type: 'number', min: 1, help: '3 turnos × 42 h = 126 h. Base del MTBF y la disponibilidad.' },
  { name: 'meta_disp', label: 'Meta de disponibilidad (0 a 1)', type: 'number', min: 0, max: 1, step: 0.01, help: '0,9 = 90 %' },
  { name: 'salario_tecnico', label: 'Salario mensual por técnico (COP)', type: 'number', min: 0 },
  { name: 'horas_mes_tecnico', label: 'Horas de trabajo al mes por técnico', type: 'number', min: 1, help: '42 h × 52 semanas / 12 = 182 h' },
  { name: 'valor_cuchilla', label: 'Valor comercial de una cuchilla (COP)', type: 'number', min: 0 },
  { name: 'inicio_plan', label: 'Inicio del plan preventivo', type: 'date' },
  { name: 'pct_desp_corr', label: '% de fallas con desperdicio (correctivo, 0 a 1)', type: 'number', min: 0, max: 1, step: 0.01 },
  { name: 'pct_desp_prev', label: '% de fallas con desperdicio (preventivo, 0 a 1)', type: 'number', min: 0, max: 1, step: 0.01 },
]

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function Parametros() {
  const { db, params, insert, update, restoreSeed, mode, ordenes } = useData()
  const [v, setV] = useState<ParamValor>(params)
  const [confirm, setConfirm] = useState(false)
  useEffect(() => setV(params), [params])

  const save = async () => {
    const exists = db?.parametros.some((p) => p.id === 'general')
    const row = { id: 'general', valor: v } as unknown as Row
    if (exists) await update('parametros', 'general', { valor: v } as unknown as Partial<Row>)
    else await insert('parametros', row)
  }

  const csv = () => {
    const cols = ['id', 'fecha_solicitud', 'codigo_equipo', 'equipoNombre', 'tipo', 'id_plan', 'motivo', 'causa', 'subsistema', 'prioridad', 'tecnico', 'estado', 'fecha_inicio', 'hora_inicio', 'fecha_fin', 'hora_fin', 'horasParo', 'horas_hombre', 'costoMO', 'costo_repuestos', 'costoTotal', 'cumplimientoSla']
    const esc = (x: unknown) => { const s = x === null || x === undefined ? '' : String(x); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
    const lines = [cols.join(';'), ...ordenes.map((o) => cols.map((c) => esc((o as unknown as Record<string, unknown>)[c])).join(';'))]
    download('ordenes_de_trabajo.csv', '﻿' + lines.join('\n'), 'text/csv;charset=utf-8')
  }

  return (
    <>
      <PageHeader title="Parámetros y datos" subtitle="Supuestos del sistema, listas de prioridad y copias de seguridad." />
      <Card title="Supuestos generales">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-5 pb-5">
          {FIELDS.map((f) => (
            <Field key={f.name} f={f} value={(v as unknown as Record<string, unknown>)[f.name]} onChange={(x) => setV({ ...v, [f.name]: x } as ParamValor)} />
          ))}
          <div className="sm:col-span-2 text-sm text-muted">Costo salarial por hora resultante: <b className="text-ink">{cop(tarifaGeneral(v))}</b></div>
        </div>
      </Card>
      <Card title="Prioridades y tiempo de atención (SLA)">
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(180px,1fr))] px-5 pb-5">
          {v.prioridades.map((p, i) => (
            <Field key={p.nombre} f={{ name: p.nombre, label: `${p.nombre} · días`, type: 'number', min: 0 }} value={p.sla}
              onChange={(x) => setV({ ...v, prioridades: v.prioridades.map((q, j) => (j === i ? { ...q, sla: Number(x) || 0 } : q)) })} />
          ))}
        </div>
      </Card>
      <div className="flex justify-end"><Button variant="primary" icon="check" onClick={save}>Guardar parámetros</Button></div>

      <Card title="Copias y datos">
        <div className="flex flex-wrap gap-3 px-5 pb-5">
          <Button icon="download" onClick={() => db && download('cmms_bellota_respaldo.json', JSON.stringify(db, null, 1), 'application/json')}>Descargar copia completa (JSON)</Button>
          <Button icon="download" onClick={csv}>Descargar órdenes (CSV para Excel)</Button>
          <Button variant="danger" icon="refresh" onClick={() => setConfirm(true)}>{mode === 'local' ? 'Restablecer datos del proyecto' : 'Cargar datos del proyecto en Supabase'}</Button>
        </div>
        <p className="text-xs text-muted px-5 pb-4 m-0">
          {mode === 'local'
            ? 'Modo demostración: los cambios se guardan solo en este navegador. Conecta Supabase para compartir los datos entre usuarios.'
            : 'Conectado a Supabase: los datos se comparten con todos los usuarios que inicien sesión.'}
        </p>
      </Card>
      {confirm && (
        <Confirm title="Cargar datos del proyecto" confirmLabel="Sí, reemplazar" onClose={() => setConfirm(false)} onConfirm={async () => { await restoreSeed() }}
          text="Se borran todos los datos actuales y se cargan los del Excel del proyecto (5 equipos, 1.235 órdenes, 51 actividades del plan, 50 modos de falla, 16 repuestos y 12 técnicos). ¿Continuar?" />
      )}
    </>
  )
}
