import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@control-viajes.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  try {
    const { checadorId, contratistaNombre, unidadIdentificador, obraDestinoNombre, motivo } = await req.json()

    const supabase = createAdminClient()
    const { data: checador } = await supabase
      .from('usuarios')
      .select('push_subscription')
      .eq('id', checadorId)
      .single()

    if (!checador?.push_subscription) return NextResponse.json({ ok: true, enviadas: 0 })

    await webpush.sendNotification(
      checador.push_subscription as unknown as webpush.PushSubscription,
      JSON.stringify({
        title: 'Viaje rechazado',
        body: `${contratistaNombre} ${unidadIdentificador} en ${obraDestinoNombre}: ${motivo}`,
        url: '/checador',
      })
    )

    return NextResponse.json({ ok: true, enviadas: 1 })
  } catch (e) {
    console.error('Push rechazado error:', e)
    return NextResponse.json({ error: 'Error enviando notificación' }, { status: 500 })
  }
}
