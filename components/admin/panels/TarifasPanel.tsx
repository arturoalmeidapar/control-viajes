'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tarifa, Contratista, TipoMaterial } from '@/lib/supabase/types'
import { ETIQUETAS_MATERIAL } from '@/lib/utils'
import { formatMoneda } from '@/lib/calc-importe'
import { Pencil } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

interface TarifaConContratista extends Tarifa {
  contratistas: { nombre: string } | null
}

export function TarifasPanel() {
  const [tarifas, setTarifas] = useState<TarifaConContratista[]>([])
  const [contratistas, setContratistas] = useState<Contratista[]>([])
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<TarifaConContratista | null>(null)
  const [form, setForm] = useState({ precio_m3: '', precio_km_adicional: '', km_base: '3' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const supabase = createClient()
    const [{ data: ts }, { data: cs }] = await Promise.all([
      supabase.from('tarifas').select('*, contratistas(nombre)').order('tipo_material'),
      supabase.from('contratistas').select('*').eq('activo', true).order('nombre'),
    ])
    setTarifas((ts ?? []) as TarifaConContratista[])
    setContratistas(cs ?? [])
  }

  function abrirEditar(t: TarifaConContratista) {
    setForm({ precio_m3: String(t.precio_m3), precio_km_adicional: String(t.precio_km_adicional), km_base: String(t.km_base) })
    setEditando(t); setModal(true)
  }

  async function guardar() {
    if (!editando) return
    setSaving(true)
    await createClient().from('tarifas').update({
      precio_m3: Number(form.precio_m3),
      precio_km_adicional: Number(form.precio_km_adicional),
      km_base: Number(form.km_base),
    }).eq('id', editando.id)
    setSaving(false); setModal(false); cargar()
  }

  const generales = tarifas.filter(t => !t.solo_contratista_id)
  const especiales = tarifas.filter(t => !!t.solo_contratista_id)

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-3">Tarifas Generales</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b text-xs text-gray-500 uppercase">
            <th className="text-left pb-2">Material</th>
            <th className="text-right pb-2">$/m³</th>
            <th className="text-right pb-2">$/km adic.</th>
            <th className="text-right pb-2">km base</th>
            <th className="pb-2"></th>
          </tr></thead>
          <tbody>
            {generales.map(t => (
              <tr key={t.id} className="border-b border-gray-50">
                <td className="py-2 font-medium">{ETIQUETAS_MATERIAL[t.tipo_material]}</td>
                <td className="py-2 text-right">{formatMoneda(t.precio_m3)}</td>
                <td className="py-2 text-right">{t.precio_km_adicional > 0 ? formatMoneda(t.precio_km_adicional) : '-'}</td>
                <td className="py-2 text-right text-gray-600">{t.km_base}</td>
                <td className="py-2 text-right"><button onClick={() => abrirEditar(t)} className="p-1 hover:bg-gray-100 rounded"><Pencil className="w-3.5 h-3.5 text-gray-500" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {especiales.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3">Tarifas Especiales</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-gray-500 uppercase">
              <th className="text-left pb-2">Contratista</th>
              <th className="text-left pb-2">Material</th>
              <th className="text-right pb-2">$/m³</th>
              <th className="text-right pb-2">$/km adic.</th>
              <th className="pb-2"></th>
            </tr></thead>
            <tbody>
              {especiales.map(t => (
                <tr key={t.id} className="border-b border-gray-50">
                  <td className="py-2 text-xs">{t.contratistas?.nombre ?? '-'}</td>
                  <td className="py-2">{ETIQUETAS_MATERIAL[t.tipo_material]}</td>
                  <td className="py-2 text-right">{formatMoneda(t.precio_m3)}</td>
                  <td className="py-2 text-right">{t.precio_km_adicional > 0 ? formatMoneda(t.precio_km_adicional) : '-'}</td>
                  <td className="py-2 text-right"><button onClick={() => abrirEditar(t)} className="p-1 hover:bg-gray-100 rounded"><Pencil className="w-3.5 h-3.5 text-gray-500" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} titulo="Editar Tarifa" onClose={() => setModal(false)}>
        {editando && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm">
              <span className="text-gray-500">Material: </span>
              <span className="font-medium">{ETIQUETAS_MATERIAL[editando.tipo_material as TipoMaterial]}</span>
              {editando.contratistas && <><span className="text-gray-500 ml-3">Para: </span><span className="font-medium">{editando.contratistas.nombre}</span></>}
            </div>
            <div><label className="label">Precio por m³ ($)</label><input type="number" step="0.01" className="input" value={form.precio_m3} onChange={e => setForm(p => ({ ...p, precio_m3: e.target.value }))} /></div>
            <div><label className="label">Precio km adicional ($/m³/km)</label><input type="number" step="0.01" className="input" value={form.precio_km_adicional} onChange={e => setForm(p => ({ ...p, precio_km_adicional: e.target.value }))} /></div>
            <div><label className="label">Kilómetros base (sin cargo)</label><input type="number" className="input" value={form.km_base} onChange={e => setForm(p => ({ ...p, km_base: e.target.value }))} /></div>
            <button className="btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        )}
      </Modal>

      <p className="text-xs text-gray-400">Nota: Basura siempre es $300/m³ fijo (no se edita desde aquí)</p>
      <p className="text-xs text-gray-400">Para agregar tarifas especiales a nuevos contratistas, usa la base de datos directamente.</p>
      <p className="text-xs text-gray-400">Contratistas disponibles: {contratistas.map(c => c.nombre).join(', ')}</p>
    </div>
  )
}
