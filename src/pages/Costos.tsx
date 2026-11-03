import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../lib/DataContext'
import { comparativaCostos, costoRealDesdePlan } from '../lib/calc'
import { cop, fecha, num, pct } from '../lib/format'
import { Card, PageHeader, StatCard } from '../components/ui'

export function Costos() {
  const { db, ordenes, plan, params } = useData()
  const years = useMemo(() => [...new Set(ordenes.map((o) => Number(o.fecha_solicitud.slice(0, 4))))].sort(), [ordenes])
  const [anio, setAnio] = useState(2025)
  const c = useMemo(() => (db ? comparativaCostos(db, ordenes, plan, anio) : null), [db, ordenes, plan, anio])
  const real = useMemo(() => (db ? costoRealDesdePlan(db, ordenes) : []), [db, ordenes])
  if (!c) return null
  const chart = [
    { comp: 'Mano de obra', Correctivo: c.moCorr, Preventivo: c.moPrev },
    { comp: 'Insumos y repuestos', Correctivo: c.repCorr, Preventivo: c.repPrev },
    { comp: 'Desperdicio', Correctivo: c.despCorr, Preventivo: c.despPrev },
  ]
  return (
    <>
      <PageHeader title="Costos: correctivo vs. preventivo" subtitle="Réplica del Anexo #4 calculada con los datos del CMMS."
        actions={
          <label className="flex items-center gap-2 text-sm">Año de análisis
            <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className="h-11 rounded-lg border border-[#cfd4da] bg-white px-3">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>} />
      <section className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        <StatCard label="Escenario correctivo" value={cop(c.totCorr)} note={`${num(c.eventos)} fallas · ${num(c.horas)} h de paro`} />
        <StatCard label="Escenario preventivo" value={cop(c.totPrev)} note={`${num(c.horasMesPlan, 1)} h/mes de plan`} />
        <StatCard label="Ahorro estimado" value={cop(c.ahorro)} noteTone={c.ahorro > 0 ? 'good' : 'warn'} note={`Mejora de ${pct(c.mejora, 2)}`} />
        <StatCard label="Costo por hora técnico" value={cop(c.tarifa)} note={`Salario ${cop(params.salario_tecnico)} / ${num(params.horas_mes_tecnico, 0)} h`} />
      </section>
      <div className="flex flex-wrap gap-4">
        <Card title="Comparación consolidada" className="flex-[1_1_440px]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead><tr className="bg-[#f7f8fa] text-left text-muted text-xs uppercase"><th className="pl-5 px-3 py-2.5">Concepto</th><th className="px-3 py-2.5 text-right">Correctivo</th><th className="px-3 pr-5 py-2.5 text-right">Preventivo</th></tr></thead>
              <tbody>
                {chart.map((r) => (
                  <tr key={r.comp} className="border-t border-line-soft"><td className="pl-5 px-3 py-2.5">{r.comp}</td><td className="px-3 py-2.5 text-right tabular-nums">{cop(r.Correctivo)}</td><td className="px-3 pr-5 py-2.5 text-right tabular-nums">{cop(r.Preventivo)}</td></tr>
                ))}
                <tr className="border-t-2 border-line font-bold"><td className="pl-5 px-3 py-2.5">Total</td><td className="px-3 py-2.5 text-right tabular-nums">{cop(c.totCorr)}</td><td className="px-3 pr-5 py-2.5 text-right tabular-nums">{cop(c.totPrev)}</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted px-5 py-3 m-0 leading-relaxed">
            Mano de obra correctiva = horas de paro × costo hora. Preventiva = horas mensuales del plan × costo hora × 12.
            Desperdicio = fallas × {pct(params.pct_desp_corr, 0)} (correctivo) o {pct(params.pct_desp_prev, 0)} (preventivo) × {cop(params.valor_cuchilla)} por cuchilla.
          </p>
        </Card>
        <Card title="Por componente" className="flex-[1_1_380px]">
          <div className="h-72 px-2 pb-4">
            <ResponsiveContainer>
              <BarChart data={chart} margin={{ left: 10, right: 10 }}>
                <CartesianGrid stroke="#eef0f3" vertical={false} />
                <XAxis dataKey="comp" tick={{ fontSize: 12, fill: '#5b6470' }} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1e6)} M`} tick={{ fontSize: 12, fill: '#5b6470' }} width={50} />
                <Tooltip formatter={(v) => cop(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Bar dataKey="Correctivo" fill="#b3122e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Preventivo" fill="#1d4e89" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card title="Insumos y repuestos por equipo">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[640px]">
            <thead><tr className="bg-[#f7f8fa] text-left text-muted text-xs uppercase">{['Equipo', 'Fallas', 'Repuesto promedio', 'Total correctivo', 'Presupuesto preventivo'].map((h, i) => <th key={h} className={`px-3 first:pl-5 py-2.5 ${i ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
            <tbody>
              {c.porEquipo.map((e) => (
                <tr key={e.id} className="border-t border-line-soft">
                  <td className="pl-5 px-3 py-2.5">{e.nombre}</td><td className="px-3 py-2.5 text-right">{num(e.eventos)}</td><td className="px-3 py-2.5 text-right">{cop(e.promedio)}</td>
                  <td className="px-3 py-2.5 text-right">{cop(e.totalCorr)}</td><td className="px-3 pr-5 py-2.5 text-right">{cop(e.presupuestoPrev)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title={`Costo real registrado desde el inicio del plan (${fecha(params.inicio_plan)})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[600px]">
            <thead><tr className="bg-[#f7f8fa] text-left text-muted text-xs uppercase">{['Tipo', 'N° OT', 'Horas-hombre', 'Mano de obra', 'Repuestos', 'Total'].map((h, i) => <th key={h} className={`px-3 first:pl-5 py-2.5 ${i ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
            <tbody>
              {real.map((r) => (
                <tr key={r.tipo} className="border-t border-line-soft">
                  <td className="pl-5 px-3 py-2.5">{r.tipo}</td><td className="px-3 py-2.5 text-right">{num(r.n)}</td><td className="px-3 py-2.5 text-right">{num(r.hh, 1)}</td>
                  <td className="px-3 py-2.5 text-right">{cop(r.mo)}</td><td className="px-3 py-2.5 text-right">{cop(r.rep)}</td><td className="px-3 pr-5 py-2.5 text-right font-semibold">{cop(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
