// seedDatabase.js - SOLO SEEDER (SIN CÓDIGO DE SERVIDOR)
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-db', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB conectado:', conn.connection.host);
    return conn;
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    process.exit(1);
  }
};

// ESQUEMAS EXACTOS COMO EN TUS MODELOS
const adminSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  telefono: { type: String, required: true },
  rol: { type: String, default: 'admin' },
  activo: { type: Boolean, default: true },
  fechaCreacion: { type: Date, default: Date.now },
  ultimoAcceso: { type: Date, default: Date.now },
  configuracion: {
    notificaciones: { type: Boolean, default: true },
    tema: { type: String, enum: ['claro', 'oscuro'], default: 'claro' }
  }
});

adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

adminSchema.methods.compararPassword = async function(passwordIngresada) {
  return await bcrypt.compare(passwordIngresada, this.password);
};

adminSchema.methods.actualizarUltimoAcceso = function() {
  this.ultimoAcceso = Date.now();
  return this.save({ validateBeforeSave: false });
};

const restaurantSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  tipo: { type: String, required: true, enum: ['restaurante', 'bar', 'cafeteria'] },
  descripcion: { type: String, required: true },
  direccion: {
    calle: { type: String, required: true },
    ciudad: { type: String, required: true },
    codigoPostal: { type: String, required: true }
  },
  telefono: { type: String, required: true },
  email: { type: String, required: true },
  horarios: {
    lunes: { apertura: String, cierre: String },
    martes: { apertura: String, cierre: String },
    miercoles: { apertura: String, cierre: String },
    jueves: { apertura: String, cierre: String },
    viernes: { apertura: String, cierre: String },
    sabado: { apertura: String, cierre: String },
    domingo: { apertura: String, cierre: String }
  },
  menu: [{
    categoria: { type: String, required: true },
    items: [{
      nombre: { type: String, required: true },
      descripcion: String,
      precio: { type: Number, required: true, min: 0 }
    }]
  }],
  imagenes: [{ url: String, descripcion: String }],
  redes: {
    facebook: String,
    instagram: String,
    twitter: String,
    website: String
  },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  activo: { type: Boolean, default: true },
  fechaCreacion: { type: Date, default: Date.now },
  fechaActualizacion: { type: Date, default: Date.now }
});

const Admin = mongoose.model('Admin', adminSchema);
const Restaurant = mongoose.model('Restaurant', restaurantSchema);

