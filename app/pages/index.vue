<script setup>
import { ref, onMounted } from 'vue'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zknsmqlwwofkalqjkdry.supabase.co'
const supabaseKey = 'sb_publishable_rVIqNkjBurwoZI4915oWDw_glIJunVl'
const supabase = createClient(supabaseUrl, supabaseKey)

const expediente = ref('')
const mensaje = ref('')
const tipoMensaje = ref('')
const empleadoLogueado = ref(null)
const listaEmpleadosArea = ref([])
const candidatoSeleccionado = ref(null)
const votoExitoso = ref(false)
const votacionBloqueadaPorTiempo = ref(false)

const obtenerDispositivo = () => {
  const ua = navigator.userAgent
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'Tablet'
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return 'Móvil'
  return 'Computadora / PC'
}

const verificarTiempoActivo = async () => {
  const { data: config } = await supabase.from('config_votacion').select('*').eq('id', 1).single()
  if (config && config.limite_tiempo) {
    const ahora = new Date().getTime()
    const limite = new Date(config.limite_tiempo).getTime()
    votacionBloqueadaPorTiempo.value = ahora >= limite
  } else {
    votacionBloqueadaPorTiempo.value = false
  }
}

const verificarAcceso = async () => {
  mensaje.value = ''
  tipoMensaje.value = ''

  await verificarTiempoActivo()
  if (votacionBloqueadaPorTiempo.value) {
    mensaje.value = 'El periodo de votación ha finalizado. Acceso bloqueado.'
    tipoMensaje.value = 'error'
    return
  }

  if (!expediente.value.trim()) {
    mensaje.value = 'Por favor ingresa tu número de expediente.'
    tipoMensaje.value = 'error'
    return
  }

  const { data: empleado, error } = await supabase
    .from('empleados')
    .select('*')
    .eq('expediente', expediente.value.trim())
    .single()

  if (error || !empleado) {
    mensaje.value = 'El número de expediente no se encuentra registrado.'
    tipoMensaje.value = 'error'
    return
  }

  if (empleado.acceso_bloqueado) {
    mensaje.value = 'Este acceso se encuentra bloqueado.'
    tipoMensaje.value = 'error'
    return
  }

  if (empleado.ya_voto) {
    mensaje.value = 'Usted ya ha registrado su voto anteriormente.'
    tipoMensaje.value = 'error'
    return
  }

  empleadoLogueado.value = empleado

  // Cargar compañeros de la misma área EXCLUYENDO al propio empleado (para que no pueda votarse a sí mismo)
  const { data: companeros } = await supabase
    .from('empleados')
    .select('*')
    .eq('area', empleado.area)
    .neq('expediente', empleado.expediente)

  if (companeros) {
    listaEmpleadosArea.value = companeros
  }

  votoExitoso.value = false
}

const emitirVoto = async () => {
  if (!candidatoSeleccionado.value) {
    alert('Por favor selecciona un candidato de tu área.')
    return
  }

  const candidatoObj = listaEmpleadosArea.value.find(c => c.expediente === candidatoSeleccionado.value)
  if (!candidatoObj) {
    alert('Candidato no válido.')
    return
  }

  const { error: errVoto } = await supabase.from('votos').insert([
    {
      expediente_votante: empleadoLogueado.value.expediente,
      nombre_votante: empleadoLogueado.value.nombre,
      area: empleadoLogueado.value.area,
      expediente_candidato: candidatoObj.expediente,
      nombre_candidato: candidatoObj.nombre,
      dispositivo: obtenerDispositivo()
    }
  ])

  if (errVoto) {
    mensaje.value = 'Error al registrar el voto: ' + errVoto.message
    tipoMensaje.value = 'error'
    return
  }

  await supabase
    .from('empleados')
    .update({ ya_voto: true })
    .eq('expediente', empleadoLogueado.value.expediente)

  votoExitoso.value = true
}

const reiniciarSesion = () => {
  empleadoLogueado.value = null
  expediente.value = ''
  mensaje.value = ''
  tipoMensaje.value = ''
  candidatoSeleccionado.value = null
  votoExitoso.value = false
}

onMounted(() => {
  verificarTiempoActivo()
})
</script>

