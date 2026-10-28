<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zknsmqlwwofkalqjkdry.supabase.co'
const supabaseKey = 'sb_publishable_rVIqNkjBurwoZI4915oWDw_glIJunVl'
const supabase = createClient(supabaseUrl, supabaseKey)

// Login Admin
const adminAutenticado = ref(false)
const userAdmin = ref('')
const passAdmin = ref('')
const errorAdmin = ref('')

// Datos del Sistema
const totalEmpleados = ref(0)
const totalVotos = ref(0)
const porcentajeParticipacion = ref(0)
const listaVotos = ref([])
const empleadosLista = ref([])
const areasDisponibles = ref([])

// Límite de Tiempo
const fechaLimiteInput = ref('')
const horaLimiteInput = ref('')
const tiempoRestanteStr = ref('Sin límite de tiempo establecido')
const votacionCerrada = ref(false)
const limiteConfigurado = ref(false)

// Restablecimiento Específico por Área
const areaSeleccionadaReset = ref('')
const empleadoSeleccionadoReset = ref('')

let canalRealtime = null
let timerInterval = null

const loginAdmin = () => {
  if (userAdmin.value === 'admin' && passAdmin.value === 'admin123') {
    adminAutenticado.value = true
    errorAdmin.value = ''
    cargarDatosAdmin()
  } else {
    errorAdmin.value = 'Usuario o contraseña incorrectos.'
  }
}

const cargarDatosAdmin = async () => {
  // Cargar Empleados
  const { data: empData } = await supabase.from('empleados').select('*')
  if (empData) {
    empleadosLista.value = empData
    totalEmpleados.value = empData.length
    areasDisponibles.value = [...new Set(empData.map(e => e.area))]
  }

  // Cargar Votos
  const { data: votosData } = await supabase.from('votos').select('*').order('fecha_hora', { ascending: false })
  if (votosData) {
    listaVotos.value = votosData
    totalVotos.value = votosData.length
  }

  porcentajeParticipacion.value = totalEmpleados.value > 0 
    ? ((totalVotos.value / totalEmpleados.value) * 100).toFixed(1) 
    : 0

  // Cargar Límite de Tiempo
  const { data: configData } = await supabase.from('config_votacion').select('*').eq('id', 1).single()
  if (configData && configData.limite_tiempo) {
    limiteConfigurado.value = true
    iniciarCuentaRegresiva(configData.limite_tiempo)
  } else {
    limiteConfigurado.value = false
    tiempoRestanteStr.value = 'Sin límite de tiempo activo'
    votacionCerrada.value = false
  }
}

const iniciarCuentaRegresiva = (limiteISO) => {
  const limiteDate = new Date(limiteISO).getTime()
  if (timerInterval) clearInterval(timerInterval)

  timerInterval = setInterval(() => {
    const ahora = new Date().getTime()
    const diferencia = limiteDate - ahora

    if (diferencia <= 0) {
      tiempoRestanteStr.value = '🔴 VOTACIÓN CERRADA (Tiempo Agotado)'
      votacionCerrada.value = true
      clearInterval(timerInterval)
    } else {
      votacionCerrada.value = false
      const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24))
      const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60))
      const segundos = Math.floor((diferencia % (1000 * 60)) / 1000)
      tiempoRestanteStr.value = `🟢 Tiempo restante: ${dias}d ${horas}h ${minutos}m ${segundos}s`
    }
  }, 1000)
}

const guardarLimiteTiempo = async () => {
  if (!fechaLimiteInput.value || !horaLimiteInput.value) {
    alert('Selecciona una fecha y hora válidas.')
    return
  }
  const fechaHoraCompleta = `${fechaLimiteInput.value}T${horaLimiteInput.value}:00`
  const { error } = await supabase.from('config_votacion').upsert({ id: 1, limite_tiempo: fechaHoraCompleta })

  if (!error) {
    alert('Límite de tiempo guardado exitosamente.')
    cargarDatosAdmin()
  } else {
    alert('Error al establecer límite de tiempo.')
  }
}

const borrarLimiteTiempo = async () => {
  if (!confirm('¿Deseas quitar el límite de tiempo y reabrir la votación?')) return
  await supabase.from('config_votacion').update({ limite_tiempo: null }).eq('id', 1)
  if (timerInterval) clearInterval(timerInterval)
  limiteConfigurado.value = false
  tiempoRestanteStr.value = 'Sin límite de tiempo activo'
  votacionCerrada.value = false
  alert('Límite de tiempo restablecido.')
  cargarDatosAdmin()
}

// Empleados filtrados por área para el reset
const empleadosDeAreaSeleccionada = computed(() => {
  if (!areaSeleccionadaReset.value) return []
  return empleadosLista.value.filter(e => e.area === areaSeleccionadaReset.value)
})

