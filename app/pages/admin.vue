<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zknsmqlwwofkalqjkdry.supabase.co'
const supabaseKey = 'sb_publishable_rVIqNkjBurwoZI4915oWDw_glIJunVl'
const supabase = createClient(supabaseUrl, supabaseKey)

const totalEmpleados = ref(0)
const totalVotos = ref(0)
const totalPendientes = ref(0)
const porcentajeParticipacion = ref(0)
const empleadosVotaron = ref([])

let canalRealtime = null

const cargarDatos = async () => {
  // Obtener todos los empleados
  const { data, error } = await supabase
    .from('empleados')
    .select('*')

  if (error) {
    console.error('Error al cargar datos:', error)
    return
  }

  totalEmpleados.value = data.length
  const votados = data.filter(e => e.ya_voto)
  totalVotos.value = votados.length
  totalPendientes.value = totalEmpleados.value - totalVotos.value
  porcentajeParticipacion.value = totalEmpleados.value > 0 
    ? ((totalVotos.value / totalEmpleados.value) * 100).toFixed(1) 
    : 0
  
  empleadosVotaron.value = votados
}

onMounted(() => {
  cargarDatos()

  // Configurar Realtime de Supabase para escuchar cambios en la tabla 'empleados'
  canalRealtime = supabase
    .channel('cambios-votos')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'empleados' },
      (payload) => {
        console.log('Cambio detectado en tiempo real:', payload)
        cargarDatos() // Recarga automática de métricas al instante
      }
    )
    .subscribe()
})

onUnmounted(() => {
  if (canalRealtime) {
    supabase.removeChannel(canalRealtime)
  }
})
</script>

<template>
  <div class="admin-container">
    <div class="admin-card">
      <h2>Panel de Administración</h2>
      <p class="subtit">Monitoreo de Votación en Tiempo Real</p>

      <!-- Tarjetas de Estadísticas -->
      <div class="stats-grid">
        <div class="stat-box">
          <h3>{{ totalEmpleados }}</h3>
          <p>Total Catálogo</p>
        </div>
        <div class="stat-box verde">
          <h3>{{ totalVotos }}</h3>
          <p>Ya Votaron</p>
        </div>
        <div class="stat-box naranja">
          <h3>{{ totalPendientes }}</h3>
          <p>Faltantes</p>
        </div>
        <div class="stat-box azul">
          <h3>{{ porcentajeParticipacion }}%</h3>
          <p>Participación</p>
        </div>
      </div>

      <!-- Barra de Progreso -->
      <div class="progress-bar-container">
        <div class="progress-bar" :style="{ width: porcentajeParticipacion + '%' }"></div>
      </div>

      <hr class="divider" />

      <h3>Últimos Votos Registrados</h3>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Expediente</th>
              <th>Nombre</th>
              <th>Área</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="emp in empleadosVotaron" :key="emp.expediente">
              <td>{{ emp.expediente }}</td>
              <td>{{ emp.nombre }}</td>
              <td>{{ emp.area }}</td>
            </tr>
            <tr v-if="empleadosVotaron.length === 0">
              <td colspan="3" class="sin-votos">Aún no hay votos registrados.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-top: 20px;">
        <NuxtLink to="/" class="btn-regresar">Ir al Inicio de Sesión</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #eef2f5;
  font-family: Arial, sans-serif;
  padding: 20px;
}
.admin-card {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  width: 100%;
  max-width: 700px;
  text-align: center;
}
h2 {
  color: #2c3e50;
  margin-bottom: 5px;
}
.subtit {
  color: #7f8c8d;
  font-size: 14px;
  margin-bottom: 25px;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.stat-box {
  background: #f8f9fa;
  padding: 15px 10px;
  border-radius: 8px;
  border-left: 4px solid #6c757d;
}
.stat-box.verde { border-left-color: #27ae60; background: #e8f8f5; }
.stat-box.naranja { border-left-color: #e67e22; background: #fef5e7; }
.stat-box.azul { border-left-color: #2980b9; background: #ebf5fb; }
.stat-box h3 {
  margin: 0;
  font-size: 20px;
  color: #333;
}
.stat-box p {
  margin: 5px 0 0;
  font-size: 12px;
  color: #666;
}
.progress-bar-container {
  background: #e0e0e0;
  border-radius: 10px;
  height: 14px;
  width: 100%;
  overflow: hidden;
  margin-bottom: 25px;
}
.progress-bar {
  background: #27ae60;
  height: 100%;
  transition: width 0.4s ease;
}
.divider {
  border: 0;
  border-top: 1px solid #eee;
  margin: 20px 0;
}
.table-container {
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid #eaeaea;
  border-radius: 6px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th, td {
  padding: 10px;
  border-bottom: 1px solid #f2f2f2;
  text-align: left;
}
th {
  background: #f8f9fa;
  color: #333;
  position: sticky;
  top: 0;
}
.sin-votos {
  text-align: center;
  color: #888;
  padding: 20px;
}
.btn-regresar {
  display: inline-block;
  padding: 10px 20px;
  background-color: #34495e;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-size: 14px;
}
.btn-regresar:hover {
  background-color: #2c3e50;
}
</style>