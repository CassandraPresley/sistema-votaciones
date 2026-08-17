<template>
  <div class="pantalla">
    <div class="panel">

      <!-- ========================================= -->
      <!-- ENCABEZADO -->
      <!-- ========================================= -->

      <div v-if="sesion" class="encabezado">
        <div>
          <h1>PANEL DE ADMINISTRADOR</h1>
          <p>Bienvenido, {{ usuario }}</p>
        </div>

        <button class="btn-salir" @click="salir">
          CERRAR SESIÓN
        </button>
      </div>


      <!-- ========================================= -->
      <!-- LOGIN -->
      <!-- ========================================= -->

      <div v-if="!sesion" class="login">

        <h1>ADMINISTRADOR</h1>

        <p>Ingresa tus datos</p>

        <input
          v-model="usuario"
          type="text"
          placeholder="Usuario"
          autocomplete="username"
          @keyup.enter="entrar"
        />

        <input
          v-model="password"
          type="password"
          placeholder="Contraseña"
          autocomplete="current-password"
          @keyup.enter="entrar"
        />

        <button
          class="btn azul"
          @click="entrar"
          :disabled="cargando"
        >
          {{ cargando ? 'ENTRANDO...' : 'ENTRAR' }}
        </button>

        <p v-if="mensaje" class="error">
          {{ mensaje }}
        </p>

      </div>


      <!-- ========================================= -->
      <!-- PANEL ADMINISTRADOR -->
      <!-- ========================================= -->

      <div v-else>

        <!-- MENSAJE -->

        <div
          v-if="mensaje"
          class="mensaje"
        >
          {{ mensaje }}
        </div>


        <!-- ========================================= -->
        <!-- LIMITE DE VOTACIÓN -->
        <!-- ========================================= -->

        <section class="seccion">

          <h2>⏰ Límite de votación</h2>

          <p
            v-if="
              configuracion &&
              configuracion.limite_activo &&
              configuracion.fecha_limite
            "
          >
            Límite actual:

            <strong>
              {{ mostrarFecha(configuracion.fecha_limite) }}
            </strong>
          </p>

          <p v-else>
            <strong>
              La votación no tiene límite de fecha y hora.
            </strong>
          </p>

          <label>
            Selecciona fecha y hora:
          </label>

          <input
            v-model="fechaLimite"
            type="datetime-local"
          />

          <button
            class="btn azul"
            @click="guardarLimite"
          >
            💾 GUARDAR LÍMITE
          </button>

          <button
            class="btn naranja"
            @click="quitarLimite"
          >
            ❌ QUITAR LÍMITE
          </button>

        </section>


        <!-- ========================================= -->
        <!-- CONTROL DE TODOS LOS VOTOS -->
        <!-- ========================================= -->

        <section class="seccion">

          <h2>🔄 Control de votos</h2>

          <p>
            Esta opción permitirá que todos los empleados vuelvan a votar
            y eliminará los votos registrados.
          </p>

          <button
            class="btn rojo"
            @click="restablecerTodos"
          >
            🔄 RESTABLECER TODOS LOS VOTOS
          </button>

        </section>


        <!-- ========================================= -->
        <!-- RESTABLECER EMPLEADO -->
        <!-- ========================================= -->

        <section class="seccion">

          <h2>👤 Restablecer acceso de un empleado</h2>

          <select v-model="empleadoSeleccionado">

            <option value="">
              Selecciona un empleado
            </option>

            <option
              v-for="empleado in empleados"
              :key="empleado.id"
              :value="empleado.id"
            >
              {{ empleado.nombre }}
            </option>

          </select>

          <button
            class="btn verde"
            @click="restablecerEmpleado"
            :disabled="!empleadoSeleccionado"
          >
            🔓 RESTABLECER ACCESO
          </button>

        </section>


        <!-- ========================================= -->
        <!-- REPORTE -->
        <!-- ========================================= -->

        <section class="seccion">

          <div class="titulo-seccion">

            <div>
              <h2>📊 Reporte de votos</h2>

              <p>
                Solo el administrador puede consultar esta información.
              </p>
            </div>

            <div class="botones-reporte">

              <button
                class="btn azul boton-reporte"
                @click="cargarReporte"
              >
                📊 VER REPORTE
              </button>

              <button
                class="btn verde boton-reporte"
                @click="descargarExcel"
                :disabled="!reporte.length"
              >
                📥 DESCARGAR EXCEL
              </button>

            </div>

          </div>


          <!-- TABLA -->

          <div
            v-if="reporte.length"
            class="tabla-contenedor"
          >

            <table>

              <thead>

                <tr>
                  <th>Empleado</th>
                  <th>Cargo</th>
                  <th>Área</th>
                  <th>Votó por</th>
                  <th>Cargo del candidato</th>
                  <th>Área del candidato</th>
                </tr>

              </thead>


              <tbody>

                <tr
                  v-for="fila in reporte"
                  :key="fila.id"
                >

                  <td>
                    {{ fila.empleado_nombre }}
                  </td>

                  <td>
                    {{ fila.empleado_cargo }}
                  </td>

                  <td>
                    {{ fila.empleado_area || 'Sin área' }}
                  </td>

                  <td>
                    <strong>
                      {{ fila.candidato_nombre }}
                    </strong>
                  </td>

                  <td>
                    {{ fila.candidato_cargo || 'Sin cargo' }}
                  </td>

                  <td>
                    {{ fila.candidato_area || 'Sin área' }}
                  </td>

                </tr>

              </tbody>

            </table>

          </div>


          <div
            v-else
            class="sin-datos"
          >
            No hay votos registrados todavía.
          </div>

        </section>


        <!-- ========================================= -->
        <!-- PODIO -->
        <!-- ========================================= -->

        <section class="seccion">

          <div class="titulo-seccion">

            <div>

              <h2>🏆 Podio de ganadores</h2>

              <p>
                Las tres personas con más votos.
              </p>

            </div>

            <button
              class="btn amarillo boton-reporte"
              @click="cargarPodio"
            >
              🏆 VER PODIO
            </button>

          </div>


          <!-- PODIO -->

          <div
            v-if="podio.length"
            class="podio"
          >

            <div
              v-for="(persona, index) in podio"
              :key="persona.id"
              class="puesto"
              :class="{
                primero: index === 0,
                segundo: index === 1,
                tercero: index === 2
              }"
            >

              <div class="medalla">

                <span v-if="index === 0">
                  🥇
                </span>

                <span v-else-if="index === 1">
                  🥈
                </span>

                <span v-else>
                  🥉
                </span>

              </div>


              <div class="datos-podio">

                <strong>
                  {{ persona.nombre }}
                </strong>

                <span>
                  {{ persona.cargo }}
                </span>

                <small>
                  {{ persona.area || 'Sin área' }}
                </small>

              </div>


              <div class="cantidad-votos">

                {{ persona.votos }}

                <small>
                  {{ persona.votos === 1 ? 'voto' : 'votos' }}
                </small>

              </div>

            </div>

          </div>


          <div
            v-else
            class="sin-datos"
          >
            Todavía no hay votos suficientes para mostrar el podio.
          </div>

        </section>

      </div>

    </div>
  </div>
