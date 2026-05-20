import { NavMobile } from '@/components/NavMobile'
import { Clock, CheckCircle } from 'lucide-react'

export default function ResidenteLayout({ children }: { children: React.ReactNode }) {
  const items = [
    { href: '/residente', label: 'Pendientes', icon: <Clock className="w-5 h-5" /> },
    { href: '/residente/confirmados', label: 'Confirmados', icon: <CheckCircle className="w-5 h-5" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <NavMobile items={items} titulo="Control Viajes — Residente" />
      <main className="px-4 py-4">{children}</main>
    </div>
  )
}
