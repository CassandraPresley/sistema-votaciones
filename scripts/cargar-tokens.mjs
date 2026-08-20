// ==================import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import { empleados } from '../app/data/empleados.js'

// ======================================================
// SUPABASE
// ======================================================

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('Falta SUPABASE_URL en .env')
  process.exit(1)
}

if (!supabaseKey) {
  console.error('Falta SUPABASE_SERVICE_ROLE_KEY en .env')
  process.exit(1)
}

const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// ======================================================
// VALIDACIÓN
// ======================================================

console.log('')
console.log('======================================')
console.log('       CARGA DE TOKENS')
console.log('======================================')

console.log(
  `Empleados encontrados: ${empleados.length}`
)

console.log('')

// Deben ser exactamente 62
if (empleados.length !== 62) {

  console.error(
    `ERROR: Se esperaban 62 empleados, pero hay ${empleados.length}.`
  )

  process.exit(1)
}

// ======================================================
// VALIDAR EXPEDIENTES
// ======================================================

const expedientes = empleados.map(
  empleado =>
    String(empleado.expediente).trim()
)

const expedientesDuplicados =
  expedientes.filter(
    (expediente, index) =>
      expedientes.indexOf(expediente) !== index
  )

if (expedientesDuplicados.length > 0) {

  console.error('')
  console.error(
    'ERROR: Hay expedientes duplicados:'
  )

  console.error(
    [...new Set(expedientesDuplicados)]
  )

  process.exit(1)
}

// ======================================================
// VALIDAR TOKENS
// ======================================================

for (const empleado of empleados) {

  const expediente =
    String(empleado.expediente).trim()

  const token =
    String(empleado.token).trim()

  if (!expediente) {

    console.error(
      'ERROR: Hay un empleado sin expediente.'
    )

    process.exit(1)
  }

  if (!token) {

    console.error(
      `ERROR: ${expediente} no tiene token.`
    )

    process.exit(1)
  }

  if (!/^\d{4}$/.test(token)) {

    console.error(
      `ERROR: Token inválido para ${expediente}: ${token}`
    )

    process.exit(1)
  }
}

// ======================================================
// RESUMEN POR ÁREA
// ======================================================

const porArea = {}

for (const empleado of empleados) {

  const area =
    empleado.area || 'SIN ÁREA'

  porArea[area] =
    (porArea[area] || 0) + 1
}

console.log('PERSONAL POR ÁREA:')
console.log('')

for (
  const [area, cantidad]
  of Object.entries(porArea)
) {

  console.log(
    `${area}: ${cantidad}`
  )
}

console.log('')

// ======================================================
// SINCRONIZACIÓN
// ======================================================

let actualizados = 0
let noEncontrados = 0
let errores = 0
let verificacionesCorrectas = 0
let verificacionesIncorrectas = 0

for (const empleado of empleados) {

  const expediente =
    String(empleado.expediente).trim()

  const token =
    String(empleado.token).trim()

  console.log('')
  console.log(
    `Procesando ${expediente} - ${empleado.nombre}`
  )

  try {

    // ==================================================
    // 1. GENERAR HASH
    // ==================================================

    const tokenHash =
      await bcrypt.hash(token, 12)

    // ==================================================
    // 2. BUSCAR EMPLEADO
    // ==================================================

    const {
      data: existente,
      error: buscarError
    } = await supabase
      .from('empleados')
      .select(`
        id,
        expediente,
        nombre,
        ya_voto,
        acceso_bloqueado
      `)
      .eq(
        'expediente',
        expediente
      )
      .maybeSingle()

    if (buscarError) {

      console.error(
        `ERROR BUSCANDO ${expediente}:`,
        buscarError.message
      )

      errores++

      continue
    }

    // ==================================================
    // 3. NO ENCONTRADO
    // ==================================================

    if (!existente) {

      console.error(
        `NO ENCONTRADO: ${expediente} - ${empleado.nombre}`
      )

      noEncontrados++

      continue
    }

    // ==================================================
    // 4. ACTUALIZAR
    //
    // NO MODIFICAMOS:
    // ya_voto
    // acceso_bloqueado
    // ==================================================

    const {
      data: actualizado,
      error: updateError
    } = await supabase
      .from('empleados')
      .update({
        nombre:
          empleado.nombre,

        cargo:
          empleado.cargo,

        area:
          empleado.area,

        token_hash:
          tokenHash
      })
      .eq(
        'id',
        existente.id
      )
      .select(`
        id,
        expediente,
        nombre,
        token_hash,
        ya_voto,
        acceso_bloqueado
      `)
      .maybeSingle()

    if (updateError) {

      console.error(
        `ERROR ACTUALIZANDO ${expediente}:`,
        updateError.message
      )

      errores++

      continue
    }

    if (!actualizado) {

      console.error(
        `ERROR: No se recuperó ${expediente} después de actualizar`
      )

      errores++

      continue
    }

    // ==================================================
    // 5. VERIFICAR HASH
    // ==================================================

    const coincide =
      await bcrypt.compare(
        token,
        actualizado.token_hash
      )

    if (!coincide) {

      console.error(
        `VERIFICACIÓN FALLIDA: ${expediente}`
      )

      verificacionesIncorrectas++
      errores++

      continue
    }

    verificacionesCorrectas++
    actualizados++

    console.log(
      `OK: ${expediente} | ${empleado.nombre}`
    )

    console.log(
      '   Token verificado: TRUE'
    )

    console.log(
      `   ya_voto: ${actualizado.ya_voto}`
    )

    console.log(
      `   acceso_bloqueado: ${actualizado.acceso_bloqueado}`
    )

  } catch (error) {

    console.error(
      `ERROR ${expediente}:`,
      error?.message || error
    )

    errores++
  }
}

// ======================================================
// RESULTADO FINAL
// ======================================================

console.log('')
console.log('======================================')
console.log('     SINCRONIZACIÓN TERMINADA')
console.log('======================================')

console.log(
  `Empleados enviados: ${empleados.length}`
)

console.log(
  `Empleados actualizados: ${actualizados}`
)

console.log(
  `No encontrados: ${noEncontrados}`
)

console.log(
  `Errores: ${errores}`
)

console.log(
  `Hashes verificados correctamente: ${verificacionesCorrectas}`
)

console.log(
  `Hashes con verificación fallida: ${verificacionesIncorrectas}`
)

console.log('======================================')
console.log('')

// ======================================================
// RESULTADO
// ======================================================

if (
  actualizados === 62 &&
  noEncontrados === 0 &&
  errores === 0 &&
  verificacionesIncorrectas === 0
) {

  console.log(
    'TODOS LOS 62 EMPLEADOS FUERON ACTUALIZADOS Y VERIFICADOS.'
  )

} else {

  console.error(
    'LA SINCRONIZACIÓN TERMINÓ CON INCIDENCIAS.'
  )

  process.exitCode = 1
}