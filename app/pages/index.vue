<template>
  <div class="pantalla">
    <div class="tarjeta">

      <!-- ENTRADA DEL EMPLEADO -->
      <div v-if="!empleado && !votoRegistrado">

        <h1>SISTEMA DE VOTACIÓN</h1>

        <p>Escribe tu nombre completo</p>

        <input
          v-model="nombre"
          type="text"
          placeholder="Nombre completo"
          @keyup.enter="entrar"
        />

        <button @click="entrar" :disabled="cargando">
          {{ cargando ? 'BUSCANDO...' : 'ENTRAR' }}
        </button>

        <p v-if="mensaje" class="mensaje">
          {{ mensaje }}
        </p>

      </div>

      <!-- VOTACIÓN -->
      <div v-if="empleado && !votoRegistrado">

        <h1>VOTACIÓN</h1>

        <p>Bienvenido</p>

        <h2>{{ empleado.nombre }}</h2>

        <p>
          <strong>Cargo:</strong> {{ empleado.cargo }}
        </p>

        <p v-if="empleado.area">
          <strong>Área:</strong> {{ empleado.area }}
        </p>

        <hr>

        <h3>Selecciona por quién quieres votar</h3>

        <div class="candidatos">

          <button
            v-for="candidato in candidatos"
            :key="candidato.id"
            class="candidato"
            :class="{
              seleccionado: candidatoSeleccionado?.id === candidato.id
            }"
            @click="seleccionar(candidato)"
          >
            <strong>{{ candidato.nombre }}</strong>
            <span>{{ candidato.cargo }}</span>
          </button>

        </div>

        <button
          class="boton-votar"
          :disabled="!candidatoSeleccionado || votando"
          @click="registrarVoto"
        >
          {{ votando ? 'GUARDANDO VOTO...' : 'CONFIRMAR VOTO' }}
        </button>

        <p v-if="mensaje" class="mensaje">
          {{ mensaje }}
        </p>

      </div>

      <!-- VOTO REGISTRADO -->
      <div v-if="votoRegistrado" class="exito">

        <h1>✅ VOTO REGISTRADO</h1>

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

const nombre = ref('')
const empleado = ref(null)
const candidatos = ref([])
const candidatoSeleccionado = ref(null)

const mensaje = ref('')
const cargando = ref(false)
const votando = ref(false)
const votoRegistrado = ref(false)


// ==========================================
// ENTRAR
// ==========================================

async function entrar() {

  mensaje.value = ''
  empleado.value = null
  candidatoSeleccionado.value = null
  votoRegistrado.value = false

  if (!nombre.value.trim()) {
    mensaje.value = 'Escribe tu nombre completo'
    return
  }

  cargando.value = true

  // ==========================================
  // BUSCAR EMPLEADO
  // ==========================================

  const { data, error } = await supabase
    .from('empleados')
    .select(`
      id,
      nombre,
      cargo,
      area,
      ya_voto,
      acceso_bloqueado
    `)
    .ilike('nombre', nombre.value.trim())
    .maybeSingle()

  cargando.value = false

  if (error) {

    console.error(error)

    mensaje.value =
      'No se pudo consultar la base de datos'

    return
  }

  if (!data) {

    mensaje.value =
      'Empleado no encontrado'

    return
  }


  // ==========================================
  // COMPROBAR SI YA VOTÓ
  // ==========================================

  if (data.ya_voto || data.acceso_bloqueado) {

    mensaje.value =
      'Este empleado ya realizó su voto. El acceso a votar está bloqueado.'

    return
  }


  // ==========================================
  // COMPROBAR LÍMITE DE VOTACIÓN
  // ==========================================

  const {
    data: config,
    error: errorConfig
  } = await supabase
    .from('configuracion')
    .select(`
      limite_activo,
      fecha_limite
    `)
    .eq('id', 1)
    .maybeSingle()


  if (errorConfig) {

    console.error(errorConfig)

    mensaje.value =
      'No se pudo comprobar el horario de votación'

    return
  }


  // Si existe un límite y ya pasó
  if (
    config?.limite_activo === true &&
    config?.fecha_limite &&
    new Date() >= new Date(config.fecha_limite)
  ) {

    mensaje.value =
      '⏰ El tiempo para votar ya terminó. Ya no se aceptan votos.'

    return
  }


  // ==========================================
  // TODO CORRECTO
  // ==========================================

  empleado.value = data

  await cargarCandidatos()

}


