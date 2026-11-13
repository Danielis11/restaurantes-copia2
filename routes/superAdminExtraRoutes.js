// Super admin: estadísticas, precios, alta/edición de restaurantes y admins
// (Movido desde server.js sin cambios de lógica)
const express = require('express');
const Admin = require('../models/Admin');
const Restaurant = require('../models/Restaurant');
const { verificarToken, verificarSuperAdmin } = require('../middleware/auth');

const router = express.Router();
function calcularMediana(arr) {
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

// ===== ENDPOINT: CREAR ADMIN TURISMO (Solo Super Admin) =====
router.post('/api/admins/turismo', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { nombre, apellido, email, password, telefono } = req.body;

    if (!nombre || !apellido || !email || !password || !telefono) {
      return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }

    const existente = await Admin.findOne({ email });
    if (existente) {
      return res.status(400).json({ success: false, message: 'Ya existe un administrador con este email' });
    }

    const admin = await Admin.create({
      nombre, apellido, email, password, telefono,
      rol: 'admin-turismo'
    });

    res.status(201).json({
      success: true,
      message: 'Admin de Turismo creado exitosamente',
      data: {
        admin: {
          id: admin._id,
          nombre: admin.nombre,
          apellido: admin.apellido,
          email: admin.email,
          telefono: admin.telefono,
          rol: admin.rol
        }
      }
    });
  } catch (error) {
    console.error('Error creando admin turismo:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Editar restaurante (super admin)
router.put('/api/super-admin/restaurants/:id', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Campos permitidos para actualizar
    const allowedUpdates = [
      'nombre', 'descripcion', 'telefono', 'email', 'direccion', 
      'horarios', 'menu', 'redes', 'tipo', 'googleReviewsUrl', 'instagramEmbeds'
    ];
    
    const updates = {};
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    });
    
    updates.fechaActualizacion = new Date();
    
    const restaurant = await Restaurant.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('adminId', 'nombre apellido email telefono');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Restaurante actualizado exitosamente',
      data: { restaurant }
    });
    
  } catch (error) {
    console.error('Error actualizando restaurante:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Estadísticas avanzadas del sistema
router.get('/api/super-admin/stats', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const [
      statsAdmins,
      statsRestaurantes,
      statsActividad,
      topCiudades,
      crecimientoMensual
    ] = await Promise.all([
      // Estadísticas de administradores
      Admin.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            activos: { $sum: { $cond: ['$activo', 1, 0] } },
            superAdmins: { $sum: { $cond: [{ $eq: ['$rol', 'super-admin'] }, 1, 0] } },
            adminsNormales: { $sum: { $cond: [{ $eq: ['$rol', 'admin'] }, 1, 0] } }
          }
        }
      ]),
      
      // Estadísticas de restaurantes
      Restaurant.aggregate([
        {
          $group: {
            _id: '$tipo',
            total: { $sum: 1 },
            activos: { $sum: { $cond: ['$activo', 1, 0] } }
          }
        }
      ]),
      
      // Actividad reciente
      Admin.aggregate([
        {
          $match: {
            ultimoAcceso: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: null,
            activosUltimaSemana: { $sum: 1 }
          }
        }
      ]),
      
      // Top ciudades
      Restaurant.aggregate([
        { $match: { activo: true } },
        {
          $group: {
            _id: '$direccion.ciudad',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // Crecimiento mensual
      Restaurant.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$fechaCreacion' },
              month: { $month: '$fechaCreacion' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ])
    ]);

    res.json({
      success: true,
      message: 'Estadísticas globales obtenidas exitosamente',
      data: {
        admins: statsAdmins[0] || { total: 0, activos: 0, superAdmins: 0, adminsNormales: 0 },
        restaurantes: statsRestaurantes,
        actividad: statsActividad[0] || { activosUltimaSemana: 0 },
        topCiudades,
        crecimientoMensual
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas globales:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Estadísticas detalladas de precios
router.get('/api/super-admin/price-stats', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const [
      preciosPorTipo,
      preciosPorCiudad,
      productosExtremos,
      distribucionPrecios,
      estadisticasMenus,
      topProductos
    ] = await Promise.all([
      // Precios promedio por tipo de restaurante
      Restaurant.aggregate([
        { $match: { activo: true, menu: { $exists: true, $ne: [] } } },
        { $unwind: '$menu' },
        { $unwind: '$menu.items' },
        {
          $group: {
            _id: '$tipo',
            precioPromedio: { $avg: '$menu.items.precio' },
            precioMinimo: { $min: '$menu.items.precio' },
            precioMaximo: { $max: '$menu.items.precio' },
            totalProductos: { $sum: 1 },
            restaurantes: { $addToSet: '$_id' }
          }
        },
        {
          $project: {
            tipo: '$_id',
            precioPromedio: { $round: ['$precioPromedio', 2] },
            precioMinimo: '$precioMinimo',
            precioMaximo: '$precioMaximo',
            totalProductos: '$totalProductos',
            totalRestaurantes: { $size: '$restaurantes' }
          }
        }
      ]),
      
      // Precios por ciudad
      Restaurant.aggregate([
        { $match: { activo: true, menu: { $exists: true, $ne: [] } } },
        { $unwind: '$menu' },
        { $unwind: '$menu.items' },
        {
          $group: {
            _id: '$direccion.ciudad',
            precioPromedio: { $avg: '$menu.items.precio' },
            precioMinimo: { $min: '$menu.items.precio' },
            precioMaximo: { $max: '$menu.items.precio' },
            totalProductos: { $sum: 1 },
            restaurantes: { $addToSet: '$_id' }
          }
        },
        {
          $project: {
            ciudad: '$_id',
            precioPromedio: { $round: ['$precioPromedio', 2] },
            precioMinimo: '$precioMinimo',
            precioMaximo: '$precioMaximo',
            totalProductos: '$totalProductos',
            totalRestaurantes: { $size: '$restaurantes' }
          }
        },
        { $sort: { precioPromedio: -1 } },
        { $limit: 10 }
      ]),
      
      // Productos más caros y más baratos
      Restaurant.aggregate([
        { $match: { activo: true, menu: { $exists: true, $ne: [] } } },
        { $unwind: '$menu' },
        { $unwind: '$menu.items' },
        {
          $project: {
            restaurante: '$nombre',
            ciudad: '$direccion.ciudad',
            tipo: '$tipo',
            categoria: '$menu.categoria',
            producto: '$menu.items.nombre',
            precio: '$menu.items.precio',
            descripcion: '$menu.items.descripcion'
          }
        },
        { $sort: { precio: -1 } }
      ]),
      
      // Distribución de precios en rangos
      Restaurant.aggregate([
        { $match: { activo: true, menu: { $exists: true, $ne: [] } } },
        { $unwind: '$menu' },
        { $unwind: '$menu.items' },
        {
          $bucket: {
            groupBy: '$menu.items.precio',
            boundaries: [0, 50, 100, 150, 200, 300, 500, 1000],
            default: '500+',
            output: {
              count: { $sum: 1 },
              productos: { 
                $push: {
                  nombre: '$menu.items.nombre',
                  precio: '$menu.items.precio',
                  restaurante: '$nombre'
                }
              }
            }
          }
        }
      ]),
      
      // Estadísticas generales de menús
      Restaurant.aggregate([
        { $match: { activo: true } },
        {
          $project: {
            nombre: 1,
            tipo: 1,
            ciudad: '$direccion.ciudad',
            totalCategorias: { $size: { $ifNull: ['$menu', []] } },
            totalItems: {
              $sum: {
                $map: {
                  input: { $ifNull: ['$menu', []] },
                  as: 'categoria',
                  in: { $size: { $ifNull: ['$$categoria.items', []] } }
                }
              }
            },
            preciosItems: {
              $reduce: {
                input: {
                  $reduce: {
                    input: { $ifNull: ['$menu', []] },
                    initialValue: [],
                    in: { $concatArrays: ['$$value', { $ifNull: ['$$this.items', []] }] }
                  }
                },
                initialValue: [],
                in: { $concatArrays: ['$$value', [{ $ifNull: ['$$this.precio', 0] }]] }
              }
            }
          }
        },
        {
          $project: {
            nombre: 1,
            tipo: 1,
            ciudad: 1,
            totalCategorias: 1,
            totalItems: 1,
            precioPromedio: { 
              $cond: {
                if: { $gt: [{ $size: '$preciosItems' }, 0] },
                then: { $avg: '$preciosItems' },
                else: 0
              }
            },
            precioMinimo: { 
              $cond: {
                if: { $gt: [{ $size: '$preciosItems' }, 0] },
                then: { $min: '$preciosItems' },
                else: 0
              }
            },
            precioMaximo: { 
              $cond: {
                if: { $gt: [{ $size: '$preciosItems' }, 0] },
                then: { $max: '$preciosItems' },
                else: 0
              }
            }
          }
        }
      ]),
      
      // Top productos más populares (por frecuencia de nombres similares)
      Restaurant.aggregate([
        { $match: { activo: true, menu: { $exists: true, $ne: [] } } },
        { $unwind: '$menu' },
        { $unwind: '$menu.items' },
        {
          $group: {
            _id: { 
              $toLower: { 
                $trim: { 
                  input: '$menu.items.nombre' 
                } 
              } 
            },
            count: { $sum: 1 },
            precioPromedio: { $avg: '$menu.items.precio' },
            precioMinimo: { $min: '$menu.items.precio' },
            precioMaximo: { $max: '$menu.items.precio' },
            restaurantes: { $addToSet: '$nombre' },
            categorias: { $addToSet: '$menu.categoria' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 20 },
        {
          $project: {
            nombre: '$_id',
            frecuencia: '$count',
            precioPromedio: { $round: ['$precioPromedio', 2] },
            precioMinimo: '$precioMinimo',
            precioMaximo: '$precioMaximo',
            enRestaurantes: { $size: '$restaurantes' },
            categorias: '$categorias'
          }
        }
      ])
    ]);

    // Procesar productos extremos
    const productosCaros = productosExtremos.slice(0, 10);
    const productosBaratos = productosExtremos.slice(-10).reverse();

    // Calcular estadísticas generales de precios
    const todosLosPrecios = productosExtremos.map(p => p.precio);
    const estadisticasGenerales = {
      precioPromedio: todosLosPrecios.length > 0 ? 
        Math.round((todosLosPrecios.reduce((a, b) => a + b, 0) / todosLosPrecios.length) * 100) / 100 : 0,
      precioMinimo: todosLosPrecios.length > 0 ? Math.min(...todosLosPrecios) : 0,
      precioMaximo: todosLosPrecios.length > 0 ? Math.max(...todosLosPrecios) : 0,
      totalProductos: todosLosPrecios.length,
      mediana: todosLosPrecios.length > 0 ? 
        calcularMediana(todosLosPrecios.sort((a, b) => a - b)) : 0
    };

    res.json({
      success: true,
      message: 'Estadísticas de precios obtenidas exitosamente',
      data: {
        preciosPorTipo,
        preciosPorCiudad,
        productosCaros,
        productosBaratos,
        distribucionPrecios,
        estadisticasMenus,
        topProductos,
        estadisticasGenerales
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de precios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Comparativa de precios entre tipos y ciudades
router.get('/api/super-admin/price-comparison', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { tipo, ciudad } = req.query;

    let matchConditions = { activo: true, menu: { $exists: true, $ne: [] } };
    
    if (tipo) matchConditions.tipo = tipo;
    if (ciudad) matchConditions['direccion.ciudad'] = ciudad;

    const comparativa = await Restaurant.aggregate([
      { $match: matchConditions },
      { $unwind: '$menu' },
      { $unwind: '$menu.items' },
      {
        $group: {
          _id: {
            tipo: '$tipo',
            ciudad: '$direccion.ciudad',
            categoria: '$menu.categoria'
          },
          precioPromedio: { $avg: '$menu.items.precio' },
          precioMinimo: { $min: '$menu.items.precio' },
          precioMaximo: { $max: '$menu.items.precio' },
          totalProductos: { $sum: 1 },
          productos: {
            $push: {
              nombre: '$menu.items.nombre',
              precio: '$menu.items.precio',
              restaurante: '$nombre'
            }
          }
        }
      },
      {
        $project: {
          tipo: '$_id.tipo',
          ciudad: '$_id.ciudad',
          categoria: '$_id.categoria',
          precioPromedio: { $round: ['$precioPromedio', 2] },
          precioMinimo: '$precioMinimo',
          precioMaximo: '$precioMaximo',
          totalProductos: '$totalProductos',
          rangoPrecios: { $subtract: ['$precioMaximo', '$precioMinimo'] },
          productos: { $slice: ['$productos', 5] } // Top 5 ejemplos
        }
      },
      { $sort: { precioPromedio: -1 } }
    ]);

    res.json({
      success: true,
      data: { comparativa, filtros: { tipo, ciudad } }
    });

  } catch (error) {
    console.error('Error en comparativa de precios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Análisis de tendencias de precios (simulado con datos históricos)
router.get('/api/super-admin/price-trends', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    // Simular tendencias mensuales (en un sistema real usarías fechas reales)
    const tendenciasMensuales = await Restaurant.aggregate([
      { $match: { activo: true, menu: { $exists: true, $ne: [] } } },
      { $unwind: '$menu' },
      { $unwind: '$menu.items' },
      {
        $group: {
          _id: {
            mes: { $month: '$fechaCreacion' },
            año: { $year: '$fechaCreacion' },
            tipo: '$tipo'
          },
          precioPromedio: { $avg: '$menu.items.precio' },
          totalProductos: { $sum: 1 }
        }
      },
      {
        $project: {
          mes: '$_id.mes',
          año: '$_id.año',
          tipo: '$_id.tipo',
          precioPromedio: { $round: ['$precioPromedio', 2] },
          totalProductos: '$totalProductos'
        }
      },
      { $sort: { año: 1, mes: 1 } }
    ]);

    // Análisis de categorías más populares
    const categoriasTendencia = await Restaurant.aggregate([
      { $match: { activo: true, menu: { $exists: true, $ne: [] } } },
      { $unwind: '$menu' },
      {
        $group: {
          _id: '$menu.categoria',
          restaurantesConCategoria: { $addToSet: '$_id' },
          totalItems: { $sum: { $size: { $ifNull: ['$menu.items', []] } } },
          precioPromedio: {
            $avg: {
              $avg: {
                $map: {
                  input: { $ifNull: ['$menu.items', []] },
                  as: 'item',
                  in: '$$item.precio'
                }
              }
            }
          }
        }
      },
      {
        $project: {
          categoria: '$_id',
          popularidad: { $size: '$restaurantesConCategoria' },
          totalItems: '$totalItems',
          precioPromedio: { $round: ['$precioPromedio', 2] }
        }
      },
      { $sort: { popularidad: -1 } },
      { $limit: 15 }
    ]);

    res.json({
      success: true,
      data: {
        tendenciasMensuales,
        categoriasTendencia
      }
    });

  } catch (error) {
    console.error('Error obteniendo tendencias:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Crear nuevo restaurante con administrador (super admin)
router.post('/api/super-admin/restaurants', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { 
      // Datos del restaurante
      nombre, 
      tipo, 
      descripcion, 
      telefono, 
      email, 
      direccion, 
      redes,
      googleReviewsUrl,
      instagramEmbeds,
      // Administrador (existente o nuevo)
      adminId,
      newAdmin
    } = req.body;

    // Validar campos requeridos del restaurante
    const isObrador = tipo === 'obrador-artesanal';
    
    if (!nombre || !tipo || !descripcion || !direccion) {
      return res.status(400).json({
        success: false,
        message: 'Los campos básicos del restaurante son obligatorios'
      });
    }

    // Teléfono y email son obligatorios excepto para obradores artesanales
    if (!isObrador && (!telefono || !email)) {
      return res.status(400).json({
        success: false,
        message: 'El teléfono y email son obligatorios para este tipo de establecimiento'
      });
    }

    // Validar dirección
    if (!direccion.calle || !direccion.ciudad || !direccion.codigoPostal) {
      return res.status(400).json({
        success: false,
        message: 'La dirección completa es obligatoria'
      });
    }

    let finalAdminId = adminId;

    // Para obradores artesanales NO se requiere administrador
    if (isObrador) {
      finalAdminId = null;
    } else {
      // Si se va a crear un nuevo administrador
      if (newAdmin && !adminId) {
        const { nombre: adminNombre, apellido, email: adminEmail, password, telefono: adminTelefono } = newAdmin;

        // Validar campos del nuevo admin
        if (!adminNombre || !apellido || !adminEmail || !password || !adminTelefono) {
          return res.status(400).json({
            success: false,
            message: 'Todos los campos del administrador son obligatorios'
          });
        }

        // Verificar que el email del admin no existe
        const existingAdmin = await Admin.findOne({ email: adminEmail });
        if (existingAdmin) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe un administrador con este email'
          });
        }

        // Crear el nuevo administrador
        const admin = new Admin({
          nombre: adminNombre,
          apellido,
          email: adminEmail,
          password,
          telefono: adminTelefono,
          rol: 'admin',
          activo: true
        });

        await admin.save();
        finalAdminId = admin._id;

        console.log('✅ Nuevo administrador creado:', adminEmail);
      }

      // Verificar que el administrador existe
      if (!finalAdminId) {
        return res.status(400).json({
          success: false,
          message: 'Debe seleccionar un administrador o crear uno nuevo'
        });
      }

      const admin = await Admin.findById(finalAdminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Administrador no encontrado'
        });
      }

      // Verificar que el admin no tenga ya un restaurante activo
      const existingRestaurant = await Restaurant.findOne({ 
        adminId: finalAdminId, 
        activo: true 
      });

      if (existingRestaurant) {
        return res.status(400).json({
          success: false,
          message: `El administrador ${admin.nombre} ${admin.apellido} ya tiene un restaurante activo: ${existingRestaurant.nombre}`
        });
      }
    }

    // Verificar que no existe un restaurante con el mismo email (solo si tiene email)
    if (email) {
      const existingRestaurantByEmail = await Restaurant.findOne({ email });
      if (existingRestaurantByEmail) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un restaurante con este email'
        });
      }
    }

    // Crear el restaurante
    const restaurant = new Restaurant({
      nombre,
      tipo,
      descripcion,
      telefono,
      email,
      direccion: {
        calle: direccion.calle,
        ciudad: direccion.ciudad,
        codigoPostal: direccion.codigoPostal,
        coordenadas: direccion.coordenadas || {}
      },
      redes: redes || {},
      googleReviewsUrl: googleReviewsUrl || null,
      instagramEmbeds: Array.isArray(instagramEmbeds) ? instagramEmbeds : [],
      adminId: finalAdminId,
      activo: true,
      // Horarios por defecto
      horarios: {
        lunes: { abierto: true, apertura: '09:00', cierre: '22:00' },
        martes: { abierto: true, apertura: '09:00', cierre: '22:00' },
        miercoles: { abierto: true, apertura: '09:00', cierre: '22:00' },
        jueves: { abierto: true, apertura: '09:00', cierre: '22:00' },
        viernes: { abierto: true, apertura: '09:00', cierre: '22:00' },
        sabado: { abierto: true, apertura: '09:00', cierre: '22:00' },
        domingo: { abierto: false, apertura: '09:00', cierre: '22:00' }
      },
      menu: [] // Menú vacío inicial
    });

    await restaurant.save();

    // Poblar con datos del administrador para la respuesta
    const restaurantPopulated = await Restaurant.findById(restaurant._id)
      .populate('adminId', 'nombre apellido email telefono rol activo');

    console.log('✅ Restaurante creado exitosamente:', nombre);

    res.status(201).json({
      success: true,
      message: 'Restaurante creado exitosamente',
      data: { 
        restaurant: restaurantPopulated,
        ...(newAdmin && { newAdminCreated: true })
      }
    });

  } catch (error) {
    console.error('Error creando restaurante:', error);
    
    if (error.code === 11000) {
      // Error de duplicado
      if (error.keyPattern.email) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un restaurante con este email'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Error de duplicado en los datos'
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener administradores disponibles (sin restaurante asignado)
router.get('/api/super-admin/available-admins', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    // Obtener todos los administradores activos
    const allAdmins = await Admin.find({ 
      activo: true,
      rol: 'admin' // Solo admins normales, no super-admins
    }).select('_id nombre apellido email telefono');

    // Obtener IDs de admins que ya tienen restaurante
    const adminsWithRestaurant = await Restaurant.find({ 
      activo: true 
    }).distinct('adminId');

    // Filtrar admins disponibles
    const availableAdmins = allAdmins.filter(admin => 
      !adminsWithRestaurant.some(adminId => adminId.equals(admin._id))
    );

    res.json({
      success: true,
      message: 'Administradores disponibles obtenidos exitosamente',
      data: {
        admins: availableAdmins,
        total: availableAdmins.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo administradores disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// 📊 OBTENER ESTADÍSTICAS DE ELIMINACIONES (OPCIONAL)
router.get('/api/super-admin/deletion-stats', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    // Si implementas eliminación suave, puedes obtener estadísticas
    const stats = {
      // Estas serían las estadísticas si usaras eliminación suave
      adminsEliminados: 0, // await Admin.countDocuments({ eliminado: true })
      restaurantesEliminados: 0, // await Restaurant.countDocuments({ eliminado: true })
      // Con eliminación permanente, estas estadísticas no están disponibles
      message: 'Estadísticas de eliminación no disponibles con eliminación permanente'
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// 🔍 BUSCAR ANTES DE ELIMINAR (Función de ayuda)
router.get('/api/super-admin/admins/:id/deletion-impact', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrador no encontrado'
      });
    }

    const restaurantesAsociados = await Restaurant.find({ adminId: id });
    let totalImagenes = 0;

    restaurantesAsociados.forEach(restaurant => {
      if (restaurant.imagenes) {
        totalImagenes += restaurant.imagenes.length;
      }
    });

    res.json({
      success: true,
      message: 'Impacto de eliminación calculado',
      data: {
        admin: {
          nombre: `${admin.nombre} ${admin.apellido}`,
          email: admin.email,
          rol: admin.rol
        },
        impacto: {
          restaurantesAfectados: restaurantesAsociados.length,
          imagenesAfectadas: totalImagenes,
          restaurantes: restaurantesAsociados.map(r => ({
            nombre: r.nombre,
            tipo: r.tipo,
            imagenes: r.imagenes ? r.imagenes.length : 0
          }))
        }
      }
    });

  } catch (error) {
    console.error('Error calculando impacto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;
