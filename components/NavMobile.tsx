'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Truck } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

interface NavMobileProps {
  items: NavItem[]
  titulo: string
}

export function NavMobile({ items, titulo }: NavMobileProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Header */}
      <header className="bg-naranja-500 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5" />
          <span className="font-semibold">{titulo}</span>
        </div>
        <button onClick={handleLogout} className="p-1">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Bottom navigation */}
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
        {/* Espacio para home indicator en iOS */}
        <div className="h-safe-area-inset-bottom" />
      </nav>
    </>
  )
}
