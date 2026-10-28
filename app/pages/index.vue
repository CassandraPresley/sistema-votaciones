<script setup>
import { ref } from 'vue'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zknsmqlwwofkalqjkdry.supabase.co'
const supabaseKey = 'sb_publishable_rVIqNkjBurwoZI4915oWDw_glIJunVl'
const supabase = createClient(supabaseUrl, supabaseKey)

const expediente = ref('')
const mensaje = ref('')
const tipoMensaje = ref('')
const empleadoLogueado = ref(null)
const votoExitoso = ref(false)

const verificarAcceso = async () => {
  mensaje.value = ''
  tipoMensaje.value = ''

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
  votoExitoso.value = false
}

const registrarVoto = async () => {
  if (!empleadoLogueado.value) return

  // Actualizar en Supabase que el empleado ya votó
  const { error } = await supabase
    .from('empleados')
    .update({ ya_voto: true })
    .eq('expediente', empleadoLogueado.value.expediente)

  if (error) {
    mensaje.value = 'Error al registrar el voto. Inténtalo de nuevo.'
    tipoMensaje.value = 'error'
    return
  }

  votoExitoso.value = true
}

const reiniciarSesion = () => {
  empleadoLogueado.value = null
  expediente.value = ''
  mensaje.value = ''
  tipoMensaje.value = ''
  votoExitoso.value = false
}
</script>

<template>
  <div class="container">
    <div class="card">
      <h2>SISTEMA DE VOTACIÓN</h2>
      <p class="subtit">Ingresa tu número de expediente</p>

      <!-- Formulario de Ingreso -->
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
          <button type="submit" class="btn">ENTRAR</button>
        </form>
      </div>

      <!-- Pantalla de Votación -->
      <div v-else-if="!votoExitoso" class="votar-section">
        <div class="info-empleado">
          <p><strong>Nombre:</strong> {{ empleadoLogueado.nombre }}</p>
          <p><strong>Cargo:</strong> {{ empleadoLogueado.cargo }}</p>
        </div>
        <hr />
        <h3>Confirma tu participación</h3>
        <p class="nota">Haz clic en el botón para emitir tu voto oficial.</p>
        
        <button @click="registrarVoto" class="btn-votar">EMITIR VOTO</button>
        <br /><br />
        <button @click="reiniciarSesion" class="btn-salir">Cancelar / Salir</button>
      </div>

      <!-- Pantalla de Voto Exitoso -->
      <div v-else class="votar-section">
        <div class="exito-icono">✅</div>
        <h3>¡Voto registrado con éxito!</h3>
        <p class="subtit">Tu sufragio ha sido guardado correctamente en el sistema.</p>
        <button @click="reiniciarSesion" class="btn">Finalizar / Siguiente</button>
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
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f4f6f9;
  font-family: Arial, sans-serif;
}
.card {
  background: white;
  padding: 40px 30px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 420px;
  text-align: center;
}
h2 {
  color: #1a252f;
  margin-bottom: 8px;
  font-size: 22px;
}
.subtit {
  color: #666;
  font-size: 14px;
  margin-bottom: 20px;
}
.form-group {
  margin-bottom: 20px;
}
input {
  width: 100%;
  padding: 14px;
  font-size: 16px;
  border: 1px solid #ccd1d1;
  border-radius: 8px;
  box-sizing: border-box;
  text-align: center;
  outline: none;
}
.btn {
  width: 100%;
  padding: 14px;
  background-color: #2c3e50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}
.btn:hover { background-color: #1a252f; }
.btn-votar {
  width: 100%;
  padding: 14px;
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 10px;
}
.btn-votar:hover { background-color: #219653; }
.mensaje {
  margin-top: 15px;
  padding: 12px;
  border-radius: 6px;
  font-size: 14px;
}
.mensaje.error { background-color: #f8d7da; color: #721c24; }
.mensaje.exito { background-color: #d4edda; color: #155724; }
.info-empleado {
  text-align: left;
  margin-bottom: 15px;
  font-size: 14px;
  color: #444;
}
.nota {
  color: #555;
  margin: 15px 0;
  font-size: 14px;
}
.btn-salir {
  background-color: #7f8c8d;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.exito-icono {
  font-size: 40px;
  margin-bottom: 10px;
}
.link-admin {
  font-size: 13px;
  color: #2980b9;
  text-decoration: none;
}
.link-admin:hover { text-decoration: underline; }
</style>