<template>
  <div class="container">
    <div class="card">
      <h2>SISTEMA DE VOTACIÓN</h2>
      <p class="subtit">Votación por Área</p>

      <div v-if="!empleadoLogueado">
        <form @submit.prevent="verificarAcceso">
          <div class="form-group">
            <input 
              type="text" 
              v-model="expediente" 
              placeholder="Número de expediente" 
              autocomplete="off"
            />
          </div>
          <button type="submit" class="btn">INGRESAR</button>
        </form>
      </div>

      <div v-else-if="!votoExitoso" class="votar-section">
        <div class="info-empleado">
          <p><strong>Nombre:</strong> {{ empleadoLogueado.nombre }}</p>
          <p><strong>Área:</strong> <span class="badge-area">{{ empleadoLogueado.area }}</span></p>
        </div>
        <hr />
        
        <h3>Selecciona a tu candidato</h3>
        <p class="instruccion">Compañeros de tu área de trabajo (no puedes votar por ti mismo):</p>

        <div class="candidatos-lista">
          <div 
            v-for="candidato in listaEmpleadosArea" 
            :key="candidato.expediente"
            class="candidato-item"
            :class="{ seleccionado: candidatoSeleccionado === candidato.expediente }"
            @click="candidatoSeleccionado = candidato.expediente"
          >
            <div class="radio-circle"></div>
            <div class="candidato-info">
              <strong>{{ candidato.nombre }}</strong>
              <small>{{ candidato.cargo }}</small>
            </div>
          </div>
        </div>

        <button @click="emitirVoto" class="btn-votar" :disabled="!candidatoSeleccionado">
          CONFIRMAR MI VOTO
        </button>
        
        <br /><br />
        <button @click="reiniciarSesion" class="btn-salir">Cancelar / Salir</button>
      </div>

      <div v-else class="votar-section">
        <div class="exito-icono">✅</div>
        <h3>¡Voto registrado con éxito!</h3>
        <p class="subtit">Tu participación ha sido guardada de forma segura.</p>
        <button @click="reiniciarSesion" class="btn">Finalizar</button>
      </div>

      <p v-if="mensaje" :class="['mensaje', tipoMensaje]">
        {{ mensaje }}
      </p>

      <div style="margin-top: 25px;">
        <NuxtLink to="/admin" class="link-admin">Ir al Panel de Administración</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f4f6f9; font-family: Arial, sans-serif; padding: 20px; }
.card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); width: 100%; max-width: 480px; text-align: center; }
h2 { color: #1a252f; margin-bottom: 5px; }
.subtit { color: #666; font-size: 14px; margin-bottom: 20px; }
.form-group { margin-bottom: 15px; }
input { width: 100%; padding: 12px; font-size: 16px; border: 1px solid #ccd1d1; border-radius: 8px; box-sizing: border-box; text-align: center; }
.btn { width: 100%; padding: 12px; background-color: #2c3e50; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: bold; cursor: pointer; }
.btn:hover { background-color: #1a252f; }
.info-empleado { text-align: left; margin-bottom: 10px; font-size: 13px; color: #444; background: #f8f9fa; padding: 10px; border-radius: 6px; }
.badge-area { color: #2980b9; font-weight: bold; }
.instruccion { font-size: 12px; color: #666; margin-bottom: 10px; text-align: left; }
.candidatos-lista { max-height: 250px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 15px; text-align: left; }
.candidato-item { display: flex; align-items: center; padding: 10px 12px; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
.candidato-item:hover { background-color: #f1f8ff; }
.candidato-item.seleccionado { background-color: #e3f2fd; border-left: 4px solid #2196f3; }
.radio-circle { width: 16px; height: 16px; border: 2px solid #aaa; border-radius: 50%; margin-right: 12px; }
.candidato-item.seleccionado .radio-circle { border-color: #2196f3; background-color: #2196f3; }
.candidato-info { display: flex; flex-direction: column; }
.candidato-info strong { font-size: 13px; color: #333; }
.candidato-info small { font-size: 11px; color: #777; }
.btn-votar { width: 100%; padding: 12px; background-color: #27ae60; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: bold; cursor: pointer; }
.btn-votar:disabled { background-color: #bdc3c7; cursor: not-allowed; }
.mensaje { margin-top: 15px; padding: 10px; border-radius: 6px; font-size: 13px; }
.mensaje.error { background-color: #f8d7da; color: #721c24; }
.mensaje.exito { background-color: #d4edda; color: #155724; }
.btn-salir { background-color: #7f8c8d; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-size: 13px; }
.exito-icono { font-size: 35px; margin-bottom: 10px; }
.link-admin { font-size: 13px; color: #2980b9; text-decoration: none; }
.link-admin:hover { text-decoration: underline; }
</style>