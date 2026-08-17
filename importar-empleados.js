import { createClient } from '@supabase/supabase-js'
import { empleados } from './app/data/empleados.js'

const supabaseUrl = 'https://zknsmqlwwofkalqjkdry.supabase.co'
const supabaseKey = 'sb_publishable_rVIqNkjBurwoZI4915oWDw_glIJunVl'

const supabase = createClient(
  supabaseUrl,
  supabaseKey
)

console.log(`Encontrados ${empleados.length} empleados.`)

const registros = empleados.map(empleado => ({
  nombre: empleado.nombre,
  cargo: empleado.cargo,
  area: empleado.area || '',
  ya_voto: false,
  acceso_bloqueado: false
}))

const { data, error } = await supabase
  .from('empleados')
  .upsert(registros, {
    onConflict: 'nombre'
  })

if (error) {
  console.error('ERROR:', error)
  process.exit(1)
}

console.log(`✅ Empleados cargados correctamente: ${data?.length ?? registros.length}`)