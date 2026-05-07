const Restaurant = require('../models/Restaurant');

const TOP_LIMIT = 12;

const sanitizePosition = (value) => {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > TOP_LIMIT) return null;
  return num;
};

const getTopPortadaPublico = async (req, res) => {
  try {
    const top = await Restaurant.find({
      activo: true,
      homePosition: { $gte: 1, $lte: TOP_LIMIT }
    })
      .sort({ homePosition: 1, fechaActualizacion: -1 })
      .limit(TOP_LIMIT)
      .select('nombre tipo descripcion direccion telefono email imagenes homePosition')
      .lean();

    res.json({
      success: true,
      data: {
        restaurantes: top,
        total: top.length
      }
    });
  } catch (error) {
    console.error('Error obteniendo ranking público:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const getRankingList = async (req, res) => {
  try {
    const { buscar = '' } = req.query;
    const filtros = { activo: true };

    if (buscar && buscar.trim()) {
      filtros.$or = [
        { nombre: { $regex: buscar.trim(), $options: 'i' } },
        { tipo: { $regex: buscar.trim(), $options: 'i' } },
        { 'direccion.ciudad': { $regex: buscar.trim(), $options: 'i' } }
      ];
    }

    const restaurantes = await Restaurant.find(filtros)
      .sort({ homePosition: 1, fechaActualizacion: -1 })
      .select('nombre tipo direccion imagenes homePosition activo fechaActualizacion')
      .lean();

    res.json({
      success: true,
      data: {
        restaurantes,
        total: restaurantes.length,
        topLimit: TOP_LIMIT
      }
    });
  } catch (error) {
    console.error('Error obteniendo listado de ranking:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const saveTopPositions = async (req, res) => {
  try {
    const { positions } = req.body;

    if (!Array.isArray(positions)) {
      return res.status(400).json({ success: false, message: 'positions debe ser un arreglo' });
    }

    if (positions.length > TOP_LIMIT) {
      return res.status(400).json({ success: false, message: `Solo se permiten ${TOP_LIMIT} posiciones` });
    }

    const positionSet = new Set();
    const updates = [];

    for (const item of positions) {
      if (!item || !item.restaurantId) {
        return res.status(400).json({ success: false, message: 'Cada elemento requiere restaurantId' });
      }

      const position = sanitizePosition(item.position);
      if (!position) {
        return res.status(400).json({ success: false, message: 'Cada posición debe estar entre 1 y 12' });
      }

      if (positionSet.has(position)) {
        return res.status(400).json({ success: false, message: 'No se pueden repetir posiciones' });
      }

      positionSet.add(position);
      updates.push({ restaurantId: item.restaurantId, position });
    }

    const ids = updates.map((u) => u.restaurantId);
    const found = await Restaurant.find({ _id: { $in: ids }, activo: true }).select('_id').lean();

    if (found.length !== ids.length) {
      return res.status(400).json({ success: false, message: 'Uno o más establecimientos no existen o están inactivos' });
    }

    await Restaurant.updateMany(
      { homePosition: { $gte: 1, $lte: TOP_LIMIT } },
      { $set: { homePosition: null, fechaActualizacion: new Date() } }
    );

    const bulkOps = updates.map((u) => ({
      updateOne: {
        filter: { _id: u.restaurantId },
        update: {
          $set: {
            homePosition: u.position,
            fechaActualizacion: new Date(),
            rankingUpdatedBy: req.admin?._id || null
          }
        }
      }
    }));

    if (bulkOps.length > 0) {
      await Restaurant.bulkWrite(bulkOps);
    }

    res.json({
      success: true,
      message: 'Ranking actualizado correctamente',
      data: {
        totalAsignados: updates.length,
        positions: updates
      }
    });
  } catch (error) {
    console.error('Error guardando posiciones de ranking:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

module.exports = {
  getTopPortadaPublico,
  getRankingList,
  saveTopPositions
};
