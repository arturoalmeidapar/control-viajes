'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Plus, Pencil, ToggleRight, ToggleLeft } from 'lucide-react'
import type { Obra } from '@/lib/supabase/types'

export function ObrasPanel() {
  const [obras, setObras] = useState<Obra[]>([])
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Obra | null>(null)
  const [form, setForm] = useState({ nombre: '', activo: true, es_campo_golf: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const { data } = await createClient().from('obras').select('*').order('nombre')
    setObras(data ?? [])
  }

  function abrirNuevo() { setForm({ nombre: '', activo: true, es_campo_golf: false }); setEditando(null); setModal(true) }
  function abrirEditar(o: Obra) { setForm({ nombre: o.nombre, activo: o.activo, es_campo_golf: o.es_campo_golf }); setEditando(o); setModal(true) }

  async function guardar() {
    setSaving(true)
    if (editando) await createClient().from('obras').update(form).eq('id', editando.id)
    else await createClient().from('obras').insert(form)
    setSaving(false); setModal(false); cargar()
  }

  async function toggleActivo(o: Obra) {
    await createClient().from('obras').update({ activo: !o.activo }).eq('id', o.id)
    cargar()
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Obras ({obras.length})</h2>
        <button onClick={abrirNuevo} className="flex items-center gap-1 px-3 py-2 bg-naranja-500 text-white rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> Nueva
        </button>
      </div>

      <div className="space-y-1">
        {obras.map(o => (
          <div key={o.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 ${!o.activo ? 'opacity-50' : ''}`}>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-900">{o.nombre}</span>
              {o.es_campo_golf && <span className="ml-2 text-xs text-green-600">⛳ Golf</span>}
            </div>
            <span className={`text-xs ${o.activo ? 'text-green-600' : 'text-gray-400'}`}>{o.activo ? 'Activa' : 'Cerrada'}</span>
            <button onClick={() => abrirEditar(o)} className="p-1 hover:bg-gray-100 rounded"><Pencil className="w-3.5 h-3.5 text-gray-500" /></button>
            <button onClick={() => toggleActivo(o)} className="p-1 hover:bg-gray-100 rounded">{o.activo ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}</button>
          </div>
        ))}
      </div>

      <Modal open={modal} titulo={editando ? 'Editar Obra' : 'Nueva Obra'} onClose={() => setModal(false)}>
        <div className="space-y-4">
          <div><label className="label">Nombre de la obra</label><input className="input" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} /></div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.es_campo_golf} onChange={e => setForm(p => ({ ...p, es_campo_golf: e.target.checked }))} className="w-4 h-4" />
            <span className="text-sm font-medium text-gray-700">⛳ Es Campo de Golf (pide zona/hoyo)</span>
          </label>
          <button className="btn-primary" onClick={guardar} disabled={saving || !form.nombre}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </Modal>
    </div>
  )
}
