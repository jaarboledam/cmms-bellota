import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../lib/DataContext'
import { antesDespues, kpisGlobales } from '../lib/calc'
import { addMonths, monthKey } from '../lib/dates'
import { cop, copM, fecha, horas, mesCorto, num, pct } from '../lib/format'
import { Card, PageHeader, StatCard } from '../components/ui'
import { Badge } from '../components/badges'

export function Dashboard() {
  const { db, ordenes, plan, equipos, fallas, repuestos, periodo } = useData()
  const k = useMemo(() => (db ? kpisGlobales(db, ordenes, plan, equipos, repuestos, periodo) : null), [db, ordenes, plan, equipos, repuestos, periodo])
  const ad = useMemo(() => (db ? antesDespues(db, ordenes) : null), [db, ordenes])

  const tendencia = useMemo(() => {
    const start = monthKey(periodo.desde), end = monthKey(periodo.hasta)
    const rows: { mes: string; Correctivas: number; Preventivas: number }[] = []
    for (let m = start, i = 0; m <= end && i < 48; m = addMonths(m, 1), i++) {
      const os = ordenes.filter((o) => o.mes === m)
      rows.push({ mes: mesCorto(m), Correctivas: os.filter((o) => o.tipo === 'Correctivo').length, Preventivas: os.filter((o) => o.tipo === 'Preventivo').length })
    }
    return rows
  }, [ordenes, periodo])

  const pareto = useMemo(() => {
    const top = [...fallas].sort((a, b) => a.ranking - b.ranking).slice(0, 10)
    const total = fallas.reduce((s, f) => s + f.eventos, 0)
    let acc = 0
    return top.map((f) => {
      acc += f.eventos
      return { nombre: f.motivo, equipo: f.equipoNombre, eventos: f.eventos, acumulado: total ? Math.round((acc / total) * 1000) / 10 : 0 }
    })
  }, [fallas])

  if (!k || !ad) return null
  const estados = [
    { name: 'Pendiente', value: k.pendientes, color: '#c2410c' },
    { name: 'En proceso', value: k.enProceso, color: '#1d4e89' },
  ]
  const abiertas = ordenes.filter((o) => o.estado !== 'Completado').sort((a, b) => a.fecha_solicitud.localeCompare(b.fecha_solicitud))
  const preventivos = plan.filter((p) => p.estado === 'Vencido' || p.estado === 'Próximo').sort((a, b) => (a.diasRestantes ?? 0) - (b.diasRestantes ?? 0)).slice(0, 7)

  return (
    <>
      <PageHeader title="Dashboard de mantenimiento" subtitle={`Periodo ${fecha(periodo.desde)} – ${fecha(periodo.hasta)} · ${equipos.length} equipos · ${num(k.horasPeriodo)} h de operación por equipo`}
        actions={<Link to="/ordenes?nueva=1" className="inline-flex items-center gap-2 h-11 px-4 rounded-lg bg-accent text-white text-sm font-semibold no-underline hover:bg-accent-dark">+ Nueva orden</Link>} />

      <section aria-label="Indicadores" className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
        <StatCard label="OT del periodo" value={num(k.total)} note={`${num(k.correctivas)} correctivas · ${num(k.preventivas)} preventivas`} />
        <StatCard label="Disponibilidad promedio" value={pct(k.disponibilidad)} note={k.disponibilidad < k.metaDisp ? `Bajo la meta de ${pct(k.metaDisp, 0)}` : `Cumple la meta de ${pct(k.metaDisp, 0)}`} noteTone={k.disponibilidad < k.metaDisp ? 'warn' : 'good'} />
        <StatCard label="MTBF global" value={horas(k.mtbf)} note="Tiempo medio entre fallas" />
        <StatCard label="MTTR global" value={horas(k.mttr)} note="Tiempo medio de reparación" />
        <StatCard label="Cumplimiento del plan" value={pct(k.cumplimientoPlan)} note={`${k.planesVencidos} actividades vencidas`} noteTone={k.planesVencidos ? 'warn' : 'good'} />
        <StatCard label="Costo de mantenimiento" value={copM(k.costo)} note="COP en el periodo" />
        <StatCard label="OT abiertas" value={num(k.pendientes + k.enProceso)} note={`${k.pendientes} pendientes · ${k.enProceso} en proceso`} />
        <StatCard label="% preventivo" value={pct(k.pctPreventivo)} note={`Cumplimiento SLA ${pct(k.cumplimientoSla)}`} />
      </section>

      <div className="flex flex-wrap gap-4">
        <Card title="Disponibilidad por equipo" actions={<span className="text-xs text-muted">Meta {pct(k.metaDisp, 0)}</span>} className="flex-[1_1_420px]">
          <div className="px-5 pb-5 flex flex-col gap-3">
            {equipos.map((e) => (
              <div key={e.id} className="grid grid-cols-[minmax(120px,190px)_1fr_64px] gap-3 items-center text-sm">
                <Link to={`/hoja-de-vida?equipo=${e.id}`} className="text-ink no-underline hover:underline truncate">{e.nombre}</Link>
                <div className="h-2.5 bg-line-soft rounded-full overflow-hidden" role="img" aria-label={`${e.nombre}: ${pct(e.disponibilidad)}`}>
                  <div className="h-full rounded-full" style={{ width: `${Math.max(0, e.disponibilidad) * 100}%`, background: e.disponibilidad < k.metaDisp ? '#c2410c' : '#1d4e89' }} />
                </div>
                <span className="font-mono text-[13px] text-right">{pct(e.disponibilidad)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Preventivos vencidos y próximos" actions={<Link to="/plan" className="text-sm font-medium text-info">Ver plan</Link>} className="flex-[1_1_360px]">
          <ul className="list-none m-0 px-5 pb-3">
            {preventivos.length === 0 && <li className="text-sm text-muted py-4">Todo el plan está al día.</li>}
            {preventivos.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5 border-t border-line-soft">
                <Badge v={p.estado} />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{p.actividad}</span>
                  <span className="text-xs text-muted">{p.equipoNombre} · {p.estado === 'Vencido' ? `vencida desde ${fecha(p.proxima)}` : `programada ${fecha(p.proxima)}`}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4">
        <Card title="Correctivas vs. preventivas por mes" className="flex-[2_1_560px]">
          <div className="h-72 px-2 pb-4">
            <ResponsiveContainer>
              <LineChart data={tendencia} margin={{ left: 0, right: 16, top: 8 }}>
                <CartesianGrid stroke="#eef0f3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#5b6470' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 12, fill: '#5b6470' }} width={36} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Line type="monotone" dataKey="Correctivas" stroke="#b3122e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Preventivas" stroke="#1d4e89" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Antes vs. después del plan" className="flex-[1_1_300px]">
          <div className="px-5 pb-5 flex flex-col gap-3 text-sm">
            <div className="flex justify-between"><span className="text-muted">Fallas por semana antes</span><span className="font-semibold">{num(ad.tasaAntes, 1)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Fallas por semana con el plan</span><span className="font-semibold">{num(ad.tasaDesp, 1)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Semanas con el plan</span><span className="font-semibold">{num(ad.semDesp, 1)}</span></div>
            <div className="flex flex-col gap-1 bg-good-soft rounded-lg p-3 mt-1">
              <span className="text-good text-xs font-semibold">Reducción de la tasa de fallas</span>
              <span className="text-good text-3xl font-bold">{pct(ad.reduccion)}</span>
            </div>
            <div className="h-36">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={estados} dataKey="value" nameKey="name" innerRadius={34} outerRadius={56} paddingAngle={2}>
                    {estados.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} layout="vertical" align="right" verticalAlign="middle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Pareto: 10 modos de falla más frecuentes" actions={<Link to="/fallas" className="text-sm font-medium text-info">Ver catálogo</Link>}>
        <div className="h-80 px-2 pb-4">
          <ResponsiveContainer>
            <ComposedChart data={pareto} margin={{ left: 0, right: 8, top: 8, bottom: 40 }}>
              <CartesianGrid stroke="#eef0f3" vertical={false} />
              <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: '#5b6470' }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis yAxisId="l" tick={{ fontSize: 12, fill: '#5b6470' }} width={36} />
              <YAxis yAxisId="r" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 12, fill: '#5b6470' }} width={44} />
              <Tooltip formatter={(v, n) => (n === '% acumulado' ? `${v} %` : v)} labelFormatter={(l, p) => `${l} · ${p?.[0]?.payload?.equipo ?? ''}`} />
              <Legend wrapperStyle={{ fontSize: 13 }} verticalAlign="top" />
              <Bar yAxisId="l" dataKey="eventos" name="Eventos" fill="#c2410c" radius={[4, 4, 0, 0]} />
              <Line yAxisId="r" dataKey="acumulado" name="% acumulado" stroke="#1b1f24" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title={`Órdenes de trabajo abiertas (${abiertas.length})`} actions={<Link to="/ordenes" className="text-sm font-medium text-info">Ver todas</Link>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-[#f7f8fa] text-left text-muted text-xs uppercase tracking-wide">
                {['N° OT', 'Equipo', 'Tipo', 'Falla / actividad', 'Técnico', 'Estado', 'Días', 'SLA'].map((h) => <th key={h} scope="col" className="px-3 first:pl-5 py-2.5 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {abiertas.map((o) => (
                <tr key={o.id} className="border-t border-line-soft">
                  <td className="pl-5 px-3 py-2.5 font-mono text-[13px]"><Link to={`/ordenes?ot=${o.id}`} className="text-info">{o.id}</Link></td>
                  <td className="px-3 py-2.5">{o.equipoNombre}</td>
                  <td className="px-3 py-2.5"><Badge v={o.tipo} /></td>
                  <td className="px-3 py-2.5">{o.motivo}</td>
                  <td className="px-3 py-2.5">{o.tecnicoNombre || '—'}</td>
                  <td className="px-3 py-2.5"><Badge v={o.estado} /></td>
                  <td className="px-3 py-2.5 tabular-nums">{o.diasAbierta}</td>
                  <td className="px-3 py-2.5"><Badge v={o.cumplimientoSla} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {abiertas.length === 0 && <p className="text-sm text-muted text-center py-6">No hay órdenes abiertas.</p>}
        </div>
      </Card>
      <p className="text-xs text-muted m-0">Costo total del periodo: {cop(k.costo)} · Horas de paro: {num(k.horasParo, 1)} h · Repuestos por reponer: {k.repuestosReponer} · Equipo con más fallas: {k.equipoMasFallas}</p>
    </>
  )
}
