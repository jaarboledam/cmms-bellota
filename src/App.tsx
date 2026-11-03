import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DataProvider, useData } from './lib/DataContext'
import { Layout } from './components/Layout'
import { Button } from './components/ui'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Ordenes } from './pages/Ordenes'
import { PlanPage } from './pages/Plan'
import { Equipos } from './pages/Equipos'
import { HojaVida } from './pages/HojaVida'
import { Fallas } from './pages/Fallas'
import { Repuestos } from './pages/Repuestos'
import { Tecnicos } from './pages/Tecnicos'
import { Costos } from './pages/Costos'
import { Parametros } from './pages/Parametros'

function Gate() {
  const { mode, session, authReady, db, loading, error, reload, restoreSeed } = useData()
  if (!authReady) return <Center>Cargando…</Center>
  if (mode === 'supabase' && !session) return <Login />
  if (error) return <Center><p className="text-bad font-medium">No se pudieron cargar los datos: {error}</p><Button onClick={reload}>Reintentar</Button></Center>
  if (!db) return <Center>{loading ? 'Cargando datos…' : ''}</Center>
  if (db.equipos.length === 0) {
    return (
      <Center>
        <h1 className="text-xl font-bold m-0">La base de datos está vacía</h1>
        <p className="text-sm text-muted max-w-md text-center m-0">Carga los datos del proyecto (equipos, historial de fallas, plan preventivo, catálogo, repuestos y técnicos) para empezar.</p>
        <Button variant="primary" disabled={loading} onClick={restoreSeed}>{loading ? 'Cargando…' : 'Cargar datos del proyecto'}</Button>
      </Center>
    )
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="ordenes" element={<Ordenes />} />
        <Route path="plan" element={<PlanPage />} />
        <Route path="equipos" element={<Equipos />} />
        <Route path="hoja-de-vida" element={<HojaVida />} />
        <Route path="fallas" element={<Fallas />} />
        <Route path="repuestos" element={<Repuestos />} />
        <Route path="tecnicos" element={<Tecnicos />} />
        <Route path="costos" element={<Costos />} />
        <Route path="parametros" element={<Parametros />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-sm">{children}</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <Gate />
      </DataProvider>
    </BrowserRouter>
  )
}
