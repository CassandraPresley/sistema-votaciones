import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const expediente = String(body?.expediente || '').trim()
  const token = String(body?.token || '').trim()

  if (!expediente) {
    return {
      ok: false,
      mensaje: 'Ingresa tu número de expediente'
    }
  }

  if (!token) {
    return {
      ok: false,
      mensaje: 'Ingresa tu token'
    }
  }

  const config = useRuntimeConfig(event)

  if (!config.supabaseUrl) {
    console.error('Falta supabaseUrl en runtimeConfig')
    return {
      ok: false,
      mensaje: 'Error de configuración del servidor'
    }
  }

  if (!config.supabaseServiceRoleKey) {
    console.error('Falta supabaseServiceRoleKey en runtimeConfig')
    return {
      ok: false,
      mensaje: 'Error de configuración del servidor'
    }
  }

  const supabase = createClient(
    config.supabaseUrl,
    config.supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  const {
    data: empleado,
    error
  } = await supabase
    .from('empleados')
    .select(`
      id,
      expediente,
      nombre,
      cargo,
      area,
      token_hash,
      ya_voto,
      acceso_bloqueado
    `)
    .eq('expediente', expediente)
    .maybeSingle()

  if (error) {
    console.error('ERROR BUSCANDO EMPLEADO:', error)

    return {
      ok: false,
      mensaje: 'Error consultando el empleado'
    }
  }

  if (!empleado) {
    return {
      ok: false,
      mensaje: 'Expediente no encontrado'
    }
  }

  if (empleado.acceso_bloqueado === true) {
    return {
      ok: false,
      mensaje: 'El acceso de este empleado está bloqueado'
    }
  }

  if (empleado.ya_voto === true) {
    return {
      ok: false,
      mensaje: 'Este empleado ya realizó su voto'
    }
  }

  if (!empleado.token_hash) {
    return {
      ok: false,
      mensaje: 'El empleado no tiene token configurado'
    }
  }

  let tokenCorrecto = false

  try {
    tokenCorrecto = await bcrypt.compare(
      token,
      empleado.token_hash
    )
  } catch (error) {
    console.error(
      'ERROR COMPARANDO TOKEN:',
      error
    )

    return {
      ok: false,
      mensaje: 'Error verificando el token'
    }
  }

  console.log(
    `LOGIN ${expediente}: token correcto = ${tokenCorrecto}`
  )

  if (!tokenCorrecto) {
    return {
      ok: false,
      mensaje: 'Expediente o token incorrecto'
    }
  }

  return {
    ok: true,

    empleado: {
      id: empleado.id,
      expediente: empleado.expediente,
      nombre: empleado.nombre,
      cargo: empleado.cargo,
      area: empleado.area,
      ya_voto: empleado.ya_voto,
      acceso_bloqueado: empleado.acceso_bloqueado
    }
  }
})