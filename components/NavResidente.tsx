'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Truck, Clock, LayoutDashboard, List, FileSpreadsheet } from 'lucide-react'

interface NavResidenteProps {
  puedeVerTodo: boolean
}

export function NavResidente({ puedeVerTodo }: NavResidenteProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  const items = [
    { href: '/residente', label: 'Mis viajes', icon: <Clock className="w-5 h-5" /> },
    ...(puedeVerTodo ? [
      { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { href: '/viajes', label: 'Viajes', icon: <List className="w-5 h-5" /> },
    ] : []),
    { href: '/estimacion', label: 'Estimación', icon: <FileSpreadsheet className="w-5 h-5" /> },
  ]

  return (
    <>
      <header className="bg-naranja-500 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5" />
          <span className="font-semibold">Control Viajes</span>
        </div>
        <button onClick={handleLogout} className="p-1">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-inset-bottom">
        <div className="flex">
          {items.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
                pathname === item.href || pathname.startsWith(item.href + '/')
                  ? 'text-naranja-500'
                  : 'text-gray-500'
              }`}
            >
              {item.icon}
              <span className="mt-1">{item.label}</span>
            </Link>
          ))}
        </div>
        <div className="h-safe-area-inset-bottom" />
      </nav>
    </>
  )
}
