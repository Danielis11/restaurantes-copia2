const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('🔄 Intentando conectar a MongoDB Atlas...');
    
    // Verificar que existe la URL de conexión
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI no está definida en el archivo .env');
    }
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB conectado exitosamente`);
    console.log(`🏠 Host: ${conn.connection.host}`);
    console.log(`📊 Base de datos: ${conn.connection.name}`);
    
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    console.log('💡 Verifica tu archivo .env y la configuración de MongoDB Atlas');
    
    // No cerrar la app por ahora, solo mostrar el error
    console.log('⚠️  Continuando sin base de datos para desarrollo...');
  }
};

module.exports = connectDB;