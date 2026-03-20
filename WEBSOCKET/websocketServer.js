// ===== WEBSOCKET/websocketServer.js =====
const WebSocket = require('ws');
const Restaurant = require('../models/Restaurant');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Set();
    this.init();
  }

  init() {
    this.wss.on('connection', (ws, req) => {
      console.log('✅ Nueva conexión WebSocket establecida');
      
      // Agregar cliente a la lista
      this.clients.add(ws);

      // Enviar mensaje de bienvenida
      ws.send(JSON.stringify({
        type: 'connection',
        message: 'Conectado al servidor de actualizaciones en tiempo real',
        timestamp: new Date().toISOString()
      }));

      // Manejar mensajes del cliente
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error('Error procesando mensaje del cliente:', error);
        }
      });

      // Manejar desconexión
      ws.on('close', () => {
        console.log('❌ Cliente WebSocket desconectado');
        this.clients.delete(ws);
      });

      // Manejar errores
      ws.on('error', (error) => {
        console.error('Error en WebSocket:', error);
        this.clients.delete(ws);
      });
    });

    console.log('🔌 Servidor WebSocket iniciado');
  }

  // Manejar mensajes específicos del cliente
  handleClientMessage(ws, data) {
    switch (data.type) {
      case 'subscribe':
        // Cliente se suscribe a actualizaciones
        ws.subscribed = true;
        ws.send(JSON.stringify({
          type: 'subscribed',
          message: 'Suscrito a actualizaciones de restaurantes'
        }));
        break;
        
      case 'unsubscribe':
        // Cliente se desuscribe
        ws.subscribed = false;
        ws.send(JSON.stringify({
          type: 'unsubscribed',
          message: 'Desuscrito de actualizaciones'
        }));
        break;
        
      case 'ping':
        // Keep-alive
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
        break;
    }
  }

  // Notificar a todos los clientes suscritos
  broadcast(data) {
    const message = JSON.stringify(data);
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.subscribed) {
        try {
          client.send(message);
        } catch (error) {
          console.error('Error enviando mensaje a cliente:', error);
          this.clients.delete(client);
        }
      }
    });
  }

  // Notificar nuevo restaurante
  notifyNewRestaurant(restaurant) {
    this.broadcast({
      type: 'new_restaurant',
      data: {
        id: restaurant._id,
        nombre: restaurant.nombre,
        tipo: restaurant.tipo,
        ciudad: restaurant.direccion.ciudad,
        fechaCreacion: restaurant.fechaCreacion
      },
      message: `Nuevo ${restaurant.tipo}: ${restaurant.nombre}`,
      timestamp: new Date().toISOString()
    });
  }

  // Notificar restaurante actualizado
  notifyUpdatedRestaurant(restaurant, cambios = {}) {
    this.broadcast({
      type: 'updated_restaurant',
      data: {
        id: restaurant._id,
        nombre: restaurant.nombre,
        tipo: restaurant.tipo,
        cambios,
        fechaActualizacion: restaurant.fechaActualizacion
      },
      message: `${restaurant.nombre} ha sido actualizado`,
      timestamp: new Date().toISOString()
    });
  }

  // Notificar estadísticas actualizadas
  notifyStatsUpdate(stats) {
    this.broadcast({
      type: 'stats_update',
      data: stats,
      message: 'Estadísticas actualizadas',
      timestamp: new Date().toISOString()
    });
  }

  // Obtener número de clientes conectados
  getConnectedClients() {
    return this.clients.size;
  }
}

module.exports = WebSocketServer;

// ===== MIDDLEWARE/websocketNotifier.js =====
class WebSocketNotifier {
  constructor(wsServer) {
    this.wsServer = wsServer;
  }

  // Middleware para detectar cambios en restaurantes
  attachToRestaurantModel() {
    const Restaurant = require('../models/Restaurant');

    // Hook post-save para nuevos restaurantes
    Restaurant.schema.post('save', async function(doc, next) {
      try {
        if (this.isNew) {
          // Es un nuevo restaurante
          const populatedDoc = await Restaurant.findById(doc._id)
            .populate('adminId', 'nombre apellido');
          
          if (global.wsServer) {
            global.wsServer.notifyNewRestaurant(populatedDoc);
          }
        }
        next();
      } catch (error) {
        console.error('Error en hook post-save:', error);
        next();
      }
    });

    // Hook post-findOneAndUpdate para actualizaciones
    Restaurant.schema.post('findOneAndUpdate', async function(doc, next) {
      try {
        if (doc) {
          const populatedDoc = await Restaurant.findById(doc._id)
            .populate('adminId', 'nombre apellido');
          
          if (global.wsServer) {
            global.wsServer.notifyUpdatedRestaurant(populatedDoc);
          }
        }
        next();
      } catch (error) {
        console.error('Error en hook post-update:', error);
        next();
      }
    });
  }

  // Notificar manualmente
  notifyChange(type, data) {
    if (this.wsServer) {
      this.wsServer.broadcast({
        type,
        data,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = { WebSocketServer, WebSocketNotifier };

// ===== COMO INTEGRAR EN server.js =====
/*
const http = require('http');
const { WebSocketServer, WebSocketNotifier } = require('./websocket/websocketServer');

// Crear servidor HTTP
const server = http.createServer(app);

// Inicializar WebSocket
const wsServer = new WebSocketServer(server);
const wsNotifier = new WebSocketNotifier(wsServer);

// Hacer disponible globalmente
global.wsServer = wsServer;

// Configurar hooks de modelos
wsNotifier.attachToRestaurantModel();

// Usar el servidor HTTP en lugar de app.listen
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🔌 WebSocket disponible en ws://localhost:${PORT}`);
});
*/