</template>


<script setup>

import * as XLSX from 'xlsx'

const supabase = useSupabase()


// ==========================================
// VARIABLES
// ==========================================

const usuario = ref('')
const password = ref('')

const sesion = ref(false)

const cargando = ref(false)

const mensaje = ref('')

const configuracion = ref(null)

const fechaLimite = ref('')

const empleados = ref([])

const empleadoSeleccionado = ref('')

const reporte = ref([])

const podio = ref([])


// ==========================================
// LOGIN
// ==========================================

async function entrar() {

  mensaje.value = ''

  const usuarioIngresado =
    usuario.value.trim()

  const passwordIngresada =
    password.value


  if (
    !usuarioIngresado ||
    !passwordIngresada
  ) {

    mensaje.value =
      'Escribe usuario y contraseña'

    return
  }


  cargando.value = true


  const {
    data,
    error
  } = await supabase

    .from('administradores')

    .select(
      'id, usuario, password_hash, activo'
    )

    .ilike(
      'usuario',
      usuarioIngresado
    )

    .eq(
      'activo',
      true
    )

    .maybeSingle()


  cargando.value = false


  if (error) {

    console.error(
      'Error login:',
      error
    )

    mensaje.value =
      'Error al conectar con Supabase'

    return
  }


  if (!data) {

    mensaje.value =
      'Usuario o contraseña incorrectos'

    return
  }


  if (
    data.password_hash !==
    passwordIngresada
  ) {

    mensaje.value =
      'Usuario o contraseña incorrectos'

    return
  }


  // LOGIN CORRECTO

  usuario.value =
    data.usuario

  password.value = ''

  sesion.value = true


  await cargarConfiguracion()

  await cargarEmpleados()

}


