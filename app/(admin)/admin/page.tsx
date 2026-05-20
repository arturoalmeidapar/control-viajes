'use client'

import { useState } from 'react'
import { ContratistasPanel } from '@/components/admin/panels/ContratistasPanel'
import { UnidadesPanel } from '@/components/admin/panels/UnidadesPanel'
import { ObrasPanel } from '@/components/admin/panels/ObrasPanel'
import { UsuariosPanel } from '@/components/admin/panels/UsuariosPanel'
import { DistanciasPanel } from '@/components/admin/panels/DistanciasPanel'
import { TarifasPanel } from '@/components/admin/panels/TarifasPanel'

const TABS = [
  { id: 'contratistas', label: 'Contratistas' },
  { id: 'unidades', label: 'Unidades' },
  { id: 'obras', label: 'Obras' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'distancias', label: 'Distancias' },
  { id: 'tarifas', label: 'Tarifas' },
]

export default function AdminPage() {
  const [tab, setTab] = useState('contratistas')

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Administración</h1>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-naranja-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Panel activo */}
      {tab === 'contratistas' && <ContratistasPanel />}
      {tab === 'unidades' && <UnidadesPanel />}
      {tab === 'obras' && <ObrasPanel />}
      {tab === 'usuarios' && <UsuariosPanel />}
      {tab === 'distancias' && <DistanciasPanel />}
      {tab === 'tarifas' && <TarifasPanel />}
    </div>
  )
}
