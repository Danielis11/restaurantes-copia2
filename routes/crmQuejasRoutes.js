const express = require('express');
const router = express.Router();
const ContactoCRM = require('../models/ContactoCRM');
const MensajePrivado = require('../models/MensajePrivado');
const Restaurant = require('../models/Restaurant');
const { verificarToken } = require('../middleware/auth');

// =======================
// RUTAS PÚBLICAS (Para que el turista interactúe desde restaurante.html)
// =======================

// Publicar un nuevo contacto para CRM (Boletines/Promociones)
router.post('/contacto', async (req, res) => {
    try {
        const { restaurantId, nombre, email, telefono, cumpleanos } = req.body;

        if (!restaurantId || !nombre) {
            return res.status(400).json({ msg: 'Debe enviar restaurantId y nombre' });
        }

        // Validar que exista
        const rest = await Restaurant.findById(restaurantId);
        if (!rest) {
            return res.status(404).json({ msg: 'Restaurante no encontrado' });
        }

        const nuevoContacto = new ContactoCRM({
            restaurantId,
            nombre,
            email,
            telefono,
            cumpleanos
        });

        await nuevoContacto.save();
        res.status(201).json({ msg: 'Te has unido exitosamente a la lista.', contacto: nuevoContacto });

    } catch (error) {
        console.error('Error al registrar contacto en CRM:', error);
        res.status(500).json({ msg: 'Error interno del servidor', error: error.message });
    }
});

// Enviar un mensaje / queja a la bandeja del administrador
router.post('/mensaje', async (req, res) => {
    try {
        const { restaurantId, nombre, contacto, mensaje, esQueja } = req.body;

        if (!restaurantId || !mensaje) {
            return res.status(400).json({ msg: 'Debe enviar restaurantId y el texto del mensaje' });
        }

        // Validar que exista
        const rest = await Restaurant.findById(restaurantId);
        if (!rest) {
            return res.status(404).json({ msg: 'Restaurante no encontrado' });
        }

        const nuevoMensaje = new MensajePrivado({
            restaurantId,
            nombre: nombre || 'Anónimo',
            contacto,
            mensaje,
            esQueja: esQueja !== undefined ? esQueja : true
        });

        await nuevoMensaje.save();
        res.status(201).json({ msg: 'El mensaje ha sido enviado directamente a la gerencia de manera confidencial.', mensaje: nuevoMensaje });

    } catch (error) {
        console.error('Error al enviar mensaje privado:', error);
        res.status(500).json({ msg: 'Error interno del servidor', error: error.message });
    }
});

// =======================
// RUTAS PRIVADAS (Para el panel de Administración admin.html)
// Req.user.restaurant.id viene del token JWT 
// =======================

// Obtener toda la lista CRM del restaurante actual
router.get('/mis-contactos', verificarToken, async (req, res) => {
    try {
        const adminId = req.admin._id;
        
        // Primero obtener el ID del restaurante de ESTE admin
        const restaurante = await Restaurant.findOne({ adminId: adminId });
        if (!restaurante) {
            return res.status(404).json({ msg: 'No tienes un restaurante asignado' });
        }

        const contactos = await ContactoCRM.find({ restaurantId: restaurante._id }).sort({ fechaRegistro: -1 });
        res.json(contactos);

    } catch (error) {
        console.error('Error al obtener contactos CRM:', error);
        res.status(500).json({ msg: 'Error de servidor', error: error.message });
    }
});

// Obtener el buzón de mensajes del restaurante actual
router.get('/mis-mensajes', verificarToken, async (req, res) => {
    try {
        const adminId = req.admin._id;
        
        const restaurante = await Restaurant.findOne({ adminId: adminId });
        if (!restaurante) {
            return res.status(404).json({ msg: 'No tienes un restaurante asignado' });
        }

        const mensajes = await MensajePrivado.find({ restaurantId: restaurante._id }).sort({ fecha: -1 });
        res.json(mensajes);

    } catch (error) {
        console.error('Error al obtener mensajes privados:', error);
        res.status(500).json({ msg: 'Error de servidor', error: error.message });
    }
});

// Marcar un mensaje como "leído"
router.patch('/mis-mensajes/:id/leido', verificarToken, async (req, res) => {
    try {
        const mensajePrivadoId = req.params.id;
        // Solo mensajes del restaurante de este administrador (antes cualquiera podía marcar los de otros)
        const restaurante = await Restaurant.findOne({ adminId: req.admin._id }).select('_id').lean();
        if (!restaurante) {
            return res.status(404).json({ msg: 'No tienes un restaurante asignado' });
        }
        const mensajeUpdate = await MensajePrivado.findOneAndUpdate(
            { _id: mensajePrivadoId, restaurantId: restaurante._id },
            { leido: true },
            { new: true }
        );
        if (!mensajeUpdate) {
            return res.status(404).json({ msg: 'Mensaje no encontrado' });
        }
        res.json(mensajeUpdate);
    } catch(error) {
        res.status(500).json({ msg: 'Error al marcar como leído' });
    }
});

module.exports = router;
