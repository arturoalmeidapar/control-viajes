import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: Request) {
  try {
    const { viajeId, obraDestinoId, contratistaNombre, unidadIdentificador, m3, tipoMaterial } = await req.json()

    const supabase = createAdminClient()

    // Buscar residentes asignados a esa obra
    const { data: asignaciones } = await supabase
      .from('residentes_obras')
      .select('usuario_id')
      .eq('obra_id', obraDestinoId)

    if (!asignaciones?.length) return NextResponse.json({ ok: true, enviadas: 0 })

    const userIds = (asignaciones as { usuario_id: string }[]).map(a => a.usuario_id)
    const { data: residentes } = await supabase
      .from('usuarios')
      .select('push_subscription')
      .in('id', userIds)
      .not('push_subscription', 'is', null)

    const listaResidentes = (residentes ?? []) as { push_subscription: Record<string, unknown> | null }[]
    let enviadas = 0
    for (const r of listaResidentes) {
      if (!r.push_subscription) continue
      try {
        await webpush.sendNotification(
          r.push_subscription as unknown as webpush.PushSubscription,
          JSON.stringify({
            title: 'Nuevo viaje registrado',
            body: `${contratistaNombre} — ${unidadIdentificador} — ${m3}m³ ${tipoMaterial}`,
            url: `/residente/viaje/${viajeId}`,
          })
        )
        enviadas++
      } catch {
        // Suscripción expirada o inválida — ignorar
      }
    }

    return NextResponse.json({ ok: true, enviadas })
  } catch (e) {
    console.error('Push error:', e)
    return NextResponse.json({ error: 'Error enviando notificación' }, { status: 500 })
  }
}
