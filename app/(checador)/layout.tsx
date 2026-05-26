import { NavMobile } from '@/components/NavMobile'
import { Home, BarChart2, PlusCircle } from 'lucide-react'

export default function CheckadorLayout({ children }: { children: React.ReactNode }) {
  const items = [
    { href: '/checador', label: 'Inicio', icon: <Home className="w-5 h-5" /> },
    { href: '/checador/resumen', label: 'Resumen', icon: <BarChart2 className="w-5 h-5" /> },
    { href: '/checador/registrar', label: 'Registrar', icon: <PlusCircle className="w-5 h-5" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <NavMobile items={items} titulo="Control Viajes — Checador" />
      <main className="px-4 py-4">{children}</main>
    </div>
  )
}