// ==========================================
// CERRAR SESIÓN
// ==========================================

function salir() {

  sesion.value = false

  usuario.value = ''

  password.value = ''

  mensaje.value = ''

  reporte.value = []

  podio.value = []

}


// ==========================================
// CARGAR CONFIGURACIÓN
// ==========================================

async function cargarConfiguracion() {

  const {
    data,
    error
  } = await supabase

    .from('configuracion')

    .select('*')

    .eq(
      'id',
      1
    )

    .maybeSingle()


  if (error) {

    console.error(error)

    mensaje.value =
      'No se pudo cargar la configuración'

    return
  }


  configuracion.value =
    data


  if (
    data?.fecha_limite
  ) {

    const fecha =
      new Date(
        data.fecha_limite
      )


    const year =
      fecha.getFullYear()

    const month =
      String(
        fecha.getMonth() + 1
      ).padStart(
        2,
        '0'
      )

    const day =
      String(
        fecha.getDate()
      ).padStart(
        2,
        '0'
      )

    const hours =
      String(
        fecha.getHours()
      ).padStart(
        2,
        '0'
      )

    const minutes =
      String(
        fecha.getMinutes()
      ).padStart(
        2,
        '0'
      )


    fechaLimite.value =
      `${year}-${month}-${day}T${hours}:${minutes}`

  } else {

    fechaLimite.value = ''

  }

}


// ==========================================
// GUARDAR LIMITE
// ==========================================

async function guardarLimite() {

  mensaje.value = ''


  if (!fechaLimite.value) {

    mensaje.value =
      'Selecciona una fecha y hora'

    return
  }


  const fecha =
    new Date(
      fechaLimite.value
    )


  if (
    isNaN(
      fecha.getTime()
    )
  ) {

    mensaje.value =
      'La fecha no es válida'

    return
  }


  if (
    fecha.getTime() <=
    Date.now()
  ) {

    mensaje.value =
      'La fecha debe ser posterior a la fecha y hora actual'

    return
  }


  const {
    error
  } = await supabase

    .from('configuracion')

    .update({

      limite_activo:
        true,

      fecha_limite:
        fecha.toISOString()

    })

    .eq(
      'id',
      1
    )


  if (error) {

    console.error(error)

    mensaje.value =
      'No se pudo guardar el límite'

    return
  }


  mensaje.value =
    '✅ Límite guardado correctamente'


  await cargarConfiguracion()

}


// ==========================================
// QUITAR LIMITE
// ==========================================

async function quitarLimite() {

  const confirmar =
    confirm(
      '¿Quieres quitar el límite de votación?'
    )


  if (!confirmar)
    return


  const {
    error
  } = await supabase

    .from('configuracion')

    .update({

      limite_activo:
        false,

      fecha_limite:
        null

    })

    .eq(
      'id',
      1
    )


  if (error) {

    console.error(error)

    mensaje.value =
      'No se pudo quitar el límite'

    return
  }


  fechaLimite.value = ''


  mensaje.value =
    '✅ Límite quitado correctamente'


  await cargarConfiguracion()

}


// ==========================================
// CARGAR EMPLEADOS
// ==========================================

async function cargarEmpleados() {

  const {
    data,
    error
  } = await supabase

    .from('empleados')

    .select(
      'id, nombre, cargo, area'
    )

    .order(
      'nombre'
    )


  if (error) {

    console.error(error)

    mensaje.value =
      'No se pudieron cargar los empleados'

    return
  }


  empleados.value =
    data || []

}


// ==========================================
// RESTABLECER TODOS
// ==========================================

