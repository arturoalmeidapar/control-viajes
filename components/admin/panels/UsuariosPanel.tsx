'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Plus, Pencil } from 'lucide-react'
import type { Usuario, Obra, RolUsuario } from '@/lib/supabase/types'

export function UsuariosPanel() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [form, setForm] = useState({ nombre: '', email: '', rol: 'checador' as RolUsuario, activo: true })
  const [password, setPassword] = useState('')
  const [obrasAsignadas, setObrasAsignadas] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const supabase = createClient()
    const [{ data: us }, { data: os }] = await Promise.all([
      supabase.from('usuarios').select('*').order('nombre'),
      supabase.from('obras').select('*').eq('activo', true).order('nombre'),
    ])
    setUsuarios(us ?? [])
    setObras(os ?? [])
  }

  async function abrirEditar(u: Usuario) {
    setForm({ nombre: u.nombre, email: u.email, rol: u.rol, activo: u.activo })
    setEditando(u)
    const { data } = await createClient().from('residentes_obras').select('obra_id').eq('usuario_id', u.id)
    setObrasAsignadas((data ?? []).map(r => r.obra_id))
    setPassword('')
    setModal(true)
  }

  function abrirNuevo() {
    setForm({ nombre: '', email: '', rol: 'checador', activo: true })
    setEditando(null)
    setObrasAsignadas([])
    setPassword('')
    setModal(true)
  }

  function toggleObra(obraId: string) {
    setObrasAsignadas(prev => prev.includes(obraId) ? prev.filter(id => id !== obraId) : [...prev, obraId])
  }

  async function guardar() {
    setSaving(true)
    if (editando) {
      const supabase = createClient()
      await supabase.from('usuarios').update({ nombre: form.nombre, rol: form.rol, activo: form.activo }).eq('id', editando.id)
      if (form.rol === 'residente') {
        await supabase.from('residentes_obras').delete().eq('usuario_id', editando.id)
        if (obrasAsignadas.length > 0) {
          await supabase.from('residentes_obras').insert(obrasAsignadas.map(oid => ({ usuario_id: editando.id, obra_id: oid })))
        }
      }
    } else {
      // Crear nuevo usuario via API
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, password, obras: obrasAsignadas }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error ?? 'Error al crear usuario')
        setSaving(false)
        return
      }
    }
    setSaving(false)
    setModal(false)
    cargar()
  }

  const ROLES: { value: RolUsuario; label: string }[] = [
    { value: 'admin', label: 'Admin' },
    { value: 'checador', label: 'Checador' },
    { value: 'residente', label: 'Residente' },
  ]

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Usuarios ({usuarios.length})</h2>
        <button onClick={abrirNuevo} className="flex items-center gap-1 px-3 py-2 bg-naranja-500 text-white rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      <table className="w-full text-sm">
        <thead><tr className="border-b text-xs text-gray-500 uppercase">
          <th className="text-left pb-2">Nombre</th>
          <th className="text-left pb-2">Email</th>
          <th className="text-left pb-2">Rol</th>
          <th className="text-left pb-2">Estado</th>
          <th className="pb-2"></th>
        </tr></thead>
        <tbody>
          {usuarios.map(u => (
            <tr key={u.id} className={`border-b border-gray-50 hover:bg-gray-50 ${!u.activo ? 'opacity-50' : ''}`}>
              <td className="py-2 font-medium">{u.nombre}</td>
              <td className="py-2 text-gray-600 text-xs">{u.email}</td>
              <td className="py-2 capitalize text-gray-600">{u.rol}</td>
              <td className="py-2">{u.activo ? <span className="text-green-600 text-xs">Activo</span> : <span className="text-gray-400 text-xs">Inactivo</span>}</td>
              <td className="py-2 text-right"><button onClick={() => abrirEditar(u)} className="p-1 hover:bg-gray-100 rounded"><Pencil className="w-3.5 h-3.5 text-gray-500" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal open={modal} titulo={editando ? 'Editar Usuario' : 'Nuevo Usuario'} onClose={() => setModal(false)} ancho="lg">
        <div className="space-y-4">
          <div><label className="label">Nombre completo</label><input className="input" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} /></div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} disabled={!!editando} />
            {editando && <p className="text-xs text-gray-400 mt-1">El email no se puede cambiar</p>}
          </div>
          {!editando && (
            <div><label className="label">Contraseña inicial</label><input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
          )}
          <div>
            <label className="label">Rol</label>
            <div className="flex gap-2">
              {ROLES.map(r => (
                <button key={r.value} onClick={() => setForm(p => ({ ...p, rol: r.value }))} className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${form.rol === r.value ? 'border-naranja-500 bg-naranja-50 text-naranja-700' : 'border-gray-200'}`}>{r.label}</button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.activo} onChange={e => setForm(p => ({ ...p, activo: e.target.checked }))} className="w-4 h-4" />
            <span className="text-sm font-medium text-gray-700">Usuario activo</span>
          </label>
          {form.rol === 'residente' && (
            <div>
              <label className="label">Obras asignadas</label>
              <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-200 rounded-xl p-2">
                {obras.map(o => (
                  <label key={o.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={obrasAsignadas.includes(o.id)} onChange={() => toggleObra(o.id)} className="w-4 h-4 rounded" />
                    <span className="text-sm text-gray-700">{o.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <button className="btn-primary" onClick={guardar} disabled={saving || !form.nombre || !form.email || (!editando && !password)}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
