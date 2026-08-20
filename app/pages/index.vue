<template>

  <div class="pantalla">

    <div class="tarjeta">

      <!-- ================================= -->
      <!-- LOGIN -->
      <!-- ================================= -->

      <div v-if="!empleado && !votoRegistrado">

        <h1>SISTEMA DE VOTACIÓN</h1>

        <p>Ingresa tu número de expediente</p>

        <input
          v-model="expediente"
          type="text"
          inputmode="numeric"
          placeholder="Número de expediente"
          autocomplete="off"
        />

        <p>Ingresa tu token</p>

        <input
          v-model="token"
          type="password"
          inputmode="numeric"
          placeholder="Token"
          autocomplete="off"
          @keyup.enter="entrar"
        />

        <button
          @click="entrar"
          :disabled="cargando"
        >
          {{ cargando ? 'VALIDANDO...' : 'ENTRAR' }}
        </button>

        <p
          v-if="mensaje"
          class="mensaje"
        >
          {{ mensaje }}
        </p>

      </div>


      <!-- ================================= -->
      <!-- EMPLEADO -->
      <!-- ================================= -->

      <div
        v-if="empleado && !votoRegistrado"
        class="votacion"
      >

        <h1>¡BIENVENIDO!</h1>

        <h2>
          {{ empleado.nombre }}
        </h2>

        <div class="datos-empleado">

          <p>
            <strong>Expediente:</strong>
            {{ empleado.expediente }}
          </p>

          <p>
            <strong>Área:</strong>
            {{ empleado.area || 'Sin área' }}
          </p>

          <p>
            <strong>Cargo:</strong>
            {{ empleado.cargo || 'Sin cargo' }}
          </p>

        </div>


        <hr>


        <!-- ================================= -->
        <!-- CANDIDATOS -->
        <!-- ================================= -->

        <h3>
          CANDIDATOS DE TU ÁREA
        </h3>

        <p class="info">
          Solamente puedes votar por empleados
          que pertenecen a tu misma área.
        </p>


        <div
          v-if="cargandoCandidatos"
          class="cargando"
        >
          Cargando candidatos...
        </div>


        <div
          v-else-if="candidatos.length === 0"
          class="mensaje"
        >
          No hay candidatos disponibles
          en tu área.
        </div>


        <div
          v-else
          class="candidatos"
        >

          <button
            v-for="candidato in candidatos"
            :key="candidato.id"
            class="candidato"
            :class="{
              seleccionado:
                candidatoSeleccionado?.id === candidato.id
            }"
            @click="seleccionar(candidato)"
          >

            <strong>
              {{ candidato.nombre }}
            </strong>

            <span>
              {{ candidato.cargo || 'Sin cargo' }}
            </span>

          </button>

        </div>


        <!-- ================================= -->
        <!-- VOTAR -->
        <!-- ================================= -->

        <button
          class="boton-votar"
          :disabled="
            !candidatoSeleccionado ||
            votando
          "
          @click="registrarVoto"
        >

          {{
            votando
              ? 'GUARDANDO VOTO...'
              : 'CONFIRMAR VOTO'
          }}

        </button>


        <p
          v-if="mensaje"
          class="mensaje"
        >
          {{ mensaje }}
        </p>

      </div>


      <!-- ================================= -->
      <!-- VOTO REGISTRADO -->
      <!-- ================================= -->

      <div
        v-if="votoRegistrado"
        class="exito"
      >

        <div class="check">
          ✓
        </div>

        <h1>
          VOTO REGISTRADO
        </h1>

        <p>
          Tu voto ha sido registrado correctamente.
        </p>

        <p>
          Gracias por participar.
        </p>

      </div>

    </div>

  </div>

</template>


<script setup>

const supabase = useSupabase()


// ==========================================
// LOGIN
// ==========================================

const expediente = ref('')
const token = ref('')

const empleado = ref(null)


// ==========================================
// VOTACIÓN
// ==========================================

const candidatos = ref([])
const candidatoSeleccionado = ref(null)

const votando = ref(false)
const cargando = ref(false)
const cargandoCandidatos = ref(false)

const votoRegistrado = ref(false)


// ==========================================
// MENSAJES
// ==========================================

const mensaje = ref('')


// ==========================================
// ENTRAR
// ==========================================

