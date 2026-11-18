const IgnoredWord = require('../models/IgnoredWord');

// Obtener todas las palabras ignoradas
exports.getIgnoredWords = async (req, res) => {
    try {
        const words = await IgnoredWord.find().sort({ word: 1 });
        res.status(200).json({ success: true, data: words });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener palabras ignoradas', error: error.message });
    }
};

// Agregar una palabra ignorada
exports.addIgnoredWord = async (req, res) => {
    try {
        const { word } = req.body;

        if (!word) {
            return res.status(400).json({ success: false, message: 'La palabra es requerida' });
        }

        const newWord = await IgnoredWord.create({ word });
        res.status(201).json({ success: true, data: newWord });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Esta palabra ya está en la lista' });
        }
        res.status(500).json({ success: false, message: 'Error al agregar palabra', error: error.message });
    }
};

// Eliminar una palabra ignorada
exports.deleteIgnoredWord = async (req, res) => {
    try {
        const word = await IgnoredWord.findByIdAndDelete(req.params.id);

        if (!word) {
            return res.status(404).json({ success: false, message: 'Palabra no encontrada' });
        }

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar palabra', error: error.message });
    }
};
