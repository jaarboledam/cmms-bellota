import { useState } from 'react'
import { supabase } from '../lib/store'
import { Button } from '../components/ui'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [modo, setModo] = useState<'entrar' | 'registro'>('entrar')
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setMsg(null)
    const { error } = modo === 'entrar'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) setMsg({ text: error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message, ok: false })
    else if (modo === 'registro') setMsg({ text: 'Cuenta creada. Si Supabase pide confirmar el correo, revisa tu bandeja y luego inicia sesión.', ok: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-line rounded-xl p-7 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent text-white flex items-center justify-center font-bold">CM</div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-lg">CMMS Bellota</span>
            <span className="text-sm text-muted">Línea de cuchillas</span>
          </div>
        </div>
        <h1 className="m-0 text-xl font-bold">{modo === 'entrar' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Correo
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-lg border border-[#cfd4da] px-3 text-sm font-normal" />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Contraseña
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-lg border border-[#cfd4da] px-3 text-sm font-normal" />
        </label>
        {msg && <div role="alert" className={`text-sm rounded-lg px-3 py-2 ${msg.ok ? 'bg-good-soft text-good' : 'bg-bad-soft text-bad'}`}>{msg.text}</div>}
        <Button variant="primary" type="submit" disabled={busy}>{modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}</Button>
        <button type="button" className="text-sm text-info underline cursor-pointer" onClick={() => setModo(modo === 'entrar' ? 'registro' : 'entrar')}>
          {modo === 'entrar' ? '¿No tienes cuenta? Crear una' : 'Ya tengo cuenta'}
        </button>
      </form>
    </div>
  )
}