async function entrar() {

  mensaje.value = ''

  const numeroExpediente =
    expediente.value.trim()

  const tokenIngresado =
    token.value.trim()


  if (!numeroExpediente) {

    mensaje.value =
      'Ingresa tu número de expediente'

    return
  }


  if (!tokenIngresado) {

    mensaje.value =
      'Ingresa tu token'

    return
  }


  cargando.value = true


  try {

    /*
     * Login mediante nuestro endpoint:
     *
     * POST /api/login
     *
     * El endpoint valida el token
     * en el servidor.
     */

    const respuesta = await $fetch(
      '/api/login',
      {
        method: 'POST',

        body: {
          expediente:
            numeroExpediente,

          token:
            tokenIngresado
        }
      }
    )


    if (!respuesta?.ok) {

      mensaje.value =
        respuesta?.mensaje ||
        'Expediente o token incorrecto.'

      return
    }


    // Login correcto

    empleado.value =
      respuesta.empleado

    token.value = ''

    mensaje.value = ''

    candidatoSeleccionado.value = null

    await cargarCandidatos()

  } catch (error) {

    console.error(
      'ERROR EN LOGIN:',
      error
    )

    mensaje.value =
      error?.data?.mensaje ||
      error?.data?.statusMessage ||
      error?.message ||
      'No fue posible iniciar sesión.'

  } finally {

    cargando.value = false

  }
}


// ==========================================
// CARGAR CANDIDATOS
// ==========================================

async function cargarCandidatos() {

  if (!empleado.value) {
    return
  }


  cargandoCandidatos.value = true

  mensaje.value = ''


  try {

    const {
      data,
      error
    } = await supabase
      .from('empleados')
      .select(`
        id,
        expediente,
        nombre,
        cargo,
        area
      `)
      .eq(
        'area',
        empleado.value.area
      )
      .order(
        'nombre',
        {
          ascending: true
        }
      )


    if (error) {

      console.error(
        'ERROR CANDIDATOS:',
        error
      )

      mensaje.value =
        `No se pudieron cargar los candidatos: ${error.message}`

      candidatos.value = []

      return
    }


    candidatos.value =
      (data || []).filter(
        candidato =>
          candidato.id !==
          empleado.value.id
      )

  } catch (error) {

    console.error(
      'ERROR CARGANDO CANDIDATOS:',
      error
    )

    mensaje.value =
      'No se pudieron cargar los candidatos.'

    candidatos.value = []

  } finally {

    cargandoCandidatos.value = false

  }
}


// ==========================================
// SELECCIONAR CANDIDATO
// ==========================================

function seleccionar(candidato) {

  candidatoSeleccionado.value =
    candidato

  mensaje.value = ''
}


// ==========================================
// DISPOSITIVO
// ==========================================

