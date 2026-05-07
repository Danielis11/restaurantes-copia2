const express = require('express');
const router = express.Router();
const rankingAdminController = require('../controllers/rankingAdminController');
const { verificarToken, verificarAdminRanking } = require('../middleware/auth');

router.get('/public/top', rankingAdminController.getTopPortadaPublico);

router.use(verificarToken, verificarAdminRanking);

router.get('/list', rankingAdminController.getRankingList);
router.put('/positions', rankingAdminController.saveTopPositions);

module.exports = router;
