require('dotenv').config();
const mongoose = require('mongoose');
const Agencia = require('../models/Agencia');

const agencias = [
  {
    nombre: 'Sierra Gorda Ecotours',
    descripcion: 'Es una de las más emblemáticas. Se especializan en turismo sustentable y ofrecen recorridos por toda la reserva de la biosfera.',
    telefono: '4410000000',
    rnt: 'RNT-001',
    estado: 'activo'
  },
  {
    nombre: 'Aventúrate',
    descripcion: 'Ubicada en el centro de Jalpan, es muy reconocida por sus guías certificados y tours personalizados a cascadas y miradores.',
    telefono: '4410000001',
    rnt: 'RNT-002',
    estado: 'activo'
  },
  {
    nombre: 'Agencia Turística Sierra Gorda',
    descripcion: 'Enfocada en actividades de aventura como kayak en la presa, ciclismo de montaña y senderismo cultural.',
    telefono: '4410000002',
    rnt: 'RNT-003',
    estado: 'activo'
  },
  {
    nombre: 'Turismo Explorer',
    descripcion: 'Ofrece paquetes completos que incluyen transporte y recorridos por los puntos más icónicos de la Sierra.',
    telefono: '4410000003',
    rnt: 'RNT-004',
    estado: 'activo'
  },
  {
    nombre: 'Xierra Secreta',
    descripcion: 'Conocida por organizar rutas menos convencionales y experiencias de conexión con la naturaleza.',
    telefono: '4410000004',
    rnt: 'RNT-005',
    estado: 'activo'
  }
];

async function seedAgencias() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI no encontrada en .env');
    }

    console.log('Conectando a la base de datos...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado exitosamente a MongoDB');

    console.log('Borrando agencias existentes...');
    await Agencia.deleteMany();

    console.log('Insertando agencias nuevas...');
    await Agencia.insertMany(agencias);
    
    console.log('¡Seeding de agencias completado con éxito!');
    process.exit(0);
  } catch (error) {
    console.error('Error en seeding:', error);
    process.exit(1);
  }
}

seedAgencias();