function obtenerDispositivo() {

  if (
    typeof navigator === 'undefined'
  ) {

    return {
      dispositivo: 'Desconocido',
      sistema_operativo: 'Desconocido',
      navegador: 'Desconocido'
    }
  }


  const userAgent =
    navigator.userAgent || ''


  let sistemaOperativo =
    'Desconocido'


  if (/Windows NT/i.test(userAgent))
    sistemaOperativo = 'Windows'

  else if (/Android/i.test(userAgent))
    sistemaOperativo = 'Android'

  else if (/iPhone|iPad|iPod/i.test(userAgent))
    sistemaOperativo = 'iOS'

  else if (/Mac OS X/i.test(userAgent))
    sistemaOperativo = 'macOS'

  else if (/Linux/i.test(userAgent))
    sistemaOperativo = 'Linux'


  let navegador =
    'Desconocido'


  if (/Edg\//i.test(userAgent))
    navegador = 'Microsoft Edge'

  else if (/OPR\//i.test(userAgent))
    navegador = 'Opera'

  else if (/Chrome\//i.test(userAgent))
    navegador = 'Google Chrome'

  else if (/Firefox\//i.test(userAgent))
    navegador = 'Mozilla Firefox'

  else if (
    /Safari\//i.test(userAgent) &&
    !/Chrome\//i.test(userAgent)
  )
    navegador = 'Safari'


  let dispositivo =
    'Computadora'


  if (/iPhone/i.test(userAgent))
    dispositivo = 'iPhone'

  else if (/iPad/i.test(userAgent))
    dispositivo = 'iPad'

  else if (/Android/i.test(userAgent))
    dispositivo = 'Dispositivo Android'

  else if (/Macintosh/i.test(userAgent))
    dispositivo = 'Mac'

  else if (/Windows/i.test(userAgent))
    dispositivo = 'Computadora Windows'


  return {
    dispositivo,
    sistema_operativo:
      sistemaOperativo,
    navegador
  }
}


// ==========================================
// REGISTRAR VOTO
// ==========================================

async function registrarVoto() {

  if (!empleado.value) {

    mensaje.value =
      'Empleado no identificado'

    return
  }


  if (!candidatoSeleccionado.value) {

    mensaje.value =
      'Selecciona una persona para votar'

    return
  }


  votando.value = true
  mensaje.value = ''


  const dispositivo =
    obtenerDispositivo()


  try {

    const {
      data,
      error
    } = await supabase.rpc(
      'registrar_voto',
      {
        p_empleado_id:
          empleado.value.id,

        p_candidato_id:
          candidatoSeleccionado.value.id,

        p_dispositivo:
          dispositivo.dispositivo,

        p_sistema_operativo:
          dispositivo.sistema_operativo,

        p_navegador:
          dispositivo.navegador
      }
    )


    if (error) {

      console.error(
        'ERROR AL REGISTRAR VOTO:',
        error
      )

      mensaje.value =
        error.message ||
        'No fue posible registrar el voto.'

      return
    }


    console.log(
      'VOTO REGISTRADO:',
      data
    )


    if (
      data &&
      data.ok === false
    ) {

      mensaje.value =
        data.mensaje ||
        'No fue posible registrar el voto.'

      return
    }


    votoRegistrado.value = true

    empleado.value = null

    candidatoSeleccionado.value = null

    candidatos.value = []

    expediente.value = ''

    token.value = ''

  } catch (error) {

    console.error(
      'ERROR AL REGISTRAR VOTO:',
      error
    )

    mensaje.value =
      error?.message ||
      'No fue posible registrar el voto.'

  } finally {

    votando.value = false

  }
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
    Helvetica,
    sans-serif;

  background:
    linear-gradient(
      135deg,
      #f1f5f9,
      #e2e8f0
    );
}


.pantalla {

  min-height: 100vh;

  display: flex;

  justify-content: center;

  align-items: center;

  padding: 20px;
}


.tarjeta {

  width: 100%;

  max-width: 650px;

  padding: 40px;

  background: white;

  border-radius: 18px;

  text-align: center;

  box-shadow:
    0 10px 30px
    rgba(0,0,0,.15);
}


h1 {

  margin-top: 0;

  color: #1e293b;
}


h2 {

  color: #176b3a;

  margin-bottom: 20px;
}


h3 {

  color: #334155;
}


input {

  width: 100%;

  padding: 15px;

  margin: 10px 0;

  border:
    1px solid #cbd5e1;

  border-radius: 9px;

  font-size: 17px;

  outline: none;
}


input:focus {

  border-color:
    #2563eb;

  box-shadow:
    0 0 0 3px
    rgba(37,99,235,.12);
}


button {

  width: 100%;

  padding: 14px;

  margin-top: 10px;

  border: none;

  border-radius: 9px;

  background: #334155;

  color: white;

  font-size: 16px;

  cursor: pointer;
}


button:hover {

  background: #1e293b;
}


button:disabled {

  background: #94a3b8;

  cursor: not-allowed;
}


.datos-empleado {

  background: #f8fafc;

  border:
    1px solid #e2e8f0;

  border-radius: 12px;

  padding: 15px;

  margin-top: 20px;

  text-align: left;
}


.datos-empleado p {

  margin: 8px 0;
}


.info {

  color: #64748b;

  font-size: 14px;
}


.cargando {

  padding: 25px;

  color: #64748b;
}


.candidatos {

  display: flex;

  flex-direction: column;

  gap: 10px;

  margin-top: 20px;
}


.candidato {

  display: flex;

  flex-direction: column;

  align-items: flex-start;

  text-align: left;

  background: #f1f5f9;

  color: #1e293b;

  border:
    2px solid transparent;
}


.candidato:hover {

  background: #e2e8f0;
}


.candidato.seleccionado {

  background: #dbeafe;

  border-color: #2563eb;
}


.candidato strong {

  font-size: 16px;
}


.candidato span {

  margin-top: 5px;

  font-size: 14px;

  color: #64748b;
}


.boton-votar {

  margin-top: 25px;

  background: #176b3a;
}


.boton-votar:hover {

  background: #12562f;
}


.mensaje {

  margin-top: 20px;

  color: #b91c1c;

  font-weight: bold;
}


.exito {

  padding: 35px;

  background: #ecfdf5;

  border:
    1px solid #a7f3d0;

  border-radius: 14px;

  color: #166534;
}


.check {

  width: 70px;

  height: 70px;

  margin: 0 auto 20px;

  display: flex;

  justify-content: center;

  align-items: center;

  border-radius: 50%;

  background: #22c55e;

  color: white;

  font-size: 40px;

  font-weight: bold;
}


hr {

  border: 0;

  border-top:
    1px solid #e2e8f0;

  margin: 28px 0;
}


@media (max-width: 700px) {

  .pantalla {
    padding: 15px;
  }

  .tarjeta {
    padding: 25px 20px;
  }

}

</style>