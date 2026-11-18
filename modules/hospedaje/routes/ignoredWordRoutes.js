const express = require('express');
const router = express.Router();
const {
    getIgnoredWords,
    addIgnoredWord,
    deleteIgnoredWord
} = require('../controllers/ignoredWordController');
const { protect } = require('../middlewares/authMiddleware'); // Opcional, si queremos proteger la ruta

// Rutas de palabras ignoradas
router.route('/')
    .get(getIgnoredWords)
    .post(protect, addIgnoredWord);

router.route('/:id')
    .delete(protect, deleteIgnoredWord);

module.exports = router;
