import { NavAdmin } from '@/components/NavAdmin'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavAdmin />
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