// Restablecer voto de una persona
const restablecerVotoEspecifico = async () => {
  if (!empleadoSeleccionadoReset.value) {
    alert('Selecciona un empleado para restablecer su voto.')
    return
  }
  
  const exp = empleadoSeleccionadoReset.value
  await supabase.from('votos').delete().eq('expediente_votante', exp)
  await supabase.from('empleados').update({ ya_voto: false }).eq('expediente', exp)
  
  alert(`Voto del expediente ${exp} restablecido con éxito.`)
  empleadoSeleccionadoReset.value = ''
  cargarDatosAdmin()
}

// Restablecer todos los votos
const restablecerTodosLosVotos = async () => {
  if (!confirm('⚠️ ¿ATENCIÓN: Quieres borrar TODOS los votos y reiniciar el sistema por completo?')) return
  
  await supabase.from('votos').delete().neq('id', 0)
  await supabase.from('empleados').update({ ya_voto: false }).eq('ya_voto', true)
  
  alert('Se han restablecido todos los votos del sistema.')
  cargarDatosAdmin()
}

// Podio por Áreas
const podioPorArea = computed(() => {
  const conteoArea = {}
  
  areasDisponibles.value.forEach(area => {
    conteoArea[area] = {}
  })

  listaVotos.value.forEach(v => {
    if (!conteoArea[v.area]) conteoArea[v.area] = {}
    conteoArea[v.area][v.nombre_candidato] = (conteoArea[v.area][v.nombre_candidato] || 0) + 1
  })

  const podioFinal = []
  for (let area in conteoArea) {
    const candidatos = Object.entries(conteoArea[area])
      .map(([nombre, votos]) => ({ nombre, votos }))
      .sort((a, b) => b.votos - a.votos)
    podioFinal.push({ area, candidatos })
  }

  return podioFinal
})

