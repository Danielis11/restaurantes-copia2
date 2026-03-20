const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const bcrypt = require('bcryptjs');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB Conectado');
  
  const email = 'turismo@admin.com';
  const existente = await Admin.findOne({ email });
  
  if (existente) {
    console.log('El admin de turismo ya existe.');
    process.exit(0);
  }

  const nuevoAdmin = await Admin.create({
    nombre: 'Admin',
    apellido: 'Turismo',
    email: email,
    password: 'password123',
    telefono: '1234567890',
    rol: 'admin-turismo'
  });

  console.log('Admin Turismo test creado:', nuevoAdmin);
  process.exit(0);
})
.catch(err => {
  console.error('Error de conexión:', err);
  process.exit(1);
});
