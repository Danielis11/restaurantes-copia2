// Páginas HTML de los paneles y ruta de diagnóstico
// (Movido desde server.js sin cambios de lógica)
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const router = express.Router();
// Página principal
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Panel de admin
router.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

// Panel de admin Turismo
router.get('/admin-turismo', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin-turismo.html'));
});

// Panel Gubernamental
router.get('/admin-gobierno', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin-gobierno.html'));
});

// Panel Admin Ranking
router.get('/admin-ranking', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin-ranking.html'));
});

// Test básico
router.get('/test', (req, res) => {
  // Diagnóstico mínimo (sin exponer host ni rutas internas)
  res.json({ success: true, database: { connected: mongoose.connection.readyState === 1 } });
});

// Ruta para panel de super admin
router.get('/super-admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'super-admin.html'));
});

module.exports = router;