async function restablecerTodos() {

  const confirmar =
    confirm(
      '⚠️ ¿ESTÁS SEGURO? Esto permitirá que TODOS los empleados vuelvan a votar y eliminará todos los votos actuales.'
    )


  if (!confirmar)
    return


  const {
    error
  } = await supabase

    .from('empleados')

    .update({

      ya_voto:
        false,

      acceso_bloqueado:
        false

    })

    .not(
      'id',
      'is',
      null
    )


  if (error) {

    console.error(error)

    mensaje.value =
      'No se pudieron restablecer los empleados'

    return
  }


  const {
    error: errorVotos
  } = await supabase

    .from('votos')

    .delete()

    .not(
      'id',
      'is',
      null
    )


  if (errorVotos) {

    console.error(errorVotos)

    mensaje.value =
      'Los empleados fueron restablecidos, pero hubo un problema al borrar los votos'

    return
  }


  mensaje.value =
    '✅ Todos los votos fueron restablecidos correctamente'


  reporte.value = []

  podio.value = []

}


// ==========================================
// RESTABLECER EMPLEADO
// ==========================================

async function restablecerEmpleado() {

  if (
    !empleadoSeleccionado.value
  ) {

    mensaje.value =
      'Selecciona un empleado'

    return
  }


  const id =
    empleadoSeleccionado.value


  const {
    error
  } = await supabase

    .from('empleados')

    .update({

      ya_voto:
        false,

      acceso_bloqueado:
        false

    })

    .eq(
      'id',
      id
    )


  if (error) {

    console.error(error)

    mensaje.value =
      'No se pudo restablecer el empleado'

    return
  }


  mensaje.value =
    '✅ Acceso restablecido correctamente'


  empleadoSeleccionado.value = ''

}


// ==========================================
// REPORTE
// ==========================================

async function cargarReporte() {

  mensaje.value = ''


  const {
    data,
    error
  } = await supabase

    .from('votos')

    .select(`

      id,

      empleado_id,

      candidato_id,

      empleado:empleados!votos_empleado_id_fkey(
        nombre,
        cargo,
        area
      ),

      candidato:empleados!votos_candidato_id_fkey(
        nombre,
        cargo,
        area
      )

    `)

    .order(
      'id',
      {
        ascending: false
      }
    )


  if (error) {

    console.error(error)

    mensaje.value =
      'No se pudo cargar el reporte'

    return
  }


  reporte.value =
    (data || [])
      .map(voto => ({

        id:
          voto.id,

        empleado_nombre:
          voto.empleado?.nombre || '',

        empleado_cargo:
          voto.empleado?.cargo || '',

        empleado_area:
          voto.empleado?.area || '',

        candidato_nombre:
          voto.candidato?.nombre || '',

        candidato_cargo:
          voto.candidato?.cargo || '',

        candidato_area:
          voto.candidato?.area || ''

      }))


  if (
    reporte.value.length === 0
  ) {

    mensaje.value =
      'Todavía no hay votos registrados'

  }

}


// ==========================================
// DESCARGAR REPORTE EN EXCEL
// ==========================================

function descargarExcel() {

  if (!reporte.value.length) {

    mensaje.value =
      'Primero debes cargar el reporte'

    return
  }


  // Convertir los datos del reporte
  // al formato que utilizará Excel

  const datosExcel =
    reporte.value.map(fila => ({

      'Empleado':
        fila.empleado_nombre,

      'Cargo':
        fila.empleado_cargo,

      'Área':
        fila.empleado_area ||
        'Sin área',

      'Votó por':
        fila.candidato_nombre,

      'Cargo del candidato':
        fila.candidato_cargo ||
        'Sin cargo',

      'Área del candidato':
        fila.candidato_area ||
        'Sin área'

    }))


  // Crear la hoja

  const hoja =
    XLSX.utils.json_to_sheet(
      datosExcel
    )


  // Ajustar ancho de columnas

  hoja['!cols'] = [

    {
      wch: 30
    },

    {
      wch: 30
    },

    {
      wch: 25
    },

    {
      wch: 30
    },

    {
      wch: 35
    },

    {
      wch: 25
    }

  ]


  // Crear libro de Excel

  const libro =
    XLSX.utils.book_new()


  // Agregar hoja

  XLSX.utils.book_append_sheet(
    libro,
    hoja,
    'Reporte de votos'
  )


  // Descargar archivo

  XLSX.writeFile(
    libro,
    'reporte_votos.xlsx'
  )


  mensaje.value =
    '✅ Excel descargado correctamente'

}