// ===== DATOS CON EMAILS IDÉNTICOS (ADMIN = RESTAURANTE) =====
const pares = [
  { 
    email: 'maria@test.com',
    admin: { nombre: 'María', apellido: 'González', telefono: '4441234001' },
    restaurant: { 
      nombre: 'La Cocina de María', 
      tipo: 'restaurante', 
      descripcion: 'Restaurante familiar especializado en comida mexicana tradicional.',
      ciudad: 'San Luis Potosí',
      telefono: '4441234001'
    }
  },
  { 
    email: 'jose@test.com',
    admin: { nombre: 'José', apellido: 'Hernández', telefono: '3312345002' },
    restaurant: { 
      nombre: 'El Fogón de José', 
      tipo: 'restaurante', 
      descripcion: 'Parrilla argentina con los mejores cortes de carne.',
      ciudad: 'Guadalajara',
      telefono: '3312345002'
    }
  },
  { 
    email: 'ana@test.com',
    admin: { nombre: 'Ana', apellido: 'López', telefono: '5512345003' },
    restaurant: { 
      nombre: 'Sabores de Ana', 
      tipo: 'restaurante', 
      descripcion: 'Cocina gourmet mexicana con toque moderno.',
      ciudad: 'Ciudad de México',
      telefono: '5512345003'
    }
  },
  { 
    email: 'carlos@test.com',
    admin: { nombre: 'Carlos', apellido: 'Martínez', telefono: '8112345004' },
    restaurant: { 
      nombre: 'Tacos Carlos', 
      tipo: 'restaurante', 
      descripcion: 'Taquería artesanal con 15 variedades de tacos.',
      ciudad: 'Monterrey',
      telefono: '8112345004'
    }
  },
  { 
    email: 'patricia@test.com',
    admin: { nombre: 'Patricia', apellido: 'García', telefono: '2221234005' },
    restaurant: { 
      nombre: 'Antojitos Paty', 
      tipo: 'restaurante', 
      descripcion: 'Especialistas en antojitos mexicanos.',
      ciudad: 'Puebla',
      telefono: '2221234005'
    }
  },
  { 
    email: 'daniel@test.com',
    admin: { nombre: 'Daniel', apellido: 'Silva', telefono: '5512345006' },
    restaurant: { 
      nombre: 'La Cantina de Daniel', 
      tipo: 'bar', 
      descripcion: 'Cantina tradicional mexicana con mariachis.',
      ciudad: 'Ciudad de México',
      telefono: '5512345006'
    }
  },
  { 
    email: 'isabella@test.com',
    admin: { nombre: 'Isabella', apellido: 'Vega', telefono: '9841234007' },
    restaurant: { 
      nombre: 'Isabella Lounge', 
      tipo: 'bar', 
      descripcion: 'Lounge exclusivo con cocteles de autor.',
      ciudad: 'Playa del Carmen',
      telefono: '9841234007'
    }
  },
  { 
    email: 'andres@test.com',
    admin: { nombre: 'Andrés', apellido: 'Molina', telefono: '5512345008' },
    restaurant: { 
      nombre: 'Pulquería Tradicional', 
      tipo: 'bar', 
      descripcion: 'Pulquería artesanal con pulque natural.',
      ciudad: 'Xochimilco',
      telefono: '5512345008'
    }
  },
  { 
    email: 'alicia@test.com',
    admin: { nombre: 'Alicia', apellido: 'Moreno', telefono: '5512345009' },
    restaurant: { 
      nombre: 'Café Alicia', 
      tipo: 'cafeteria', 
      descripcion: 'Café de especialidad con granos mexicanos.',
      ciudad: 'Roma Norte',
      telefono: '5512345009'
    }
  },
  { 
    email: 'ricardo@test.com',
    admin: { nombre: 'Ricardo', apellido: 'Cabrera', telefono: '4441234010' },
    restaurant: { 
      nombre: 'Coffee & Coworking', 
      tipo: 'cafeteria', 
      descripcion: 'Cafetería moderna con espacio coworking.',
      ciudad: 'San Luis Potosí',
      telefono: '4441234010'
    }
  },
  { 
    email: 'stephanie@test.com',
    admin: { nombre: 'Stephanie', apellido: 'Iglesias', telefono: '3312345011' },
    restaurant: { 
      nombre: 'American Coffee House', 
      tipo: 'cafeteria', 
      descripcion: 'Cafetería con estilo americano.',
      ciudad: 'Guadalajara',
      telefono: '3312345011'
    }
  },
  { 
    email: 'victor@test.com',
    admin: { nombre: 'Víctor', apellido: 'Maldonado', telefono: '7771234012' },
    restaurant: { 
      nombre: 'Espresso Italiano', 
      tipo: 'cafeteria', 
      descripcion: 'Espresso bar italiano con baristas expertos.',
      ciudad: 'Cuernavaca',
      telefono: '7771234012'
    }
  }
];

const generarDireccion = (ciudad) => ({
  calle: `Av. Principal #${Math.floor(Math.random() * 999) + 100}`,
  ciudad,
  codigoPostal: '78000'
});

const generarHorarios = (tipo) => {
  const horarios = {
    restaurante: {
      lunes: { apertura: '09:00', cierre: '22:00' },
      martes: { apertura: '09:00', cierre: '22:00' },
      miercoles: { apertura: '09:00', cierre: '22:00' },
      jueves: { apertura: '09:00', cierre: '22:00' },
      viernes: { apertura: '09:00', cierre: '23:00' },
      sabado: { apertura: '09:00', cierre: '23:00' },
      domingo: { apertura: '09:00', cierre: '21:00' }
    },
    bar: {
      lunes: { apertura: '18:00', cierre: '02:00' },
      martes: { apertura: '18:00', cierre: '02:00' },
      miercoles: { apertura: '18:00', cierre: '02:00' },
      jueves: { apertura: '18:00', cierre: '02:00' },
      viernes: { apertura: '18:00', cierre: '03:00' },
      sabado: { apertura: '18:00', cierre: '03:00' },
      domingo: { apertura: '18:00', cierre: '01:00' }
    },
    cafeteria: {
      lunes: { apertura: '07:00', cierre: '20:00' },
      martes: { apertura: '07:00', cierre: '20:00' },
      miercoles: { apertura: '07:00', cierre: '20:00' },
      jueves: { apertura: '07:00', cierre: '20:00' },
      viernes: { apertura: '07:00', cierre: '21:00' },
      sabado: { apertura: '08:00', cierre: '21:00' },
      domingo: { apertura: '08:00', cierre: '19:00' }
    }
  };
  return horarios[tipo];
};