// ==========================================
// CARGAR CANDIDATOS
// ==========================================

async function cargarCandidatos() {

  const {
    data,
    error
  } = await supabase
    .from('empleados')
    .select(`
      id,
      nombre,
      cargo,
      area
    `)
    .order('nombre')


  if (error) {

    console.error(error)

    mensaje.value =
      'No se pudieron cargar los candidatos'

    return
  }


  candidatos.value = data || []

}


// ==========================================
// SELECCIONAR CANDIDATO
// ==========================================

function seleccionar(candidato) {

  candidatoSeleccionado.value = candidato

  mensaje.value = ''

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


  // ==========================================
  // COMPROBAR NUEVAMENTE EL LÍMITE
  // ==========================================
  // Esto evita que alguien tenga abierta
  // la pantalla y vote justo después del límite.

  const {
    data: config,
    error: errorConfig
  } = await supabase
    .from('configuracion')
    .select(`
      limite_activo,
      fecha_limite
    `)
    .eq('id', 1)
    .maybeSingle()


  if (errorConfig) {

    console.error(errorConfig)

    votando.value = false

    mensaje.value =
      'No se pudo comprobar el horario de votación'

    return
  }


  if (
    config?.limite_activo === true &&
    config?.fecha_limite &&
    new Date() >= new Date(config.fecha_limite)
  ) {

    votando.value = false

    mensaje.value =
      '⏰ El tiempo para votar ya terminó. Ya no se aceptan votos.'

    return
  }


  // ==========================================
  // REGISTRAR VOTO
  // ==========================================

  const {
    data,
    error
  } = await supabase.rpc(
    'registrar_voto',
    {
      p_empleado_id:
        empleado.value.id,

      p_candidato_id:
        candidatoSeleccionado.value.id
    }
  )


  votando.value = false


  if (error) {

    console.error(error)

    mensaje.value =
      error.message ||
      'No fue posible registrar el voto'

    return
  }


  console.log(
    'Resultado:',
    data
  )


  votoRegistrado.value = true

}


</script>


<style scoped>

* {
  box-sizing: border-box;
}

:global(body) {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #f2f2f2;
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

  border-radius: 15px;

  text-align: center;

  box-shadow:
    0 5px 20px rgba(0, 0, 0, .15);
}

h1 {
  margin-top: 0;
}

input {
  width: 100%;

  padding: 14px;

  margin: 15px 0;

  border: 1px solid #ccc;

  border-radius: 8px;

  font-size: 16px;
}

button {
  width: 100%;

  padding: 14px;

  margin-top: 10px;

  border: none;

  border-radius: 8px;

  background: #333;

  color: white;

  font-size: 16px;

  cursor: pointer;
}

button:hover {
  background: #555;
}

button:disabled {
  background: #999;

  cursor: not-allowed;
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

  text-align: left;

  background: #eee;

  color: #222;

  border: 2px solid transparent;
}

.candidato:hover {
  background: #ddd;
}

.candidato.seleccionado {
  background: #dbeafe;

  border-color: #2563eb;
}

.candidato span {
  margin-top: 5px;

  font-size: 14px;

  color: #666;
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

  color: #c00;

  font-weight: bold;
}

.exito {
  padding: 30px;

  background: #e8f7ed;

  border-radius: 10px;

  color: #176b3a;
}

hr {
  border: 0;

  border-top: 1px solid #ddd;

  margin: 25px 0;
}

</style>