// ==========================================
// PODIO
// ==========================================

async function cargarPodio() {

  mensaje.value = ''


  const {
    data,
    error
  } = await supabase

    .from('votos')

    .select(
      'candidato_id'
    )


  if (error) {

    console.error(error)

    mensaje.value =
      'No se pudo cargar el podio'

    return
  }


  const conteo = {}


  for (
    const voto of data || []
  ) {

    conteo[
      voto.candidato_id
    ] =
      (
        conteo[
          voto.candidato_id
        ] || 0
      ) + 1

  }


  const ids =
    Object.keys(
      conteo
    )
      .map(
        Number
      )


  if (
    !ids.length
  ) {

    podio.value = []

    mensaje.value =
      'Todavía no hay votos'

    return
  }


  const {
    data: personas,
    error: errorPersonas
  } = await supabase

    .from('empleados')

    .select(
      'id, nombre, cargo, area'
    )

    .in(
      'id',
      ids
    )


  if (errorPersonas) {

    console.error(
      errorPersonas
    )

    mensaje.value =
      'No se pudieron cargar los candidatos'

    return
  }


  podio.value =
    (personas || [])

      .map(
        persona => ({

          ...persona,

          votos:
            conteo[
              persona.id
            ] || 0

        })
      )

      .sort(
        (a, b) =>
          b.votos - a.votos
      )

      .slice(
        0,
        3
      )

}


// ==========================================
// FORMATO FECHA
// ==========================================