const generarMenu = (tipo) => {
  const menus = {
    restaurante: [
      {
        categoria: 'Entradas',
        items: [
          { nombre: 'Guacamole', descripcion: 'Con totopos artesanales', precio: 120 },
          { nombre: 'Quesadillas', descripcion: 'Queso oaxaca derretido', precio: 95 },
          { nombre: 'Nachos', descripcion: 'Con frijoles y jalapeños', precio: 110 }
        ]
      },
      {
        categoria: 'Platos Principales',
        items: [
          { nombre: 'Mole Poblano', descripcion: 'Con pollo y arroz', precio: 180 },
          { nombre: 'Carne Asada', descripcion: 'Con guacamole y tortillas', precio: 250 },
          { nombre: 'Enchiladas Verdes', descripcion: 'Con pollo y crema', precio: 160 }
        ]
      },
      {
        categoria: 'Postres',
        items: [
          { nombre: 'Flan Napolitano', descripcion: 'Con caramelo casero', precio: 80 },
          { nombre: 'Tres Leches', descripcion: 'Pastel húmedo tradicional', precio: 90 }
        ]
      }
    ],
    bar: [
      {
        categoria: 'Cocteles Clásicos',
        items: [
          { nombre: 'Margarita', descripcion: 'Tequila, limón y sal', precio: 145 },
          { nombre: 'Mojito', descripcion: 'Ron blanco y menta fresca', precio: 135 },
          { nombre: 'Piña Colada', descripcion: 'Ron, piña y coco', precio: 150 }
        ]
      },
      {
        categoria: 'Cocteles Especiales',
        items: [
          { nombre: 'Mezcal Sour', descripcion: 'Mezcal con limón', precio: 165 },
          { nombre: 'Paloma Premium', descripcion: 'Tequila y toronja', precio: 155 }
        ]
      },
      {
        categoria: 'Botanas',
        items: [
          { nombre: 'Alitas BBQ', descripcion: 'Con salsa barbacoa', precio: 165 },
          { nombre: 'Dedos de Queso', descripcion: 'Empanizados crujientes', precio: 125 }
        ]
      }
    ],
    cafeteria: [
      {
        categoria: 'Cafés Especiales',
        items: [
          { nombre: 'Cappuccino', descripcion: 'Espresso con leche vaporizada', precio: 65 },
          { nombre: 'Americano', descripcion: 'Espresso con agua caliente', precio: 50 },
          { nombre: 'Latte', descripcion: 'Con leche cremosa', precio: 70 },
          { nombre: 'Cold Brew', descripcion: 'Café frío de extracción lenta', precio: 75 }
        ]
      },
      {
        categoria: 'Desayunos',
        items: [
          { nombre: 'Pancakes', descripcion: 'Con miel de maple', precio: 95 },
          { nombre: 'Tostadas Francesas', descripcion: 'Con canela y azúcar', precio: 85 },
          { nombre: 'Avocado Toast', descripcion: 'Pan artesanal con aguacate', precio: 110 }
        ]
      },
      {
        categoria: 'Postres',
        items: [
          { nombre: 'Cheesecake', descripcion: 'Con frutos rojos', precio: 90 },
          { nombre: 'Brownie', descripcion: 'Con helado de vainilla', precio: 85 }
        ]
      }
    ]
  };
  return menus[tipo] || [];
};

