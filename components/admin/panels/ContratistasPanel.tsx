'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Pencil, Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import type { Contratista } from '@/lib/supabase/types'

const VACIO: Omit<Contratista, 'id' | 'created_at'> = { nombre: '', codigo: '', tarifa_especial: false, activo: true }

export function ContratistasPanel() {
  const [lista, setLista] = useState<Contratista[]>([])
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Contratista | null>(null)
  const [form, setForm] = useState(VACIO)
  const [saving, setSaving] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const { data } = await createClient().from('contratistas').select('*').order('nombre')
    setLista(data ?? [])
  }

  function abrirNuevo() { setForm(VACIO); setEditando(null); setModal(true) }
  function abrirEditar(c: Contratista) { setForm({ nombre: c.nombre, codigo: c.codigo, tarifa_especial: c.tarifa_especial, activo: c.activo }); setEditando(c); setModal(true) }

  async function guardar() {
    setSaving(true)
    const supabase = createClient()
    if (editando) {
      await supabase.from('contratistas').update(form).eq('id', editando.id)
    } else {
      await supabase.from('contratistas').insert(form)
    }
    setSaving(false)
    setModal(false)
    cargar()
  }

  async function toggleActivo(c: Contratista) {
    await createClient().from('contratistas').update({ activo: !c.activo }).eq('id', c.id)
    cargar()
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Contratistas</h2>
        <button onClick={abrirNuevo} className="flex items-center gap-2 px-3 py-2 bg-naranja-500 text-white rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      <table className="w-full text-sm">
        <thead><tr className="border-b text-xs text-gray-500 uppercase">
          <th className="text-left pb-2">Nombre</th>
          <th className="text-left pb-2">Código</th>
          <th className="text-left pb-2">T.Esp.</th>
          <th className="text-left pb-2">Estado</th>
          <th className="pb-2"></th>
        </tr></thead>
        <tbody>
          {lista.map(c => (
            <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-2 font-medium">{c.nombre}</td>
              <td className="py-2 text-gray-600">{c.codigo}</td>
              <td className="py-2">{c.tarifa_especial ? '✓' : '-'}</td>
              <td className="py-2">{c.activo ? <span className="text-green-600 text-xs">Activo</span> : <span className="text-gray-400 text-xs">Inactivo</span>}</td>
              <td className="py-2 flex gap-2 justify-end">
                <button onClick={() => abrirEditar(c)} className="p-1.5 hover:bg-gray-100 rounded-lg"><Pencil className="w-3.5 h-3.5 text-gray-500" /></button>
                <button onClick={() => toggleActivo(c)} className="p-1.5 hover:bg-gray-100 rounded-lg">{c.activo ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal open={modal} titulo={editando ? 'Editar Contratista' : 'Nuevo Contratista'} onClose={() => setModal(false)}>
        <div className="space-y-4">
          <div><label className="label">Nombre</label><input className="input" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} /></div>
          <div><label className="label">Código</label><input className="input" value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} /></div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.tarifa_especial} onChange={e => setForm(p => ({ ...p, tarifa_especial: e.target.checked }))} className="w-4 h-4" />
            <span className="text-sm font-medium text-gray-700">Tarifa especial</span>
          </label>
          <button className="btn-primary" onClick={guardar} disabled={saving || !form.nombre || !form.codigo}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
