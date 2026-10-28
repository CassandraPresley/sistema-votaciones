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

// Restablecimiento Específico por Área
const areaSeleccionadaReset = ref('')
const empleadoSeleccionadoReset = ref('')

let canalRealtime = null
let timerInterval = null

// Autenticación desde la tabla 'administradores' (usuario, password_hash, activo)
const loginAdmin = async () => {
  errorAdmin.value = ''
  if (!userAdmin.value.trim() || !passAdmin.value.trim()) {
    errorAdmin.value = 'Ingresa usuario y contraseña.'
    return
  }

  const { data: adminUser, error } = await supabase
    .from('administradores')
    .select('*')
    .eq('usuario', userAdmin.value.trim())
    .eq('password_hash', passAdmin.value.trim())
    .eq('activo', true)
    .single()

  if (error || !adminUser) {
    errorAdmin.value = 'Usuario o contraseña incorrectos, o cuenta inactiva.'
  } else {
    adminAutenticado.value = true
    errorAdmin.value = ''
    await cargarDatosAdmin()
    iniciarSuscripcionRealtime()
  }
}

const cargarDatosAdmin = async () => {
  // 1. Cargar Empleados
  const { data: empData } = await supabase.from('empleados').select('*')
  if (empData) {
    empleadosLista.value = empData
    totalEmpleados.value = empData.length
    areasDisponibles.value = [...new Set(empData.map(e => e.area).filter(Boolean))]
  }

  // 2. Cargar Votos
  const { data: votosData } = await supabase
    .from('votos')
    .select('*')
    .order('fecha_hora', { ascending: false })
    
  if (votosData) {
    listaVotos.value = votosData
    totalVotos.value = votosData.length
  }

  porcentajeParticipacion.value = totalEmpleados.value > 0 
    ? ((totalVotos.value / totalEmpleados.value) * 100).toFixed(1) 
    : 0

  // 3. Cargar Límite de Tiempo
  const { data: configData } = await supabase.from('config_votacion').select('*').eq('id', 1).single()
  if (configData && configData.limite_tiempo) {
    iniciarCuentaRegresiva(configData.limite_tiempo)
  } else {
    tiempoRestanteStr.value = 'Sin límite de tiempo activo'
    votacionCerrada.value = false
  }
}

// Escuchar cambios en la base de datos en tiempo real
const iniciarSuscripcionRealtime = () => {
  if (canalRealtime) supabase.removeChannel(canalRealtime)

  canalRealtime = supabase
    .channel('public:votos_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'votos' }, () => cargarDatosAdmin())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'empleados' }, () => cargarDatosAdmin())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'config_votacion' }, () => cargarDatosAdmin())
    .subscribe()
}

// Configuración exacta con hora local (Previene falsa alerta de "Tiempo Agotado")
const guardarLimiteTiempo = async () => {
  if (!fechaLimiteInput.value || !horaLimiteInput.value) {
    alert('Selecciona una fecha y hora válidas.')
    return
  }

  const [year, month, day] = fechaLimiteInput.value.split('-')
  const [hours, minutes] = horaLimiteInput.value.split(':')
  const fechaLocal = new Date(year, month - 1, day, hours, minutes, 0)
  const fechaISO = fechaLocal.toISOString()

  const { error } = await supabase.from('config_votacion').upsert({ id: 1, limite_tiempo: fechaISO })

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
  tiempoRestanteStr.value = 'Sin límite de tiempo activo'
  votacionCerrada.value = false
  alert('Límite de tiempo restablecido.')
  cargarDatosAdmin()
}

const iniciarCuentaRegresiva = (limiteISO) => {
  if (timerInterval) clearInterval(timerInterval)

  timerInterval = setInterval(() => {
    const ahora = new Date().getTime()
    const limiteDate = new Date(limiteISO).getTime()
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

      let textoTiempo = '🟢 Tiempo restante: '
      if (dias > 0) textoTiempo += `${dias}d `
      textoTiempo += `${horas}h ${minutos}m ${segundos}s`

      tiempoRestanteStr.value = textoTiempo
    }
  }, 1000)
}

// PODIO GENERAL: Candidatos con más votos a nivel global
const podioGeneral = computed(() => {
  if (listaVotos.value.length === 0) return []

  const conteo = {}
  listaVotos.value.forEach(v => {
    const key = v.expediente_candidato || v.nombre_candidato
    if (!conteo[key]) {
      conteo[key] = {
        nombre: v.nombre_candidato,
        expediente: v.expediente_candidato,
        area: v.area,
        votos: 0
      }
    }
    conteo[key].votos++
  })

  return Object.values(conteo).sort((a, b) => b.votos - a.votos).slice(0, 3)
})

