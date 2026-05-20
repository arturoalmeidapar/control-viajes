import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { subscription } = await req.json()
  if (!subscription) return NextResponse.json({ error: 'Sin suscripción' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  await supabase.from('usuarios').update({ push_subscription: subscription }).eq('id', user.id)

  return NextResponse.json({ ok: true })
}