function mostrarFecha(fecha) {

  if (!fecha)
    return ''

  return new Date(fecha)
    .toLocaleString(
      'es-MX',
      {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    )

}

</script>


<style scoped>

* {
  box-sizing: border-box;
}


:global(body) {

  margin: 0;

  font-family:
    Arial,
    sans-serif;

  background:
    #f2f2f2;

  color:
    #222;

}


.pantalla {

  min-height:
    100vh;

  padding:
    30px 20px;

}


.panel {

  width:
    100%;

  max-width:
    1200px;

  margin:
    auto;

}


/* ========================================= */
/* ENCABEZADO */
/* ========================================= */

.encabezado {

  background:
    #222;

  color:
    white;

  padding:
    25px;

  border-radius:
    15px;

  margin-bottom:
    20px;

  display:
    flex;

  justify-content:
    space-between;

  align-items:
    center;

  gap:
    20px;

}


.encabezado h1 {

  margin:
    0 0 8px;

}


.encabezado p {

  margin:
    0;

}


/* ========================================= */
/* LOGIN */
/* ========================================= */

.login {

  max-width:
    500px;

  margin:
    80px auto;

  background:
    white;

  padding:
    40px;

  border-radius:
    15px;

  text-align:
    center;

  box-shadow:
    0 5px 20px
    rgba(
      0,
      0,
      0,
      .15
    );

}


.login h1 {

  margin-top:
    0;

}


.login p {

  color:
    #666;

}


/* ========================================= */
/* SECCIONES */
/* ========================================= */

.seccion {

  background:
    white;

  padding:
    25px;

  margin-bottom:
    20px;

  border-radius:
    15px;

  box-shadow:
    0 3px 12px
    rgba(
      0,
      0,
      0,
      .1
    );

}


.seccion h2 {

  margin-top:
    0;

}


.seccion p {

  color:
    #555;

}


/* ========================================= */
/* TITULO */
/* ========================================= */

.titulo-seccion {

  display:
    flex;

  justify-content:
    space-between;

  align-items:
    center;

  gap:
    20px;

}


.titulo-seccion h2 {

  margin-bottom:
    5px;

}


.titulo-seccion p {

  margin-top:
    0;

}


/* BOTONES DEL REPORTE */

.botones-reporte {

  display:
    flex;

  gap:
    10px;

  flex-wrap:
    wrap;

}


.boton-reporte {

  width:
    auto;

  min-width:
    160px;

}


.botones-reporte .btn {

  width:
    auto;

  min-width:
    180px;

}


/* ========================================= */
/* INPUTS */
/* ========================================= */

input,
select {

  width:
    100%;

  padding:
    13px;

  margin:
    8px 0;

  border:
    1px solid #ccc;

  border-radius:
    8px;

  font-size:
    16px;

}


label {

  display:
    block;

  margin-top:
    15px;

  font-weight:
    bold;

}


/* ========================================= */
/* BOTONES */
/* ========================================= */

button {

  border:
    none;

  border-radius:
    8px;

  padding:
    13px 18px;

  cursor:
    pointer;

  font-size:
    15px;

}


.btn {

  width:
    100%;

  color:
    white;

  margin-top:
    10px;

}


.azul {

  background:
    #2563eb;

}


.naranja {

  background:
    #ea580c;

}


.rojo {

  background:
    #dc2626;

}


.verde {

  background:
    #16a34a;

}


.amarillo {

  background:
    #ca8a04;

}


.btn-salir {

  background:
    #b91c1c;

  color:
    white;

  white-space:
    nowrap;

}


button:hover {

  opacity:
    .9;

}


button:disabled {

  opacity:
    .5;

  cursor:
    not-allowed;

}


/* ========================================= */
/* MENSAJES */
/* ========================================= */

.mensaje {

  padding:
    15px;

  margin-bottom:
    20px;

  background:
    #e8f7ed;

  color:
    #176b3a;

  border-radius:
    8px;

  font-weight:
    bold;

}


.error {

  color:
    #c00;

}


/* ========================================= */
/* TABLA */
/* ========================================= */

.tabla-contenedor {

  overflow-x:
    auto;

  margin-top:
    20px;

}


table {

  width:
    100%;

  min-width:
    950px;

  border-collapse:
    collapse;

}


th,
td {

  padding:
    12px;

  border-bottom:
    1px solid #ddd;

  text-align:
    left;

  vertical-align:
    top;

}


th {

  background:
    #222;

  color:
    white;

  white-space:
    nowrap;

}


tbody tr:hover {

  background:
    #f7f7f7;

}


/* ========================================= */
/* SIN DATOS */
/* ========================================= */

.sin-datos {

  margin-top:
    20px;

  padding:
    25px;

  text-align:
    center;

  background:
    #f5f5f5;

  border-radius:
    10px;

  color:
    #666;

}


/* ========================================= */
/* PODIO */
/* ========================================= */

.podio {

  display:
    grid;

  gap:
    15px;

  margin-top:
    20px;

}


.puesto {

  padding:
    20px;

  border-radius:
    12px;

  background:
    #f5f5f5;

  display:
    flex;

  align-items:
    center;

  gap:
    20px;

  border:
    2px solid transparent;

}


.puesto.primero {

  background:
    #fff7d6;

  border-color:
    #eab308;

}


.puesto.segundo {

  background:
    #f1f1f1;

  border-color:
    #9ca3af;

}


.puesto.tercero {

  background:
    #fff0e5;

  border-color:
    #c2410c;

}


.medalla {

  font-size:
    40px;

  min-width:
    55px;

  text-align:
    center;

}


.datos-podio {

  flex:
    1;

  display:
    flex;

  flex-direction:
    column;

  gap:
    5px;

}


.datos-podio strong {

  font-size:
    18px;

}


.datos-podio span {

  color:
    #555;

}


.datos-podio small {

  color:
    #777;

}


.cantidad-votos {

  font-size:
    24px;

  font-weight:
    bold;

  color:
    #176b3a;

  text-align:
    center;

}


.cantidad-votos small {

  display:
    block;

  font-size:
    13px;

  color:
    #555;

}


/* ========================================= */
/* CELULAR */
/* ========================================= */

@media (max-width: 700px) {

  .pantalla {

    padding:
      15px;

  }


  .encabezado {

    flex-direction:
      column;

    align-items:
      stretch;

    text-align:
      center;

  }


  .btn-salir {

    width:
      100%;

  }


  .seccion {

    padding:
      18px;

  }


  .titulo-seccion {

    flex-direction:
      column;

    align-items:
      stretch;

  }


  .botones-reporte {

    flex-direction:
      column;

  }


  .botones-reporte .btn {

    width:
      100%;

  }


  .boton-reporte {

    width:
      100%;

  }


  .puesto {

    gap:
      10px;

  }


  .medalla {

    font-size:
      30px;

    min-width:
      40px;

  }


  .datos-podio strong {

    font-size:
      15px;

  }


  .cantidad-votos {

    font-size:
      20px;

  }

}

</style>