// PODIO POR ÁREAS
const podioPorArea = computed(() => {
  const conteoArea = {}
  
  areasDisponibles.value.forEach(area => {
    conteoArea[area] = {}
  })

  listaVotos.value.forEach(v => {
    if (!conteoArea[v.area]) conteoArea[v.area] = {}
    const cand = v.nombre_candidato
    conteoArea[v.area][cand] = (conteoArea[v.area][cand] || 0) + 1
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

// Lista de empleados filtrada para el restablecimiento específico
const empleadosDeAreaSeleccionada = computed(() => {
  if (!areaSeleccionadaReset.value) return []
  return empleadosLista.value.filter(e => e.area === areaSeleccionadaReset.value)
})

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

const restablecerTodosLosVotos = async () => {
  if (!confirm('⚠️ ¿ATENCIÓN: Quieres borrar TODOS los votos y reiniciar el sistema por completo?')) return
  
  await supabase.from('votos').delete().neq('id', 0)
  await supabase.from('empleados').update({ ya_voto: false }).eq('ya_voto', true)
  
  alert('Se han restablecido todos los votos del sistema.')
  cargarDatosAdmin()
}

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
      <p>Ingresa tu usuario y contraseña</p>
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

      <!-- PODIO GENERAL -->
      <div class="box podio-general-box">
        <h3>🏆 Podio General (Más Votados Globales)</h3>
        <div v-if="podioGeneral.length > 0" class="podio-general-cards">
          <div v-for="(cand, idx) in podioGeneral" :key="cand.expediente" class="p-card" :class="'p-' + (idx + 1)">
            <div class="medalla">{{ idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉' }}</div>
            <h4>{{ cand.nombre }}</h4>
            <p>{{ cand.area }}</p>
            <span class="votos-count">{{ cand.votos }} votos</span>
          </div>
        </div>
        <p v-else class="sub center">Aún no se han registrado votos en el sistema.</p>
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
        <h3>📊 Resultados por Áreas</h3>
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
            <h4>Restablecer Voto por Área:</h4>
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
            <p class="sub">Borra todos los votos registrados.</p>
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
        <h3>⚡ Votos Registrados en Tiempo Real</h3>
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

/* Podio General */
.podio-general-box { background: #fefde8; border-color: #fef08a; }
.podio-general-cards { display: flex; gap: 15px; justify-content: center; margin-top: 10px; flex-wrap: wrap; }
.p-card { background: white; border: 2px solid #e5e7eb; border-radius: 10px; padding: 15px; text-align: center; flex: 1; min-width: 180px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.p-card.p-1 { border-color: #f59e0b; background: #fffbeb; }
.p-card.p-2 { border-color: #9ca3af; }
.p-card.p-3 { border-color: #d97706; }
.medalla { font-size: 32px; margin-bottom: 5px; }
.p-card h4 { margin: 0; font-size: 16px; color: #1f2937; }
.p-card p { margin: 3px 0; font-size: 12px; color: #6b7280; }
.votos-count { background: #f3f4f6; color: #1f2937; padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 12px; display: inline-block; margin-top: 5px; }

.row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
.inp { padding: 10px; border: 1px solid #ccc; border-radius: 6px; outline: none; margin-bottom: 10px; width: 100%; box-sizing: border-box; }
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
th { background: #f2f2f2; position: sticky; top: 0; }
.chip { background: #e8f4f8; color: #2980b9; padding: 3px 6px; border-radius: 4px; font-size: 11px; }
.btn-primary, .btn-blue, .btn-gray, .btn-orange, .btn-red, .btn-green, .btn-out { padding: 10px 15px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; color: white; }
.btn-primary, .btn-blue { background: #2c3e50; }
.btn-gray { background: #7f8c8d; }
.btn-orange { background: #e67e22; }
.btn-red, .btn-out { background: #c0392b; }
.btn-green { background: #27ae60; font-size: 15px; width: 100%; }
.err { color: red; font-size: 13px; }
.sub { font-size: 12px; color: #777; }
.center { text-align: center; }
.lnk { font-size: 13px; color: #2980b9; text-decoration: none; display: block; margin-top: 10px; }
</style>