// Exportar CSV
const descargarInformeCSV = () => {
  let csv = "Expediente Votante,Nombre Votante,Area,Expediente Candidato,Nombre Candidato,Dispositivo,Fecha y Hora\n"
  listaVotos.value.forEach(v => {
    csv += `${v.expediente_votante},"${v.nombre_votante}","${v.area}",${v.expediente_candidato},"${v.nombre_candidato}","${v.dispositivo}","${new Date(v.fecha_hora).toLocaleString()}"\n`
  })

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", "reporte_votacion_completo.csv")
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

onMounted(() => {
  canalRealtime = supabase
    .channel('admin-updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'votos' }, () => cargarDatosAdmin())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'empleados' }, () => cargarDatosAdmin())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'config_votacion' }, () => cargarDatosAdmin())
    .subscribe()
})

onUnmounted(() => {
  if (canalRealtime) supabase.removeChannel(canalRealtime)
  if (timerInterval) clearInterval(timerInterval)
})
</script>

<template>
  <div class="admin-wrapper">
    <!-- LOGIN ADMIN -->
    <div v-if="!adminAutenticado" class="login-card">
      <h2>Acceso Administrador</h2>
      <p>Ingresa usuario y contraseña de gestión</p>
      <form @submit.prevent="loginAdmin">
        <input type="text" v-model="userAdmin" placeholder="Usuario" class="inp" />
        <input type="password" v-model="passAdmin" placeholder="Contraseña" class="inp" />
        <button type="submit" class="btn-primary">Entrar</button>
      </form>
      <p v-if="errorAdmin" class="err">{{ errorAdmin }}</p>
      <NuxtLink to="/" class="lnk">Volver a inicio</NuxtLink>
    </div>

    <!-- PANEL PRINCIPAL -->
    <div v-else class="panel-card">
      <div class="panel-header">
        <h2>Panel de Control y Monitoreo Admin</h2>
        <button @click="adminAutenticado = false" class="btn-out">Cerrar Sesión</button>
      </div>

      <!-- Banner Estado de Votación -->
      <div class="status-banner" :class="{ cerrado: votacionCerrada }">
        <h3>{{ tiempoRestanteStr }}</h3>
      </div>

      <!-- Control de Tiempo Límite -->
      <div class="box">
        <h3>⏱️ Configurar Límite de Tiempo</h3>
        <div class="row">
          <input type="date" v-model="fechaLimiteInput" class="inp" />
          <input type="time" v-model="horaLimiteInput" class="inp" />
          <button @click="guardarLimiteTiempo" class="btn-blue">Establecer Límite</button>
          <button @click="borrarLimiteTiempo" class="btn-gray">Restablecer Límite</button>
        </div>
      </div>

      <!-- Métricas -->
      <div class="metrics-grid">
        <div class="m-box"><h1>{{ totalEmpleados }}</h1><p>Padrón Total</p></div>
        <div class="m-box green"><h1>{{ totalVotos }}</h1><p>Votos Realizados</p></div>
        <div class="m-box blue"><h1>{{ porcentajeParticipacion }}%</h1><p>Participación</p></div>
      </div>

      <!-- Podio por Áreas -->
      <div class="box">
        <h3>🏆 Podio por Áreas (Quién va ganando)</h3>
        <div class="podio-grid">
          <div v-for="item in podioPorArea" :key="item.area" class="podio-card">
            <h4>{{ item.area }}</h4>
            <div v-for="(cand, idx) in item.candidatos" :key="cand.nombre" class="podio-row">
              <span>{{ idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '•' }} {{ cand.nombre }}</span>
              <strong>{{ cand.votos }} votos</strong>
            </div>
            <p v-if="item.candidatos.length === 0" class="sub">Sin votos aún</p>
          </div>
        </div>
      </div>

      <!-- Opciones de Restablecimiento -->
      <div class="box">
        <h3>🔄 Opciones de Restablecimiento</h3>
        <div class="reset-box">
          <div class="sub-reset">
            <h4>Restablecer un Voto Específico por Área:</h4>
            <select v-model="areaSeleccionadaReset" class="inp">
              <option value="">-- Selecciona el Área --</option>
              <option v-for="a in areasDisponibles" :key="a" :value="a">{{ a }}</option>
            </select>
            
            <select v-model="empleadoSeleccionadoReset" class="inp" :disabled="!areaSeleccionadaReset">
              <option value="">-- Selecciona al Empleado --</option>
              <option v-for="e in empleadosDeAreaSeleccionada" :key="e.expediente" :value="e.expediente">
                {{ e.nombre }} (Exp: {{ e.expediente }}) {{ e.ya_voto ? '[Ya Votó]' : '[No ha votado]' }}
              </option>
            </select>
            
            <button @click="restablecerVotoEspecifico" class="btn-orange" :disabled="!empleadoSeleccionadoReset">
              Restablecer Este Empleado
            </button>
          </div>

          <div class="sub-reset border-left">
            <h4>Restablecer Sistema Completo:</h4>
            <p class="sub">Borra todos los votos de todas las áreas a la vez.</p>
            <button @click="restablecerTodosLosVotos" class="btn-red">Restablecer Todos los Votos</button>
          </div>
        </div>
      </div>

      <!-- Descarga Reporte -->
      <div class="box center">
        <button @click="descargarInformeCSV" class="btn-green">📥 Descargar Informe Completo de Votantes (CSV)</button>
      </div>

      <!-- Registro en Tiempo Real -->
      <div class="box">
        <h3>⚡ Votos Registrados en Tiempo Real (Quién, Por quién y Dispositivo)</h3>
        <div class="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Votante</th>
                <th>Área</th>
                <th>Candidato Votado</th>
                <th>Dispositivo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in listaVotos" :key="v.id">
                <td>{{ new Date(v.fecha_hora).toLocaleTimeString() }}</td>
                <td>{{ v.nombre_votante }} ({{ v.expediente_votante }})</td>
                <td>{{ v.area }}</td>
                <td><strong>{{ v.nombre_candidato }}</strong></td>
                <td><span class="chip">{{ v.dispositivo }}</span></td>
              </tr>
              <tr v-if="listaVotos.length === 0"><td colspan="5" class="center">No hay votos registrados.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.admin-wrapper { min-height: 100vh; background: #eaeded; padding: 20px; font-family: sans-serif; display: flex; justify-content: center; }
.login-card { background: white; padding: 30px; border-radius: 8px; width: 340px; text-align: center; margin: auto; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
.panel-card { width: 100%; max-width: 950px; background: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.status-banner { background: #1e8449; color: white; padding: 12px; border-radius: 6px; text-align: center; margin-bottom: 20px; }
.status-banner.cerrado { background: #c0392b; }
.box { background: #f8f9fa; border: 1px solid #e5e7e9; padding: 18px; border-radius: 8px; margin-bottom: 20px; }
.row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
.inp { padding: 10px; border: 1px solid #ccc; border-radius: 6px; outline: none; margin-bottom: 10px; }
.metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
.m-box { background: white; border-left: 5px solid #7f8c8d; padding: 15px; border-radius: 6px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.m-box.green { border-left-color: #27ae60; }
.m-box.blue { border-left-color: #2980b9; }
.m-box h1 { margin: 0; }
.podio-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin-top: 10px; }
.podio-card { background: white; border: 1px solid #ddd; padding: 12px; border-radius: 6px; }
.podio-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; border-bottom: 1px solid #eee; }
.reset-box { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 10px; }
.border-left { border-left: 1px solid #ddd; padding-left: 20px; }
.sub-reset { display: flex; flex-direction: column; }
.tbl-wrap { max-height: 280px; overflow-y: auto; background: white; border: 1px solid #ddd; border-radius: 6px; margin-top: 10px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
th { background: #f2