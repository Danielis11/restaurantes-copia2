// agregarSuperAdmin.js - SOLO agregar Super Admin sin borrar nada
require('dotenv').config();
const mongoose = require('mongoose');

// Modelos
const Admin = require('./models/Admin');
const Restaurant = require('./models/Restaurant');

// Función de conexión a la base de datos
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI no encontrada en variables de entorno (.env)');
    }
    
    console.log('🔗 Conectando a MongoDB Atlas...');
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB Atlas exitosamente');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB Atlas:', error.message);
    process.exit(1);
  }
};

// Función para agregar SOLO el Super Admin
const agregarSuperAdmin = async () => {
  try {
    console.log('\n👑 AGREGANDO SUPER ADMIN (SIN BORRAR DATOS EXISTENTES)');
    console.log('=====================================================');
    
    await connectDB();
    
    // Verificar datos actuales
    const totalAdmins = await Admin.countDocuments();
    const totalRestaurantes = await Restaurant.countDocuments();
    
    console.log(`📊 Estado actual:`);
    console.log(`   👤 Admins existentes: ${totalAdmins}`);
    console.log(`   🏪 Restaurantes existentes: ${totalRestaurantes}`);
    
    // Verificar si ya existe el Super Admin
    const superAdminExistente = await Admin.findOne({ 
      email: 'superadmin@jalpan.com.mx' 
    });
    
    if (superAdminExistente) {
      console.log('\n⚠️  Super Admin ya existe:');
      console.log(`   📧 Email: ${superAdminExistente.email}`);
      console.log(`   👤 Nombre: ${superAdminExistente.nombre} ${superAdminExistente.apellido}`);
      console.log(`   🔑 Rol: ${superAdminExistente.rol}`);
      console.log(`   ✅ Activo: ${superAdminExistente.activo}`);
      
      console.log('\n💡 El Super Admin ya está configurado y listo para usar.');
      console.log('🔐 Credenciales: superadmin@jalpan.com.mx / superadmin123');
      return { yaExiste: true, superAdmin: superAdminExistente };
    }
    
    // Crear Super Admin
    console.log('\n👑 Creando Super Admin...');
    try {
      const superAdmin = new Admin({
        nombre: 'Super',
        apellido: 'Admin',
        email: 'superadmin@jalpan.com.mx',
        password: 'superadmin123',
        telefono: '4411000000',
        rol: 'super-admin', // ← CORREGIDO: usar 'super-admin' en lugar de 'superadmin'
        activo: true
      });
      
      await superAdmin.save();
      console.log('✅ Super Admin creado exitosamente');
      
      // Verificar totales finales
      const nuevoTotalAdmins = await Admin.countDocuments();
      const nuevoTotalRestaurantes = await Restaurant.countDocuments();
      
      console.log('\n📊 Estado final:');
      console.log(`   👤 Total Admins: ${totalAdmins} → ${nuevoTotalAdmins} (+1)`);
      console.log(`   🏪 Total Restaurantes: ${totalRestaurantes} (sin cambios)`);
      
      console.log('\n👑 SUPER ADMIN CONFIGURADO:');
      console.log('===========================');
      console.log('📧 Email: superadmin@jalpan.com.mx');
      console.log('🔐 Password: superadmin123');
      console.log('🔑 Rol: super-admin');
      console.log('⚡ Acceso: Completo a todos los establecimientos');
      
      console.log('\n🚀 PARA USAR:');
      console.log('=============');
      console.log('1. 🔄 Reinicia tu servidor: npm run dev');
      console.log('2. 🌐 Ve a: http://localhost:3003/login');
      console.log('3. 🔐 Ingresa: superadmin@jalpan.com.mx / superadmin123');
      console.log('4. ✨ ¡Tendrás acceso completo a todos los 55 establecimientos!');
      
      return { creado: true, superAdmin };
      
    } catch (error) {
      console.error('❌ Error creando Super Admin:', error.message);
      
      if (error.code === 11000) {
        console.log('💡 Error: El email ya existe en la base de datos');
        console.log('🔍 Verifica si ya hay un Super Admin con otro email');
      } else if (error.message.includes('enum')) {
        console.log('💡 Error: Valor de rol inválido');
        console.log('🔍 El rol debe ser "admin" o "super-admin"');
      }
      
      throw error;
    }
    
  } catch (error) {
    console.error('💥 Error fatal:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
};

// Ejecutar si es llamado directamente
if (require.main === module) {
  agregarSuperAdmin()
    .then((resultado) => {
      if (resultado.yaExiste) {
        console.log('\n💡 El Super Admin ya estaba configurado.');
        console.log('🚀 Puedes usar: superadmin@jalpan.com.mx / superadmin123');
      } else if (resultado.creado) {
        console.log('\n🎉 ¡SUPER ADMIN AGREGADO EXITOSAMENTE!');
        console.log('👑 Ahora tienes acceso completo al sistema');
        console.log('🏪 Gestiona los 55 establecimientos de Jalpan');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { agregarSuperAdmin };