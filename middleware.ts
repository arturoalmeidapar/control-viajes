import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { RolUsuario } from '@/lib/supabase/types'

function homeParaRol(rol: RolUsuario | undefined): string {
  if (rol === 'admin') return '/dashboard'
  if (rol === 'checador') return '/checador'
  if (rol === 'residente') return '/residente'
  return '/login'
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Rutas públicas
  if (pathname === '/login') {
    if (user) {
      const { data: perfil } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', user.id)
        .single()
      return NextResponse.redirect(new URL(homeParaRol(perfil?.rol as RolUsuario), request.url))
    }
    return response
  }

  // Proteger todas las demás rutas
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('rol, puede_ver_todo')
    .eq('id', user.id)
    .single()

  // Si falla la query (ej: columna nueva aún no existe), cae a solo rol
  const { data: perfilBase } = !perfil
    ? await supabase.from('usuarios').select('rol').eq('id', user.id).single()
    : { data: null }

  const rol = (perfil?.rol ?? perfilBase?.rol) as RolUsuario | undefined
  const puedeVerTodo = perfil?.puede_ver_todo ?? false

  // Control de acceso por ruta
  const esRutaAdminPanel = pathname.startsWith('/admin')
  const esRutaDashboardViajes = pathname.startsWith('/dashboard') || pathname.startsWith('/viajes')
  const esRutaEstimacion = pathname.startsWith('/estimacion')
  const esRutaChecador = pathname.startsWith('/checador')
  const esRutaResidente = pathname.startsWith('/residente')

  // Solo admin puede acceder al panel de configuración
  if (esRutaAdminPanel && rol !== 'admin') {
    return NextResponse.redirect(new URL(homeParaRol(rol), request.url))
  }
  // Dashboard y Viajes: admin o residente con puede_ver_todo
  if (esRutaDashboardViajes && rol !== 'admin' && !(rol === 'residente' && puedeVerTodo)) {
    return NextResponse.redirect(new URL(homeParaRol(rol), request.url))
  }
  // Estimación: admin o cualquier residente
  if (esRutaEstimacion && rol !== 'admin' && rol !== 'residente') {
    return NextResponse.redirect(new URL(homeParaRol(rol), request.url))
  }
  if (esRutaChecador && rol !== 'checador' && rol !== 'admin') {
    return NextResponse.redirect(new URL(homeParaRol(rol), request.url))
  }
  if (esRutaResidente && rol !== 'residente' && rol !== 'admin') {
    return NextResponse.redirect(new URL(homeParaRol(rol), request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)'],
}
