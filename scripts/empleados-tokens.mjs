// ======================================================
// scripts/empleados-tokens.mjs
// ======================================================
//
// Carga los 62 empleados, genera sus hashes bcrypt,
// busca cada empleado por expediente y actualiza:
//
//   - nombre
//   - cargo
//   - area
//   - token_hash
//
// NO modifica:
//   - ya_voto
//   - acceso_bloqueado
//
// ======================================================

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

// ======================================================
// SUPABASE
// ======================================================

const supabaseUrl =
  process.env.SUPABASE_URL

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('ERROR: Falta SUPABASE_URL en .env')
  process.exit(1)
}

if (!supabaseKey) {
  console.error(
    'ERROR: Falta SUPABASE_SERVICE_ROLE_KEY en .env'
  )
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
// LOS 62 EMPLEADOS
// ======================================================
//
// IMPORTANTE:
//
// Cada empleado tiene:
//
// expediente
// nombre
// cargo
// area
// token
//
// ======================================================

const empleados = [

  {
    expediente: '17929',
    nombre: 'ALDAPE VELEZ ANA GUADALUPE',
    cargo: 'ASISTENTE TECNICO PROFESIONAL',
    token: '6284',
    area: 'COORD. DE PROGR. Y DISEÑO DE SI'
  },

  {
    expediente: '32868',
    nombre: 'MARTINEZ OROPEZA SANDRA',
    cargo: 'COORDINADOR DE PROYECTOS "C" N-12',
    token: '5831',
    area: 'GERENCIA DE ORGANIZACION Y SIST'
  },

  {
    expediente: '31382',
    nombre: 'FRANCO PANIAGUA RIGOBERTO REYNO',
    cargo: 'VIGILANTE "C"',
    token: '7416',
    area: 'GERENCIA DE ORGANIZACION Y SIST'
  },

  {
    expediente: '34327',
    nombre: 'OCARANZA PANTOJA ANA LUISA',
    cargo: 'VIGILANTE "C"',
    token: '2560',
    area: 'GERENCIA DE ORGANIZACION Y SIST'
  },

  {
    expediente: '14868',
    nombre: 'PEÑA HERNANDEZ LAURA EUGENIA',
    cargo: 'TÉCNICO PROFESIONAL ADMINISTRATIVO "A" N-10',
    token: '9658',
    area: 'GERENCIA DE ORGANIZACION Y SIST'
  },

  {
    expediente: '30443',
    nombre: 'ROSADO RIOS JORGE ALBERTO',
    cargo: 'SUBJEFE DEPARTAMENTO "K"',
    token: '4152',
    area: 'GERENCIA DE ORGANIZACION Y SIST'
  },

  {
    expediente: '29846',
    nombre: 'TAPIA GALICIA VERONICA',
    cargo: 'SUPERVISOR MANTTO INST FIJAS "I"',
    token: '2792',
    area: 'GERENCIA DE ORGANIZACION Y SIST'
  },

  {
    expediente: '27873',
    nombre: 'CORREA GUZMAN NOEL ANGEL',
    cargo: 'COORDINADOR DE PROYECTOS "L"',
    token: '6148',
    area: 'SUBGERENCIA DE INFORMATICA'
  },

  {
    expediente: '19423',
    nombre: 'GARCIA PEREZ ELVIRA',
    cargo: 'ASISTENTE TECNICO PROFESIONAL',
    token: '3275',
    area: 'SUBGERENCIA DE INFORMATICA'
  },

  {
    expediente: '23683',
    nombre: 'ESQUIVEL MARTINEZ RAFAEL',
    cargo: 'SUB.JEFE DEPARTAMENTO "M"',
    token: '8592',
    area: 'SUBGERENCIA DE INFORMATICA'
  },

  {
    expediente: '18355',
    nombre: 'GERMAN CORONA MIGUEL ANGEL',
    cargo: 'AYUDANTE ADMINISTRATIVO "A"',
    token: '4713',
    area: 'SUBGERENCIA DE INFORMATICA'
  },

  {
    expediente: '38359',
    nombre: 'DURAN RAMIREZ ALEJANDRO',
    cargo: 'AUXILIAR ADMINISTRATIVO',
    token: '9361',
    area: 'SUBGERENCIA DE INFORMATICA'
  },

  {
    expediente: '32852',
    nombre: 'LARIOS ESPINO FERNANDO',
    cargo: 'COORDINADOR DE PROYECTOS "M"',
    token: '5827',
    area: 'SUBGERENCIA DE INFORMATICA'
  },

  {
    expediente: '34023',
    nombre: 'LIRA HERNANDEZ HECTOR RAUL',
    cargo: 'COORDINADOR DE PROYECTOS "M"',
    token: '2439',
    area: 'SUBGERENCIA DE INFORMATICA'
  },

  {
    expediente: '31016',
    nombre: 'MARTINEZ MOLINA ROSALBA',
    cargo: 'AYUDANTE ADMINISTRATIVO "A"',
    token: '7654',
    area: 'SUBGERENCIA DE INFORMATICA'
  },

  {
    expediente: '37065',
    nombre: 'ROMERO LOPEZ OCTAVIO',
    cargo: 'VIGILANTE A',
    token: '3186',
    area: 'SUBGERENCIA DE INFORMATICA'
  },

  {
    expediente: '39794',
    nombre: 'ALVAREZ RODRIGUEZ ROBERTO',
    cargo: 'AYUDANTE ADMINISTRATIVO "A"',
    token: '8427',
    area: 'SUBGERENCIA DE INFORMATICA'
  },

  {
    expediente: '29209',
    nombre: 'BOLAÑOS MIGUEL ZAARA',
    cargo: 'ANALISTA SISTEMAS COMP. "J"',
    token: '5294',
    area: 'SUBGERENCIA DE INFORMATICA'
  },

  {
    expediente: '24625',
    nombre: 'CAMPOS DAVILA HECTOR ALEJANDRO',
    cargo: 'JEFE DE PROYECTOS "J"',
    token: '6718',
    area: 'SUBGERENCIA DE INFORMATICA'
  },

  {
    expediente: '20610',
    nombre: 'CORTES CIENFUEGOS RENE MARTIN',
    cargo: 'ANALISTA ESPECIALIZADO "B" N-7',
    token: '4532',
    area: 'SUBGERENCIA DE INFORMATICA'
  },

  {
    expediente: '33939',
    nombre: 'DELGADO HERNANDEZ ALFONSO',
    cargo: 'CONTROLADOR DE RECURSOS PUBLICO "F"',
    token: '9175',
    area: 'SUBGERENCIA DE INFORMATICA'
  },

  {
    expediente: '32910',
    nombre: 'GERMAN CORONA ELISEO',
    cargo: 'VIGILANTE I',
    token: '2864',
    area: 'SUBGERENCIA DE INFORMATICA'
  },

  {
    expediente: '38662',
    nombre: 'MARTINEZ REYES CARLOS XAVIER',
    cargo: 'PRESTADOR DE SERVICIO',
    token: '7341',
    area: 'SUBGERENCIA DE INFORMATICA'
  },

  {
    expediente: '5624',
    nombre: 'PERRUSQUIA ZENTENO ROSA MARIA',
    cargo: 'AYUDANTE ADMINISTRATIVO "A"',
    token: '6958',
    area: 'SUBGERENCIA DE INFORMATICA'
  },

  {
    expediente: '26084',
    nombre: 'PEREZ JIMENEZ MARIA SUSANA',
    cargo: 'TÉCNICO PROFESIONAL ADMINISTRATIVO "A" N-10',
    token: '1547',
    area: 'SUBGERENCIA DE INFORMATICA'
  },

  {
    expediente: '30343',
    nombre: 'RUIZ HURTADO JOSE LUIS',
    cargo: 'SUPERVISOR MANTTO INST FIJAS N-10',
    token: '8293',
    area: 'SUBGERENCIA DE INFORMATICA'
  },

  {
    expediente: '32307',
    nombre: 'SANCHEZ DELGADO CARLOS',
    cargo: 'VIGILANTE "C"',
    token: '5762',
    area: 'SUBGERENCIA DE INFORMATICA'
  },

  {
    expediente: '32298',
    nombre: 'HERNANDEZ HUITRON GABRIELA',
    cargo: 'AYUDANTE ADMINISTRATIVO "A"',
    token: '3419',
    area: 'SUBGERENCIA DE INFORMATICA'
  },

  {
    expediente: '42271',
    nombre: 'GISELLE YAZMIN MUNGUIA RAMOS',
    cargo: 'AYUDANTE ADMINISTRATIVO "A"',
    token: '3719',
    area: 'COORD. DE PROGR. Y DISEÑO DE SI'
  },

  {
    expediente: '22174',
    nombre: 'REBOLLO BECERRA LUIS MARTIN',
    cargo: 'COORDINADOR DE PROYECTOS "M"',
    token: '8452',
    area: 'COORD. DE PROGR. Y DISEÑO DE SI'
  },

  {
    expediente: '23476',
    nombre: 'SANCHEZ HERNANDEZ VICTOR MANUEL',
    cargo: 'COORDINADOR DE PROYECTOS "M"',
    token: '5167',
    area: 'COORD. DE PROGR. Y DISEÑO DE SI'
  },

  {
    expediente: '14768',
    nombre: 'TREJO LOPEZ ALEJANDRA',
    cargo: 'JEFE DE PROYECTOS "K"',
    token: '2938',
    area: 'COORD. DE PROGR. Y DISEÑO DE SI'
  },

  {
    expediente: '40041',
    nombre: 'HERNANDEZ ROMERO ANA LAURA',
    cargo: 'VIGILANTE "A"',
    token: '7641',
    area: 'COORD. DE PROGR. Y DISEÑO DE SI'
  },

  {
    expediente: '8225',
    nombre: 'ARTURO CUAUHTEMOC BARCENAS DIAZ',
    cargo: 'TÉCNICO PROFESIONAL ADMINISTRATIVO "A" N-10',
    token: '4826',
    area: 'COORD. DE SOPORTE DE OPERACION'
  },

  {
    expediente: '29890',
    nombre: 'GARCIA SANCHEZ XOCHITL',
    cargo: 'SUPERVISOR MANTTO INST FIJAS "I"',
    token: '7315',
    area: 'COORD. DE SOPORTE DE OPERACION'
  },

  {
    expediente: '31127',
    nombre: 'GASPAR LARA JENNIFER MIRIAM',
    cargo: 'COORDINADOR DE PROYECTOS "M"',
    token: '9642',
    area: 'COORD. DE SOPORTE DE OPERACION'
  },

  {
    expediente: '30275',
    nombre: 'GUILLEN RAMIREZ JESSICA EVELIN',
    cargo: 'VIGILANTE "A"',
    token: '3587',
    area: 'COORD. DE SOPORTE DE OPERACION'
  },

  {
    expediente: '31995',
    nombre: 'LOPEZ CRUZ ROBERTO CARLOS',
    cargo: 'VIGILANTE "A"',
    token: '6153',
    area: 'COORD. DE SOPORTE DE OPERACION'
  },

  {
    expediente: '29411',
    nombre: 'PINEDA RAMIREZ LUIS ANTONIO',
    cargo: 'JEFE DE PROYECTOS C N-10',
    token: '8274',
    area: 'COORD. DE SOPORTE DE OPERACION'
  },

  {
    expediente: '31985',
    nombre: 'RAMOS TORRES SAMUEL',
    cargo: 'VIGILANTE "A"',
    token: '2496',
    area: 'COORD. DE SOPORTE DE OPERACION'
  },

  {
    expediente: '30282',
    nombre: 'SANCHEZ RANGEL JOEL SAUL',
    cargo: 'VIGILANTE "A"',
    token: '5738',
    area: 'COORD. DE SOPORTE DE OPERACION'
  },

  {
    expediente: '30442',
    nombre: 'SIERRA AGUILAR ERICK',
    cargo: 'VIGILANTE "A"',
    token: '9165',
    area: 'COORD. DE SOPORTE DE OPERACION'
  },

  {
    expediente: '24154',
    nombre: 'SYMOR MARES LUIS FERNANDO',
    cargo: 'TÉCNICO PROFESIONAL ADMINISTRATIVO "A" N-10',
    token: '3417',
    area: 'COORD. DE SOPORTE DE OPERACION'
  },

  {
    expediente: '36702',
    nombre: 'VILLANUEVA CONTRERAS GUENDA NAVANY',
    cargo: 'VIGILANTE I',
    token: '7682',
    area: 'COORD. DE SOPORTE DE OPERACION'
  },

  {
    expediente: '30295',
    nombre: 'VELEZ ROJAS HUMBERTO',
    cargo: 'VIGILANTE "C"',
    token: '5263',
    area: 'COORD. DE SOPORTE DE OPERACION'
  },

  {
    expediente: '34956',
    nombre: 'ANAYA RAMIREZ ROSA MARIA',
    cargo: 'TÉCNICO PROFESIONAL ADMINISTRATIVO "A" N-10',
    token: '7263',
    area: 'SUBGCIA. DE ORG. Y METODOS'
  },

  {
    expediente: '20259',
    nombre: 'DE LA CRUZ BRAVO ANGELICA LETICIA',
    cargo: 'TÉCNICO PROFESIONAL ADMINISTRATIVO "A" N-10',
    token: '3918',
    area: 'SUBGCIA. DE ORG. Y METODOS'
  },

  {
    expediente: '24111',
    nombre: 'ESPINOSA HERNANDEZ ATANASIO',
    cargo: 'COORDINADOR DE PROYECTOS "C" N-12',
    token: '8475',
    area: 'SUBGCIA. DE ORG. Y METODOS'
  },

  {
    expediente: '31648',
    nombre: 'ESQUIVEL MARIA DEL CARMEN',
    cargo: 'VIGILANTE "A"',
    token: '2659',
    area: 'SUBGCIA. DE ORG. Y METODOS'
  },

  {
    expediente: '24296',
    nombre: 'GONZALEZ VELASCO RAFAEL JUAN',
    cargo: 'SUBJEFE DEPARTAMENTO "A" N-14',
    token: '6137',
    area: 'SUBGCIA. DE ORG. Y METODOS'
  },

  {
    expediente: '27499',
    nombre: 'GOROSTIETA CARAPIA JOSE',
    cargo: 'SUBJEFE DEPARTAMENTO "A" N-14',
    token: '9582',
    area: 'SUBGCIA. DE ORG. Y METODOS'
  },

  {
    expediente: '20961',
    nombre: 'MARRON HUERTA JAVIER JESUS',
    cargo: 'COORDINADOR ESPECIALIZADO',
    token: '4326',
    area: 'SUBGCIA. DE ORG. Y METODOS'
  },

  {
    expediente: '30725',
    nombre: 'MEDINA EQUIHUA MIGUEL',
    cargo: 'JEFE SECTOR VIGILANCIA "D"',
    token: '7814',
    area: 'SUBGCIA. DE ORG. Y METODOS'
  },

  {
    expediente: '14512',
    nombre: 'MORA VACA LETICIA',
    cargo: 'TÉCNICO PROFESIONAL ADMINISTRATIVO "A" N-10',
    token: '5297',
    area: 'SUBGCIA. DE ORG. Y METODOS'
  },

  {
    expediente: '34639',
    nombre: 'ROBLES PEÑALOZA JORGE ARTURO',
    cargo: 'VIGILANTE "C"',
    token: '8643',
    area: 'SUBGCIA. DE ORG. Y METODOS'
  },

  {
    expediente: '29591',
    nombre: 'ROMAN BRAVO GABRIELA',
    cargo: 'JEFE DE PROYECTOS "C" N-10',
    token: '3175',
    area: 'SUBGCIA. DE ORG. Y METODOS'
  },

  {
    expediente: '21068',
    nombre: 'RUIZ LOOH GABRIEL RUBEN',
    cargo: 'JEFE DE PROYECTOS "K"',
    token: '6428',
    area: 'SUBGCIA. DE ORG. Y METODOS'
  },

  {
    expediente: '26884',
    nombre: 'SANCHEZ AHUELICAN GUMESINDA',
    cargo: 'COORDINADADOR ESPECIALIZADO',
    token: '9156',
    area: 'SUBGCIA. DE ORG. Y METODOS'
  },

  {
    expediente: '12563',
    nombre: 'SARMIENTO BRAVO SOLEDAD',
    cargo: 'COORDINADOR DE PROYECTOS "A" N-14',
    token: '2734',
    area: 'SUBGCIA. DE ORG. Y METODOS'
  },

  {
    expediente: '18226',
    nombre: 'TOXQUI PALACIOS JOSE GERARDO',
    cargo: 'JEFE DE PROYECTOS "C" N-10',
    token: '5369',
    area: 'SUBGCIA. DE ORG. Y METODOS'
  },

  {
    expediente: '15298',
    nombre: 'VILLICAÑA ESPINO JULIO CESAR',
    cargo: 'COORDINADOR DE PROYECTOS "A" N-14',
    token: '8247',
    area: 'SUBGCIA. DE ORG. Y METODOS'
  },

  {
    expediente: '27782',
    nombre: 'YAÑEZ AGUILAR EDGAR DAVID',
    cargo: 'COLABORADOR',
    token: '4518',
    area: 'SUBGCIA. DE ORG. Y METODOS'
  }

]

// ======================================================
// VALIDACIÓN
// ======================================================

console.log('')
console.log('==========================================')
console.log('       CARGA DE EMPLEADOS Y TOKENS')
console.log('==========================================')
console.log(`Empleados en archivo: ${empleados.length}`)
console.log('')

// Este archivo debe contener exactamente 62
if (empleados.length !== 62) {

  console.error(
    `ERROR: El archivo contiene ${empleados.length} empleados.`
  )

  console.error(
    'Se esperaban exactamente 62.'
  )

  process.exit(1)
}

// ======================================================
// VALIDAR EXPEDIENTES
// ======================================================

const expedientes =
  empleados.map(
    empleado =>
      String(empleado.expediente).trim()
  )

const expedientesDuplicados =
  expedientes.filter(
    (expediente, index) =>
      expedientes.indexOf(expediente) !== index
  )

if (expedientesDuplicados.length > 0) {

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

  const token =
    String(empleado.token).trim()

  if (!/^\d{4}$/.test(token)) {

    console.error(
      `ERROR: Token inválido para ${empleado.expediente}: ${token}`
    )

    process.exit(1)
  }
}

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
    // GENERAR HASH
    // ==================================================

    const tokenHash =
      await bcrypt.hash(
        token,
        12
      )

    // ==================================================
    // BUSCAR EMPLEADO
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
        token_hash,
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
    // NO ENCONTRADO
    // ==================================================

    if (!existente) {

      console.error(
        `NO ENCONTRADO: ${expediente} - ${empleado.nombre}`
      )

      noEncontrados++

      continue
    }

    // ==================================================
    // ACTUALIZAR
    // ==================================================
    //
    // IMPORTANTE:
    //
    // NO modificamos:
    //
    // ya_voto
    // acceso_bloqueado
    //
    // Así no destruimos el estado de votación.
    //

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
        `ERROR: No se recuperó ${expediente} después de actualizar.`
      )

      errores++

      continue
    }

    // ==================================================
    // VERIFICAR HASH
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
      `   Token verificado: TRUE`
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
console.log('==========================================')
console.log('       SINCRONIZACIÓN TERMINADA')
console.log('==========================================')

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

console.log('==========================================')
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

  console.log(
    'LA SINCRONIZACIÓN TERMINÓ CON INCIDENCIAS.'
  )

  process.exitCode = 1
}