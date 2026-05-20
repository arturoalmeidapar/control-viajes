'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Plus, Pencil, ToggleRight, ToggleLeft } from 'lucide-react'
import type { Unidad, Contratista } from '@/lib/supabase/types'

export function UnidadesPanel() {
  const [contratistas, setContratistas] = useState<Contratista[]>([])
  const [unidades, setUnidades] = useState<(Unidad & { contratistas: { nombre: string } })[]>([])
  const [filtroC, setFiltroC] = useState('')
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Unidad | null>(null)
  const [form, setForm] = useState({ contratista_id: '', identificador: '', tipo: 'camion' as 'camion' | 'pipa', capacidad_m3: '', activo: true })
  const [saving, setSaving] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const supabase = createClient()
    const [{ data: cs }, { data: us }] = await Promise.all([
      supabase.from('contratistas').select('*').order('nombre'),
      supabase.from('unidades').select('*, contratistas(nombre)').order('identificador'),
    ])
    setContratistas(cs ?? [])
    setUnidades((us ?? []) as (Unidad & { contratistas: { nombre: string } })[])
  }

  function abrirNuevo() { setForm({ contratista_id: filtroC, identificador: '', tipo: 'camion', capacidad_m3: '', activo: true }); setEditando(null); setModal(true) }
  function abrirEditar(u: Unidad) { setForm({ contratista_id: u.contratista_id, identificador: u.identificador, tipo: u.tipo, capacidad_m3: u.capacidad_m3?.toString() ?? '', activo: u.activo }); setEditando(u); setModal(true) }

  async function guardar() {
    setSaving(true)
    const supabase = createClient()
    const datos = { contratista_id: form.contratista_id, identificador: form.identificador, tipo: form.tipo, capacidad_m3: form.capacidad_m3 ? Number(form.capacidad_m3) : null, activo: form.activo }
    if (editando) await supabase.from('unidades').update(datos).eq('id', editando.id)
    else await supabase.from('unidades').insert(datos)
    setSaving(false); setModal(false); cargar()
  }

  async function toggleActivo(u: Unidad) {
    await createClient().from('unidades').update({ activo: !u.activo }).eq('id', u.id)
    cargar()
  }

  const filtradas = filtroC ? unidades.filter(u => u.contratista_id === filtroC) : unidades

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <select className="input text-sm py-2 flex-1" value={filtroC} onChange={e => setFiltroC(e.target.value)}>
          <option value="">Todos los contratistas</option>
          {contratistas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <button onClick={abrirNuevo} className="flex items-center gap-1 px-3 py-2 bg-naranja-500 text-white rounded-xl text-sm font-medium flex-shrink-0">
          <Plus className="w-4 h-4" /> Nueva
        </button>
      </div>

      <table className="w-full text-sm">
        <thead><tr className="border-b text-xs text-gray-500 uppercase">
          <th className="text-left pb-2">Contratista</th>
          <th className="text-left pb-2">Unidad</th>
          <th className="text-left pb-2">Tipo</th>
          <th className="text-left pb-2">Cap.</th>
          <th className="pb-2"></th>
        </tr></thead>
        <tbody>
          {filtradas.map(u => (
            <tr key={u.id} className={`border-b border-gray-50 hover:bg-gray-50 ${!u.activo ? 'opacity-50' : ''}`}>
              <td className="py-1.5 text-xs text-gray-600">{u.contratistas?.nombre}</td>
              <td className="py-1.5 font-medium">{u.identificador}</td>
              <td className="py-1.5 text-gray-600 capitalize">{u.tipo}</td>
              <td className="py-1.5 text-gray-500">{u.capacidad_m3 ? `${u.capacidad_m3}m³` : '-'}</td>
              <td className="py-1.5 flex gap-1 justify-end">
                <button onClick={() => abrirEditar(u)} className="p-1 hover:bg-gray-100 rounded"><Pencil className="w-3.5 h-3.5 text-gray-500" /></button>
                <button onClick={() => toggleActivo(u)} className="p-1 hover:bg-gray-100 rounded">{u.activo ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal open={modal} titulo={editando ? 'Editar Unidad' : 'Nueva Unidad'} onClose={() => setModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="label">Contratista</label>
            <select className="input" value={form.contratista_id} onChange={e => setForm(p => ({ ...p, contratista_id: e.target.value }))}>
              <option value="">-- Seleccionar --</option>
              {contratistas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div><label className="label">Identificador</label><input className="input" placeholder="Ej: Freightliner blanco" value={form.identificador} onChange={e => setForm(p => ({ ...p, identificador: e.target.value }))} /></div>
          <div>
            <label className="label">Tipo</label>
            <div className="flex gap-2">
              {(['camion', 'pipa'] as const).map(t => (
                <button key={t} onClick={() => setForm(p => ({ ...p, tipo: t }))} className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium capitalize transition-all ${form.tipo === t ? 'border-naranja-500 bg-naranja-50 text-naranja-700' : 'border-gray-200'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div><label className="label">Capacidad m³ (solo pipas)</label><input type="number" className="input" placeholder="18" value={form.capacidad_m3} onChange={e => setForm(p => ({ ...p, capacidad_m3: e.target.value }))} /></div>
          <button className="btn-primary" onClick={guardar} disabled={saving || !form.contratista_id || !form.identificador}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
