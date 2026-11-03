import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Icon } from './Icon'
import { useData } from '../lib/DataContext'

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/ordenes', label: 'Órdenes de trabajo', icon: 'ordenes', badge: 'ot' },
  { to: '/plan', label: 'Plan preventivo', icon: 'plan', badge: 'plan' },
  { to: '/equipos', label: 'Equipos', icon: 'equipos' },
  { to: '/hoja-de-vida', label: 'Hojas de vida', icon: 'hoja' },
  { to: '/fallas', label: 'Catálogo de fallas', icon: 'fallas' },
  { to: '/repuestos', label: 'Repuestos', icon: 'repuestos', badge: 'rep' },
  { to: '/tecnicos', label: 'Técnicos', icon: 'tecnicos' },
  { to: '/costos', label: 'Costos', icon: 'costos' },
  { to: '/parametros', label: 'Parámetros', icon: 'ajustes' },
]

export function Layout() {
  const { ordenes, plan, repuestos, periodo, setPeriodo, mode, session, signOut, toasts, loading } = useData()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const badges: Record<string, number> = {
    ot: ordenes.filter((o) => o.estado !== 'Completado').length,
    plan: plan.filter((p) => p.estado === 'Vencido').length,
    rep: repuestos.filter((r) => r.estadoStock !== 'OK').length,
  }
  const showPeriodo = ['/', '/equipos', '/fallas', '/tecnicos', '/hoja-de-vida'].includes(loc.pathname)

  const nav = (
    <nav aria-label="Módulos" className="flex flex-col gap-1">
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={() => setOpen(false)}
          className={({ isActive }) => `flex items-center gap-3 min-h-11 px-3 rounded-lg text-sm no-underline ${isActive ? 'bg-accent-soft text-accent font-semibold' : 'text-[#3a424c] hover:bg-line-soft'}`}>
          <Icon name={n.icon} />
          <span>{n.label}</span>
          {n.badge && badges[n.badge] > 0 && (
            <span className="ml-auto text-xs font-semibold bg-warn-soft text-warn rounded-full px-2 py-0.5">{badges[n.badge]}</span>
          )}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex flex-col w-[248px] shrink-0 bg-white border-r border-line px-4 py-6 gap-6 sticky top-0 h-screen overflow-y-auto">
        <Brand />
        {nav}
        <Footer mode={mode} email={session?.user.email} onSignOut={signOut} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden bg-[rgba(27,31,36,0.45)]" onClick={() => setOpen(false)}>
          <aside className="w-[264px] h-full bg-white px-4 py-6 flex flex-col gap-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <Brand />
            {nav}
            <Footer mode={mode} email={session?.user.email} onSignOut={signOut} />
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex flex-wrap items-center gap-3 px-4 sm:px-8 py-3 border-b border-line bg-white/80 backdrop-blur sticky top-0 z-30">
          <button type="button" className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg hover:bg-line-soft cursor-pointer" aria-label="Abrir menú" onClick={() => setOpen(true)}>
            <Icon name="menu" />
          </button>
          <span className="lg:hidden font-bold">CMMS Bellota</span>
          {showPeriodo && (
            <div className="flex flex-wrap items-center gap-2 ml-auto text-sm">
              <span className="text-muted">Periodo de análisis</span>
              <label className="sr-only" htmlFor="p-desde">Desde</label>
              <input id="p-desde" type="date" value={periodo.desde} onChange={(e) => e.target.value && setPeriodo({ ...periodo, desde: e.target.value })} className="h-10 rounded-lg border border-[#cfd4da] px-2 bg-white" />
              <span className="text-muted">a</span>
              <label className="sr-only" htmlFor="p-hasta">Hasta</label>
              <input id="p-hasta" type="date" value={periodo.hasta} onChange={(e) => e.target.value && setPeriodo({ ...periodo, hasta: e.target.value })} className="h-10 rounded-lg border border-[#cfd4da] px-2 bg-white" />
            </div>
          )}
          {loading && <span className="text-sm text-muted ml-auto">Cargando…</span>}
        </div>
        <main className="flex-1 px-4 sm:px-8 py-6 pb-12 flex flex-col gap-6 max-w-[1500px] w-full">
          <Outlet />
        </main>
      </div>

      <div aria-live="polite" className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={`rounded-lg px-4 py-3 text-sm shadow-lg font-medium ${t.kind === 'error' ? 'bg-bad text-white' : 'bg-ink text-white'}`}>{t.text}</div>
        ))}
      </div>
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="w-9 h-9 rounded-lg bg-accent text-white flex items-center justify-center font-bold text-[15px]">CM</div>
      <div className="flex flex-col leading-tight">
        <span className="font-bold text-[15px]">CMMS Bellota</span>
        <span className="text-xs text-muted">Línea de cuchillas</span>
      </div>
    </div>
  )
}

function Footer({ mode, email, onSignOut }: { mode: string; email?: string; onSignOut: () => void }) {
  return (
    <div className="mt-auto flex flex-col gap-2 px-2 text-xs text-muted">
      {mode === 'local' ? (
        <span className="bg-warn-soft text-warn rounded-lg px-3 py-2 leading-snug">Modo demostración: los datos se guardan en este navegador.</span>
      ) : (
        <>
          <span className="truncate">Sesión: {email}</span>
          <button type="button" onClick={onSignOut} className="inline-flex items-center gap-2 min-h-10 text-ink hover:text-accent cursor-pointer"><Icon name="logout" size={16} />Cerrar sesión</button>
        </>
      )}
    </div>
  )
}
