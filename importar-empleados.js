import { createClient } from '@supabase/supabase-js'
import pkg from 'xlsx'
const { readFile, utils } = pkg

const supabaseUrl = 'https://zknsmqlwwofkalqjkdry.supabase.co'
const supabaseKey = 'sb_publishable_rVIqNkjBurwoZI4915oWDw_glIJunVl'

const supabase = createClient(
  supabaseUrl,
  supabaseKey
)

// Cargar el archivo Excel de la gerencia
const workbook = readFile('Personal_Gerencia_Organizacion_y_Sistemas.xlsx')
let todosLosEmpleados = []

// Recorrer todas las hojas del Excel
workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName]
  const data = utils.sheet_to_json(sheet, { header: 1 })
  
  data.forEach((row) => {
    let expediente, nombre, cargo
    
    if (row[0] && !isNaN(row[0]) && row[1]) {
      expediente = row[0]
      nombre = row[1]
      cargo = row[2]
    }

    if (expediente && nombre) {
      todosLosEmpleados.push({
        expediente: String(expediente).trim(),
        nombre: String(nombre).trim(),
        cargo: cargo ? String(cargo).trim() : '',
        area: sheetName.trim(),
        ya_voto: false,
        acceso_bloqueado: false
      })
    }
  })
})

console.log(`Encontrados ${todosLosEmpleados.length} empleados en el Excel.`)

// Subir a Supabase usando 'expediente' como identificador único
const { data, error } = await supabase
  .from('empleados')
  .upsert(todosLosEmpleados, {
    onConflict: 'expediente'
  })

if (error) {
  console.error('ERROR:', error)
  process.exit(1)
}

console.log(`✅ Empleados cargados correctamente por expediente.`)