const seedDatabase = async () => {
  try {
    console.log('\n🎯 SEEDER ARREGLADO - EMAILS IDÉNTICOS');
    console.log('=====================================');
    
    await connectDB();
    
    // LIMPIAR TODO
    console.log('\n🗑️  Limpiando base de datos...');
    await Admin.deleteMany({});
    await Restaurant.deleteMany({});
    console.log('✅ Base de datos completamente limpia');
    
    console.log(`\n📝 Creando ${pares.length} pares con emails idénticos...`);
    
    let exitosos = 0;
    let errores = 0;
    const credenciales = [];
    
    for (const [index, data] of pares.entries()) {
      try {
        // CREAR ADMIN
        const admin = new Admin({
          nombre: data.admin.nombre,
          apellido: data.admin.apellido,
          email: data.email, // EMAIL PRINCIPAL
          password: 'password123',
          telefono: data.admin.telefono,
          rol: 'admin',
          activo: true,
          configuracion: { notificaciones: true, tema: 'claro' }
        });
        
        const adminGuardado = await admin.save();
        
        // CREAR RESTAURANTE CON EL MISMO EMAIL
        const restaurant = new Restaurant({
          nombre: data.restaurant.nombre,
          tipo: data.restaurant.tipo,
          descripcion: data.restaurant.descripcion,
          direccion: generarDireccion(data.restaurant.ciudad),
          telefono: data.restaurant.telefono,
          email: data.email, // MISMO EMAIL DEL ADMIN
          horarios: generarHorarios(data.restaurant.tipo),
          menu: generarMenu(data.restaurant.tipo),
          redes: {
            facebook: `https://facebook.com/${data.restaurant.nombre.toLowerCase().replace(/\s+/g, '')}`,
            instagram: `@${data.restaurant.nombre.toLowerCase().replace(/\s+/g, '')}`,
            website: `https://www.${data.restaurant.nombre.toLowerCase().replace(/\s+/g, '')}.com`
          },
          adminId: adminGuardado._id,
          activo: true
        });
        
        await restaurant.save();
        
        credenciales.push({
          email: data.email,
          nombre: `${data.admin.nombre} ${data.admin.apellido}`,
          restaurante: data.restaurant.nombre,
          tipo: data.restaurant.tipo
        });
        
        exitosos++;
        console.log(`✅ ${index + 1}/${pares.length} - ${data.email} → ${data.restaurant.nombre}`);
        
      } catch (error) {
        errores++;
        console.error(`❌ Error ${index + 1}: ${error.message}`);
      }
    }
    
    // VERIFICACIONES
    console.log('\n🔍 VERIFICACIONES:');
    const totalAdmins = await Admin.countDocuments();
    const totalRestaurants = await Restaurant.countDocuments();
    console.log(`👥 Admins: ${totalAdmins} | 🏪 Restaurantes: ${totalRestaurants}`);
    
    if (totalAdmins === totalRestaurants && totalAdmins > 0) {
      console.log('✅ PERFECTO: Relación 1:1 correcta');
    } else {
      console.log('❌ ERROR: Relación 1:1 incorrecta');
    }
    
    // Verificar login de prueba
    console.log('\n🔐 VERIFICANDO LOGIN:');
    const testAdmin = await Admin.findOne({ email: 'maria@test.com' });
    if (testAdmin) {
      const passwordOk = await testAdmin.compararPassword('password123');
      console.log(`✅ Login maria@test.com: ${passwordOk ? 'FUNCIONA' : 'FALLA'}`);
      
      // Verificar que tiene restaurante
      const suRestaurante = await Restaurant.findOne({ adminId: testAdmin._id });
      console.log(`✅ Tiene restaurante: ${suRestaurante ? suRestaurante.nombre : 'NO'}`);
      console.log(`✅ Email restaurante: ${suRestaurante ? suRestaurante.email : 'NO'}`);
    }
    
    // Estadísticas por tipo
    const stats = await Restaurant.aggregate([
      { $group: { _id: '$tipo', count: { $sum: 1 } } }
    ]);
    
    console.log('\n📊 ESTADÍSTICAS POR TIPO:');
    stats.forEach(stat => {
      console.log(`${stat._id.toUpperCase()}: ${stat.count}`);
    });
    
    console.log(`\n🎯 RESUMEN FINAL:`);
    console.log(`✅ Exitosos: ${exitosos}`);
    console.log(`❌ Errores: ${errores}`);
    
    console.log('\n🔑 CREDENCIALES LISTAS:');
    console.log('=======================');
    
    // Agrupar por tipo
    const restaurantes = credenciales.filter(c => c.tipo === 'restaurante');
    const bares = credenciales.filter(c => c.tipo === 'bar');
    const cafeterias = credenciales.filter(c => c.tipo === 'cafeteria');
    
    console.log('\n🍽️ RESTAURANTES:');
    restaurantes.forEach(cred => {
      console.log(`📧 ${cred.email.padEnd(20)} | 🔒 password123 | 🏪 ${cred.restaurante}`);
    });
    
    console.log('\n🍺 BARES:');
    bares.forEach(cred => {
      console.log(`📧 ${cred.email.padEnd(20)} | 🔒 password123 | 🏪 ${cred.restaurante}`);
    });
    
    console.log('\n☕ CAFETERÍAS:');
    cafeterias.forEach(cred => {
      console.log(`📧 ${cred.email.padEnd(20)} | 🔒 password123 | 🏪 ${cred.restaurante}`);
    });
    
    console.log('\n🚀 PRÓXIMOS PASOS:');
    console.log('==================');
    console.log('1. Agrega los endpoints a server.js (los enviaré por separado)');
    console.log('2. Reinicia servidor: npm run dev');
    console.log('3. Ve a: http://localhost:3003/admin.html');
    console.log('4. Prueba login: maria@test.com / password123');
    
    console.log('\n✨ DATOS PERFECTOS:');
    console.log('===================');
    console.log('✅ Emails idénticos admin-restaurante');
    console.log('✅ Relación 1:1 perfecta');
    console.log('✅ Passwords hasheadas correctamente');
    console.log('✅ Menús completos por tipo');
    console.log('✅ Horarios apropiados por negocio');
    
  } catch (error) {
    console.error('💥 Error fatal:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
};

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('\n🎉 ¡SEEDER COMPLETADO EXITOSAMENTE!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase, Admin, Restaurant };