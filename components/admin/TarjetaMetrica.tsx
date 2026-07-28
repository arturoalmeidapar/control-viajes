export function TarjetaMetrica({ icono, color, label, valor }: { icono: React.ReactNode; color: string; label: string; valor: string }) {
  const colores: Record<string, string> = {
    blue: 'text-blue-500 bg-blue-50',
    yellow: 'text-yellow-500 bg-yellow-50',
    green: 'text-green-500 bg-green-50',
    naranja: 'text-naranja-500 bg-naranja-50',
    red: 'text-red-500 bg-red-50',
    cyan: 'text-cyan-500 bg-cyan-50',
    purple: 'text-purple-500 bg-purple-50',
  }
  return (
    <div className="card flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${colores[color]}`}>{icono}</div>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-lg font-bold text-gray-900">{valor}</div>
      </div>
    </div>
  )
}
