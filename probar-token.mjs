import bcrypt from 'bcryptjs'

const token = '2734'

const hash =
  '$2b$12$CQY2QlQPFEL47y7tx6KlIOlUvHfBy0GW0aSnoHhYQXZBKAYqYx1E6'

const resultado = await bcrypt.compare(token, hash)

console.log('Token:', token)
console.log('¿Coincide?:', resultado)