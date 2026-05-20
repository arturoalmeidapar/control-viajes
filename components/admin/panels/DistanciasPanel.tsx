'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Distancia, Obra } from '@/lib/supabase/types'

interface DistanciaConObras extends Distancia {
  obras_origen: { nombre: string }
  obras_destino: { nombre: string }
}

export function DistanciasPanel() {
  const [distancias, setDistancias] = useState<DistanciaConObras[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<DistanciaConObras | null>(null)
  const [form, setForm] = useState({ obra_origen_id: '', obra_destino_id: '', distancia_km: '', nota: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const supabase = createClient()
    const [{ data: ds }, { data: os }] = await Promise.all([
      supabase.from('distancias').select('*, obras_origen:obras!distancias_obra_origen_id_fkey(nombre), obras_destino:obras!distancias_obra_destino_id_fkey(nombre)').order('obra_origen_id'),
      supabase.from('obras').select('*').eq('activo', true).order('nombre'),
    ])
    setDistancias((ds ?? []) as DistanciaConObras[])
    setObras(os ?? [])
  }

  function abrirNuevo() { setForm({ obra_origen_id: '', obra_destino_id: '', distancia_km: '', nota: '' }); setEditando(null); setModal(true) }
  function abrirEditar(d: DistanciaConObras) {
    setForm({ obra_origen_id: d.obra_origen_id, obra_destino_id: d.obra_destino_id, distancia_km: String(d.distancia_km), nota: d.nota ?? '' })
    setEditando(d); setModal(true)
  }

  async function guardar() {
    setSaving(true)
    const datos = { obra_origen_id: form.obra_origen_id, obra_destino_id: form.obra_destino_id, distancia_km: Number(form.distancia_km), nota: form.nota || null }
    if (editando) await createClient().from('distancias').update(datos).eq('id', editando.id)
    else await createClient().from('distancias').insert(datos)
    setSaving(false); setModal(false); cargar()
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar esta distancia?')) return
    await createClient().from('distancias').delete().eq('id', id)
    cargar()
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Distancias entre obras ({distancias.length})</h2>
        <button onClick={abrirNuevo} className="flex items-center gap-1 px-3 py-2 bg-naranja-500 text-white rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> Nueva
        </button>
      </div>

      <table className="w-full text-sm">
        <thead><tr className="border-b text-xs text-gray-500 uppercase">
          <th className="text-left pb-2">Origen</th>
          <th className="text-left pb-2">Destino</th>
          <th className="text-right pb-2">km</th>
          <th className="text-left pb-2">Nota</th>
          <th className="pb-2"></th>
        </tr></thead>
        <tbody>
          {distancias.map(d => (
            <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-1.5 text-xs text-gray-700">{d.obras_origen.nombre}</td>
              <td className="py-1.5 text-xs text-gray-700">{d.obras_destino.nombre}</td>
              <td className="py-1.5 text-right font-medium">{d.distancia_km}</td>
              <td className="py-1.5 text-xs text-gray-500">{d.nota}</td>
              <td className="py-1.5 flex gap-1 justify-end">
                <button onClick={() => abrirEditar(d)} className="p-1 hover:bg-gray-100 rounded"><Pencil className="w-3.5 h-3.5 text-gray-500" /></button>
                <button onClick={() => eliminar(d.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal open={modal} titulo={editando ? 'Editar Distancia' : 'Nueva Distancia'} onClose={() => setModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="label">Obra Origen</label>
            <select className="input" value={form.obra_origen_id} onChange={e => setForm(p => ({ ...p, obra_origen_id: e.target.value }))}>
              <option value="">-- Seleccionar --</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Obra Destino</label>
            <select className="input" value={form.obra_destino_id} onChange={e => setForm(p => ({ ...p, obra_destino_id: e.target.value }))}>
              <option value="">-- Seleccionar --</option>
              {obras.filter(o => o.id !== form.obra_origen_id).map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </div>
          <div><label className="label">Distancia (km)</label><input type="number" step="0.5" min="0" className="input" value={form.distancia_km} onChange={e => setForm(p => ({ ...p, distancia_km: e.target.value }))} /></div>
          <div><label className="label">Nota (opcional)</label><input className="input" placeholder="Ej: hoyo 16" value={form.nota} onChange={e => setForm(p => ({ ...p, nota: e.target.value }))} /></div>
          <button className="btn-primary" onClick={guardar} disabled={saving || !form.obra_origen_id || !form.obra_destino_id || !form.distancia_km}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </Modal>
    </div>
  )
}
