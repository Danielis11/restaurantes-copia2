// seedDatabaseJalpan_COMPLETO_55.js - TODOS los 55 establecimientos reales de Jalpan
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Modelos
const Admin = require('./models/Admin');
const Restaurant = require('./models/Restaurant');

// Función para generar URL de Facebook válida
const generarFacebookURL = (nombrePagina) => {
  if (!nombrePagina || nombrePagina.trim() === '') return '';
  if (nombrePagina.startsWith('http')) return nombrePagina;
  
  const slug = nombrePagina
    .toLowerCase()
    .trim()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .substring(0, 50);
  
  return slug ? `https://facebook.com/${slug}` : '';
};

// Función para generar correo si no tiene
const generarCorreo = (nombre) => {
  const slug = nombre
    .toLowerCase()
    .trim()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);
  
  return `${slug}@jalpan.com.mx`;
};

// TODOS LOS 55 ESTABLECIMIENTOS REALES DE JALPAN
const establecimientosJalpan = [
  // ===== RESTAURANTES / FONDAS / COMEDORES (32) =====
  {
    admin: { nombre: 'Efraín', apellido: 'Olvera Orduña', email: 'payin_olvera@hotmail.com' },
    restaurante: { nombre: 'El Aguaje del Moro', tipo: 'restaurante', descripcion: 'Restaurante tradicional con terraza en el centro de Jalpan, especializado en comida regional con ambiente familiar.', direccion: 'Andador Vicente Guerrero S/N, esq. Heroico Colegio Militar', telefono: '4412960425', capacidad: 40, petFriendly: false, facebook: 'El Aguaje del Moro', instagram: '@aguaje_del_moro_jalpan', rnt: 'SI' }
  },
  {
    admin: { nombre: 'Gustavo', apellido: 'Bernon Solis', email: 'gus0885@hotmail.com' },
    restaurante: { nombre: 'Antojitos Gus Gus', tipo: 'restaurante', descripcion: 'Antojitos mexicanos auténticos en Piedras Anchas, conocido por sus platillos caseros y ambiente pet-friendly.', direccion: 'Camino Real S/N, Loc. Piedras Anchas', telefono: '4411194680', capacidad: 70, petFriendly: true, facebook: 'Antojitos GUS GUS', instagram: '@antojitosgus', rnt: 'SI' }
  },
  {
    admin: { nombre: 'Lin', apellido: 'Chen', email: 'alingcomidachina@jalpan.com.mx' },
    restaurante: { nombre: 'A Ling Comida China', tipo: 'restaurante', descripcion: 'Auténtica comida china en el centro de Jalpan, fusión de sabores orientales con ingredientes locales.', direccion: 'Fray Junípero Serra #10, Col. Centro', telefono: '4411027997', capacidad: 45, petFriendly: false, facebook: 'Comida China Aling', instagram: '', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Alejandro', apellido: 'José Olvera', email: 'eljaralito79@yahoo.com.mx' },
    restaurante: { nombre: 'La Casita de Alex', tipo: 'restaurante', descripcion: 'Restaurante familiar con gran capacidad, especializado en eventos y celebraciones en ambiente acogedor.', direccion: 'Priv. Sonora S/N, Col. Solidaridad', telefono: '4411016583', capacidad: 120, petFriendly: true, facebook: 'La Casita de Alex', instagram: '@la_casita_de_alex', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Abigail', apellido: 'Reséndiz Ramírez', email: 'restaurantbarcasaarriaga@gmail.com' },
    restaurante: { nombre: 'Casa Arriaga Restaurant - Bar', tipo: 'restaurante', descripcion: 'Restaurant-bar en Rincón de Tancama, amplio espacio para eventos y celebraciones.', direccion: 'Rincón de Tancama S/N, Loc. Rincón de Tancama', telefono: '4411154647', capacidad: 150, petFriendly: false, facebook: 'Casa Arriaga Restaurant-Bar', instagram: '@casa_arriaga_restaurante_bar', rnt: 'SI' }
  },
  {
    admin: { nombre: 'Fonda', apellido: 'Doña Chole', email: 'fondadonachole@jalpan.com.mx' },
    restaurante: { nombre: 'Fonda Doña Chole', tipo: 'restaurante', descripcion: 'Fonda tradicional en Arroyo de las Cañas, comida casera con sazón familiar.', direccion: 'Carr. Fed. 69 Jalpan - Río Verde km 3.2, Loc. Arroyo de las Cañas', telefono: '4411000001', capacidad: 35, petFriendly: false, facebook: '', instagram: '', rnt: 'NO' }
  },
  {
    admin: { nombre: 'La', apellido: 'Burguesería', email: 'laburgueseria@jalpan.com.mx' },
    restaurante: { nombre: 'La Burguesería', tipo: 'restaurante', descripcion: 'Restaurante especializado en hamburguesas gourmet y comida rápida de calidad.', direccion: 'Calle José Vazconcelos. Col. San Francisco', telefono: '4411142162', capacidad: 40, petFriendly: false, facebook: '', instagram: '', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Lizbeth', apellido: 'Ledezma Torre', email: 'danielamg1718@gmail.com' },
    restaurante: { nombre: 'Restaurant Carretas', tipo: 'restaurante', descripcion: 'Restaurante carretero ideal para viajeros con comida regional y terraza pet-friendly.', direccion: 'Carr. Fed. 120 San Juan del Río - Xilitla km 179.5, Col. Centro', telefono: '4411523696', capacidad: 50, petFriendly: true, facebook: 'Restaurants Carretas', instagram: '@restaurante.carretas', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Jorge', apellido: 'Magallon Barrientos', email: 'comedormeztli@gmail.com' },
    restaurante: { nombre: 'El Comandante', tipo: 'restaurante', descripcion: 'Comedor familiar en San Francisco con ambiente relajado y comida casera.', direccion: 'Justo Sierra #42, Col. San Francisco', telefono: '4411200617', capacidad: 42, petFriendly: true, facebook: 'El Comandante', instagram: '@el_comandantejalpan23', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Irinea', apellido: 'Sierra', email: 'comedorconchita@jalpan.com.mx' },
    restaurante: { nombre: 'Comedor Conchita', tipo: 'restaurante', descripcion: 'Pequeño comedor tradicional en el Panteón, conocido por sus desayunos caseros.', direccion: 'Francisco Javier Mina S/N, esq. Av. La Presa, Bo. El Panteón', telefono: '4411008795', capacidad: 22, petFriendly: false, facebook: 'Comedor Conchita', instagram: '', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Maila', apellido: 'Cruz Márquez', email: 'izabet.agosto@gmail.com' },
    restaurante: { nombre: 'Crustáceo Cascarudo', tipo: 'restaurante', descripcion: 'Especialista en mariscos frescos en Puerto de San Nicolás, ambiente familiar.', direccion: 'Arroyo de los Aguacates S/N, Col. Puerto de San Nicolás', telefono: '4411334347', capacidad: 25, petFriendly: true, facebook: 'Crustáceo Cascarudo', instagram: '@crustaceo__.cascarudo', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Ignacia', apellido: 'Hernández', email: 'fondadonachila@jalpan.com.mx' },
    restaurante: { nombre: 'Fonda Doña Chila', tipo: 'restaurante', descripcion: 'Fonda tradicional en el mercado local, comida casera desde temprano.', direccion: 'Mariano Jiménez S/N, Col. El Mercado (Local 11)', telefono: '4411017952', capacidad: 30, petFriendly: false, facebook: 'Fonda DOÑA Chila', instagram: '', rnt: 'SI' }
  },
  {
    admin: { nombre: 'Zeferino', apellido: 'Palacios', email: 'zeferinop.sanchez@gmail.com' },
    restaurante: { nombre: 'Restaurant Karina', tipo: 'restaurante', descripcion: 'Restaurante carretero con comida tradicional, punto de parada para viajeros.', direccion: 'Carr. Fed. 120 San Juan del Río - Xilitla km 179.5, Col. Centro', telefono: '4411057231', capacidad: 40, petFriendly: false, facebook: '', instagram: '', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Juan', apellido: 'Olvera Orduña', email: 'mesondecaporales@jalpan.com.mx' },
    restaurante: { nombre: 'Mesón de Caporales', tipo: 'restaurante', descripcion: 'Mesón tradicional en la entrada de Jalpan, comida regional con tradición familiar.', direccion: 'Carr. Fed. 69 Jalpan - Río Verde km 0.1, Col. Centro', telefono: '4412960002', capacidad: 50, petFriendly: false, facebook: 'Mesón de Caporales', instagram: '', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Mario', apellido: 'Luna Bolaños', email: 'mario.luna.meztli@gmail.com' },
    restaurante: { nombre: 'Comedor Meztli', tipo: 'restaurante', descripcion: 'Comedor familiar en Saldiveña con ambiente campestre y comida casera.', direccion: 'Carr. Fed. 69 Jalpan - Río Verde km 3.4, Loc. Saldiveña', telefono: '4411371228', capacidad: 50, petFriendly: true, facebook: 'Comedor Meztli', instagram: '@comedor_meztli', rnt: 'SI' }
  },
  {
    admin: { nombre: 'Karen', apellido: 'Rico Del Carmen', email: 'rico.factur@outlook.es' },
    restaurante: { nombre: 'El Naranjito', tipo: 'restaurante', descripcion: 'Restaurante de mariscos en El Naranjito, especializado en pescados frescos.', direccion: 'Carr. Pavimentada a Sabino Chico km 15, Loc. El Naranjito', telefono: '7222692146', capacidad: 150, petFriendly: true, facebook: 'Restaurante El Naranjito Mariscos y algo mas', instagram: '@restaurante_el_naranjito', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Los', apellido: 'Norteños', email: 'losnortenos@jalpan.com.mx' },
    restaurante: { nombre: 'Restaurante Los Norteños', tipo: 'restaurante', descripcion: 'Comida norteña auténtica en Embocadero, carnes asadas y especialidades del norte.', direccion: 'Carr. Fed. 120 San Juan del Río - Xilitla km 185.7, Loc. Embocadero', telefono: '4412651103', capacidad: 60, petFriendly: false, facebook: 'Los norteños', instagram: '', rnt: 'TESTAMENTO' }
  },
  {
    admin: { nombre: 'Oralia', apellido: 'Diaz Martinez', email: 'lasorquideas@jalpan.com.mx' },
    restaurante: { nombre: 'Las Orquídeas', tipo: 'restaurante', descripcion: 'Restaurante campestre en El Lindero, ambiente natural rodeado de orquídeas.', direccion: 'Carr. Fed. 69 Jalpan - Río Verde km 8, Loc. El Lindero', telefono: '4411034233', capacidad: 45, petFriendly: true, facebook: '', instagram: '', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Saturnina', apellido: 'Mendez Acuña', email: 'palapalapresa@jalpan.com.mx' },
    restaurante: { nombre: 'Palapa La Presa', tipo: 'restaurante', descripcion: 'Palapa junto a la presa de Jalpan, ideal para fines de semana con vista al agua.', direccion: 'Malecón de la Presa Jalpan km 1, Col. La Presa', telefono: '4411013081', capacidad: 50, petFriendly: false, facebook: 'Palapa la presa', instagram: '', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Israel', apellido: 'Palacios Montoya', email: 'laparrilla@jalpan.com.mx' },
    restaurante: { nombre: 'La Parrilla Restaurante', tipo: 'restaurante', descripcion: 'Especialistas en carnes a la parrilla en Piedras Anchas, cortes selectos.', direccion: 'Carr. Fed. 120 San Juan del Río - Xilitla km 184, Loc. Piedras Anchas', telefono: '4411103376', capacidad: 55, petFriendly: false, facebook: 'La Parrilla', instagram: '@laparrilladecasatapancos', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Ricardo', apellido: 'Robledo Rodríguez', email: 'ricardorobledorodriguez6@gmail.com' },
    restaurante: { nombre: 'Richard Restaurante de Mariscos', tipo: 'restaurante', descripcion: 'Mariscos frescos en Piedras Anchas, especializado en ceviches y aguachiles.', direccion: 'Carr. Fed. 120 San Juan del Río - Xilitla km 184.3, Loc. Piedras Anchas', telefono: '4411064161', capacidad: 80, petFriendly: true, facebook: 'Richard', instagram: '@richard.restaurante', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Shanghai', apellido: 'Express', email: 'shanghaiexpress@jalpan.com.mx' },
    restaurante: { nombre: 'Shanghai Express Comida China', tipo: 'restaurante', descripcion: 'Comida china rápida en San José, platos tradicionales orientales con servicio express.', direccion: 'Juan Escutia #70, Col. San José', telefono: '4412961647', capacidad: 35, petFriendly: false, facebook: 'Shanghai Express', instagram: '', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Juan', apellido: 'Rosales Camacho', email: 'juan.pablo.rc2@gmail.com' },
    restaurante: { nombre: 'Sierra Bonita', tipo: 'restaurante', descripcion: 'Restaurante en el centro de Jalpan con vista a la sierra, comida regional.', direccion: 'Independencia #12, Col. Centro', telefono: '4411267463', capacidad: 40, petFriendly: false, facebook: 'Sierra Bonita', instagram: '@sierra.bonita.jalpan', rnt: 'SI' }
  },
  {
    admin: { nombre: 'Erendida', apellido: 'Resendiz', email: 'erendira_rdz@hotmail.com' },
    restaurante: { nombre: 'Sporting Wings', tipo: 'restaurante', descripcion: 'Sports bar con alitas y comida rápida, ambiente deportivo con pantallas.', direccion: 'Morelos S/N, Col. Centro', telefono: '4411295394', capacidad: 16, petFriendly: false, facebook: 'Sporting Wings', instagram: '@sporting_wings.1', rnt: 'SI' }
  },
  {
    admin: { nombre: 'Israel', apellido: 'Palacios', email: 'rale_6@hotmail.com' },
    restaurante: { nombre: 'Tapanco\'S Restaurant', tipo: 'restaurante', descripcion: 'Restaurante campestre en Arroyo de las Cañas, ambiente rústico con comida tradicional.', direccion: 'Carr. Fed. 69 Jalpan - Río Verde km 2, Loc. Arroyo de las Cañas', telefono: '4411197803', capacidad: 45, petFriendly: true, facebook: 'Tapanco\'S Restaurant', instagram: '@tapancosrestaurant_', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Alejandra', apellido: 'Diaz Tolentino', email: 'hotelrestaurantequila@gmail.com' },
    restaurante: { nombre: 'Hotel & Restaurant Tequila', tipo: 'restaurante', descripcion: 'Hotel-restaurante en Embocadero, servicios completos con hospedaje y comida tradicional.', direccion: 'Carr. Fed. 120 San Juan del Río - Xilitla km 185.5, Loc. Embocadero', telefono: '4411074453', capacidad: 120, petFriendly: true, facebook: 'Hotel & Restaurant Tequila', instagram: '@hotelrestauranttequila', rnt: 'Si' }
  },
  {
    admin: { nombre: 'Quirino', apellido: 'Garcia Cocino', email: 'laterrazarestaurante@hotmail.com' },
    restaurante: { nombre: 'La Terraza Restaurante - Hotel', tipo: 'restaurante', descripcion: 'Hotel-restaurante con terraza en Piedras Anchas, vista panorámica y hospedaje.', direccion: 'Carr. Fed. 120 San Juan del Río - Xilitla km 183.5, Loc. Piedras Anchas', telefono: '4411203684', capacidad: 80, petFriendly: true, facebook: 'La Terraza Restaurante-Hotel', instagram: '@laterrazarestaurantehotel', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Restaurante', apellido: 'Trogón', email: 'restaurantetrogon@jalpan.com.mx' },
    restaurante: { nombre: 'Restaurante Trogón', tipo: 'restaurante', descripcion: 'Restaurante en Saldiveña con temática de aves, ambiente natural y comida regional.', direccion: 'Carr. Fed. 69 Jalpan - Río Verde km 5.2, Loc. Saldiveña', telefono: '4411009296', capacidad: 40, petFriendly: true, facebook: 'Ave Suites', instagram: '@avesuites', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Restaurante', apellido: 'Vicky', email: 'restaurantevicky@jalpan.com.mx' },
    restaurante: { nombre: 'Restaurante Vicky', tipo: 'restaurante', descripcion: 'Restaurante carretero en Piedras Anchas, comida casera y atención familiar.', direccion: 'Carr. Fed. 120 San Juan del Río - Xilitla km 183, Loc. Piedras Anchas', telefono: '4412960428', capacidad: 35, petFriendly: false, facebook: '', instagram: '', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Villas', apellido: 'del Sol', email: 'villasdelsol@jalpan.com.mx' },
    restaurante: { nombre: 'Villas del sol', tipo: 'restaurante', descripcion: 'Complejo turístico con restaurante, villas y servicios de hospedaje.', direccion: 'Zona turística de Jalpan de Serra', telefono: '4411000002', capacidad: 60, petFriendly: true, facebook: '', instagram: '', rnt: 'SI' }
  },
  {
    admin: { nombre: 'Meson', apellido: 'de Saldiveña', email: 'juanyz1988@gmail.com' },
    restaurante: { nombre: 'Meson de Saldiveña', tipo: 'restaurante', descripcion: 'Mesón tradicional en Puerto de San Nicolás con comida regional y ambiente campestre.', direccion: 'San Nicolás, Puerto de San Nicolás, 76340 Jalpan de Serra, Qro.', telefono: '4411364296', capacidad: 45, petFriendly: true, facebook: '', instagram: '', rnt: 'SI' }
  },
  {
    admin: { nombre: 'Sierra', apellido: 'y Mar', email: 'sierraymar@jalpan.com.mx' },
    restaurante: { nombre: 'Sierra y Mar', tipo: 'restaurante', descripcion: 'Restaurante con especialidades de sierra y mar, fusión de montaña y costa.', direccion: 'Heroico Colegio Militar 1446, San Jose de Serra., Jalpan, Mexico', telefono: '4411355863', capacidad: 50, petFriendly: false, facebook: '', instagram: '', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Santa', apellido: 'Cecilia', email: 'santacecilia@jalpan.com.mx' },
    restaurante: { nombre: 'Restaurante Santa Cecilia', tipo: 'restaurante', descripcion: 'Restaurante familiar en Puerto de San Nicolás con comida tradicional mexicana.', direccion: 'Puerto de San Nicolás, 76345 Jalpan de Serra, Qro.', telefono: '4411000003', capacidad: 40, petFriendly: false, facebook: '', instagram: '', rnt: 'NO' }
  },
  {
    admin: { nombre: 'La Curva', apellido: 'del Sabor', email: 'lacurvadelsabor@jalpan.com.mx' },
    restaurante: { nombre: 'Restaurante la Curva del sabor', tipo: 'restaurante', descripcion: 'Restaurante con sabores únicos en Puerto de San Nicolás, especialidades locales.', direccion: 'Puerto de San Nicolás, 76345 Jalpan de Serra, Qro.', telefono: '4411183336', capacidad: 35, petFriendly: true, facebook: '', instagram: '', rnt: 'SI' }
  },
  {
    admin: { nombre: 'El', apellido: 'Paseado', email: 'taniarodelo_21@hotmail.com' },
    restaurante: { nombre: 'El Paseado', tipo: 'restaurante', descripcion: 'Restaurante en la carretera a Xilitla, ideal para viajeros y turistas de paso.', direccion: 'Carretera Xilitla km 1, Jalpan, Mexico', telefono: '6676979155', capacidad: 45, petFriendly: false, facebook: '', instagram: '', rnt: 'NO' }
  },

  // ===== CAFETERÍAS (12) =====
  {
    admin: { nombre: 'Nievex', apellido: 'Jalpan', email: 'nievex_jalpan@hotmail.com' },
    restaurante: { nombre: 'Nievex Jalpan', tipo: 'cafeteria', descripcion: 'Nieves exóticas y especialidades heladas en el centro de Jalpan.', direccion: 'Independencia 76340, Centro, 76340 Jalpan de Serra, Qro.', telefono: '4411184315', capacidad: 25, petFriendly: true, facebook: 'NievEx Jalpan - Nieves Exóticas', instagram: '', rnt: 'SI' }
  },
  {
    admin: { nombre: 'Cacao', apellido: 'Pastelería', email: 'cacaopasteleria@jalpan.com.mx' },
    restaurante: { nombre: 'Cacao Pastelería y Tapiocas', tipo: 'cafeteria', descripcion: 'Pastelería moderna con tapiocas, postres artesanales y café de especialidad.', direccion: 'Carr. Fed. 120 San Juan del Río - Xilitla. No. 1665 Col. San José', telefono: '4191330426', capacidad: 45, petFriendly: false, facebook: 'Cacao Pastelería y Tapiocas', instagram: '@cacaopasteleriay', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Guadalupe', apellido: 'Pedraza Sanchez', email: 'casadelasavesjalpan@gmail.com' },
    restaurante: { nombre: 'Café de las Aves', tipo: 'cafeteria', descripcion: 'Café temático con observación de aves, ambiente natural y café orgánico.', direccion: 'Centro de Jalpan de Serra', telefono: '4411068307', capacidad: 28, petFriendly: true, facebook: 'Casa de las Aves', instagram: '@casadelasaves_jalpan', rnt: '' }
  },
  {
    admin: { nombre: 'Leticia', apellido: 'Andablo', email: 'laestacioncafeteria@jalpan.com.mx' },
    restaurante: { nombre: 'La Estación Cafetería', tipo: 'cafeteria', descripcion: 'Cafetería con temática ferroviaria, café artesanal y ambiente vintage.', direccion: 'Centro de Jalpan de Serra', telefono: '4411148884', capacidad: 40, petFriendly: true, facebook: 'La Estación Cafetería', instagram: '@laestacioncafeteria01', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Andres', apellido: 'Rodriguez', email: 'lafrancesa@jalpan.com.mx' },
    restaurante: { nombre: 'La Francesa', tipo: 'cafeteria', descripcion: 'Crepería y frapería con estilo francés, crepes dulces y saladas con café.', direccion: 'Ezequiel Montes S/N, esq. Boulevard Corregidora, Col. El Coco', telefono: '4411001193', capacidad: 16, petFriendly: false, facebook: 'La francesa', instagram: '@la_francesa_creperia_fraperia', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Maria', apellido: 'Jimenez Montoya', email: 'anita_montoya98@hotmail.com' },
    restaurante: { nombre: 'Josefa Cocina y Café', tipo: 'cafeteria', descripcion: 'Cocina y café en el centro, fusión de comida casera con café artesanal.', direccion: 'Carr. Fed. 69 Jalpan - Río Verde km 0, Col. Centro', telefono: '4411317585', capacidad: 20, petFriendly: true, facebook: 'Josefa cocina y café', instagram: '', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Veronica', apellido: 'Resendiz', email: 'kawacoffeshop@gmail.com' },
    restaurante: { nombre: 'Kawa Coffee Shop', tipo: 'cafeteria', descripcion: 'Coffee shop moderno en el centro, café de especialidad con espacio de trabajo.', direccion: 'Benito Juárez #29, Col. Centro', telefono: '4412961328', capacidad: 30, petFriendly: true, facebook: 'Kawa Coffee Shop', instagram: '@kawa_coffeeshop', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Pao', apellido: 'Cafetería', email: 'almacarinaldlc@gmail.com' },
    restaurante: { nombre: 'Pao\'s Cafetería', tipo: 'cafeteria', descripcion: 'Cafetería familiar en El Puente, café casero y repostería artesanal.', direccion: 'Santiago Apóstol #8, Col. El Puente', telefono: '4411051918', capacidad: 25, petFriendly: false, facebook: 'Pao\'s Cafetería', instagram: '@paoscafeteria', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Antonia', apellido: 'Cabrera', email: 'priscillascafe@jalpan.com.mx' },
    restaurante: { nombre: 'Priscilla\'s Café', tipo: 'cafeteria', descripcion: 'Café íntimo en el centro, especializado en café tradicional y repostería casera.', direccion: 'Petra de Mallorca S/N, Col. Centro', telefono: '4411164481', capacidad: 12, petFriendly: false, facebook: 'Priscilla\'s Café', instagram: '', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Lidia', apellido: 'Alvarez', email: 'lilascafe@jalpan.com.mx' },
    restaurante: { nombre: 'Lila\'s Café', tipo: 'cafeteria', descripcion: 'Café tradicional en el centro, desayunos y café casero en ambiente familiar.', direccion: 'Morelos #15, Col. Centro', telefono: '4412960232', capacidad: 16, petFriendly: false, facebook: 'Lila\'s Café', instagram: '', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Antojitos', apellido: 'Mexicanos', email: 'antojitosmexicanos@jalpan.com.mx' },
    restaurante: { nombre: 'Antojitos Mexicanos la Azteca', tipo: 'cafeteria', descripcion: 'Antojitos mexicanos tradicionales en el centro, quesadillas y comida típica.', direccion: 'Abelardo Ávila 4, Centro, 76340 Jalpan de Serra, Qro.', telefono: '4411000004', capacidad: 30, petFriendly: false, facebook: '', instagram: '', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Victor', apellido: 'Rosales', email: 'victormrosales@jalpan.com.mx' },
    restaurante: { nombre: 'Rosales', tipo: 'cafeteria', descripcion: 'Cafetería familiar en el centro, desayunos, comidas y cenas en ambiente acogedor.', direccion: 'cayetano rubio #3', telefono: '4411209617', capacidad: 30, petFriendly: false, facebook: 'cafeteria rosales', instagram: '', rnt: 'NO' }
  },

  // ===== BARES (11) =====
  {
    admin: { nombre: 'Miriam', apellido: 'Ponce', email: 'lacigarramusicbar@jalpan.com.mx' },
    restaurante: { nombre: 'La Cigarra Music Bar', tipo: 'bar', descripcion: 'Music bar en el centro con ambiente nocturno, música en vivo y cocteles especiales.', direccion: 'Morelos S/N, Col. Centro', telefono: '4412961613', capacidad: 50, petFriendly: false, facebook: 'La Cigarra Music Bar', instagram: '@lacigarrajalpan', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Sporting', apellido: 'Wings Bar', email: 'sportingwingsbar@jalpan.com.mx' },
    restaurante: { nombre: 'Sporting Wings Bar', tipo: 'bar', descripcion: 'Sports bar en Las Misiones, especializado en alitas y bebidas con transmisiones deportivas.', direccion: 'Carr. Fed. 69 Jalpan - Río Verde km 1, Col. Las Misiones', telefono: '4411208366', capacidad: 50, petFriendly: false, facebook: 'Sporting Wings Bar', instagram: '@sportingwings_bar', rnt: 'SI' }
  },
  {
    admin: { nombre: 'Efrain', apellido: 'Olvera Bar', email: 'efrain.olvera.bar@jalpan.com.mx' },
    restaurante: { nombre: 'El Aguaje del Moro Bar', tipo: 'bar', descripcion: 'Bar-restaurante con terraza, ambiente familiar nocturno en el centro de Jalpan.', direccion: 'Andador Vicente Guerrero S/N, esq. Heroico Colegio Militar', telefono: '4412960425', capacidad: 40, petFriendly: true, facebook: 'El Aguaje del Moro', instagram: '@aguaje_del_moro_jalpan', rnt: 'SI' }
  },
  {
    admin: { nombre: 'Francisco', apellido: 'Lemus', email: 'la28restaurantebar@jalpan.com.mx' },
    restaurante: { nombre: 'La 28 - Restaurante Bar', tipo: 'bar', descripcion: 'Restaurante-bar en Arroyo de las Cañas, ambiente relajado con comida y bebidas.', direccion: 'Carr. Fed. 69 Jalpan - Río Verde km 1.2, Loc. Arroyo de las Cañas', telefono: '4411054878', capacidad: 60, petFriendly: false, facebook: 'La 28 Restaurante Bar', instagram: '', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Las', apellido: 'Jarras', email: 'lasjarras@jalpan.com.mx' },
    restaurante: { nombre: 'Las Jarras', tipo: 'bar', descripcion: 'Bar tradicional en El Puente junto al río, ambiente campestre con jarras de barro.', direccion: 'Rivera del Río #18, Col. El Puente', telefono: '4411074574', capacidad: 40, petFriendly: true, facebook: 'Las Jarras', instagram: '@lasjarrasoficial', rnt: 'NO' }
  },
  {
    admin: { nombre: 'La', apellido: 'Malinche', email: 'lamalinche@jalpan.com.mx' },
    restaurante: { nombre: ' La Malinche', tipo: 'bar', descripcion: 'Bar en La Playita junto al río, ambiente bohemio con vista al agua.', direccion: 'Calle. Rivera del Río - La Playita. Barrio el Puente', telefono: '4411154102', capacidad: 35, petFriendly: true, facebook: 'La Malinche Jalpan Restaurants', instagram: '', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Rhinos', apellido: 'Mojito', email: 'rhinosmojito@jalpan.com.mx' },
    restaurante: { nombre: 'Rhinos Mojito', tipo: 'bar', descripcion: 'Bar especializado en mojitos y cocteles tropicales, ambiente moderno en el centro.', direccion: 'Calle. Gral. Rocha esquina Morelos, Col Ortigas, Jalpan de Serra.', telefono: '7541083690', capacidad: 45, petFriendly: false, facebook: 'Rhinos mojito', instagram: '@rhinosmojitos', rnt: 'NO' }
  },
  {
    admin: { nombre: 'Gloria', apellido: 'Trejo', email: 'micheladaschachis@jalpan.com.mx' },
    restaurante: { nombre: 'Micheladas Chachis', tipo: 'bar', descripcion: 'Especialistas en micheladas en la carretera a Río Verde, bebidas preparadas.', direccion: 'Carretera Jalpan - Rioverde KM. 2, Jalpan de Serra', telefono: '4411050775', capacidad: 30, petFriendly: false, facebook: 'Chachis Trejo', instagram: '@micheladaschachis', rnt: 'NO' }
  }
];

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

// Funciones auxiliares
const generarCoordenadasJalpan = () => {
    // Coordenadas centrales de Jalpan: Lat: 21.2185, Lng: -99.4752
    // Distorsión pequeña para espaciarlos por el mapa
    const lat = 21.2185 + (Math.random() - 0.5) * 0.05;
    const lng = -99.4752 + (Math.random() - 0.5) * 0.05;
    return { lat, lng };
};

const generarHorarios = (tipo) => {
  const horariosBase = {
    restaurante: {
      lunes: { abierto: true, apertura: '08:00', cierre: '22:00' },
      martes: { abierto: true, apertura: '08:00', cierre: '22:00' },
      miercoles: { abierto: true, apertura: '08:00', cierre: '22:00' },
      jueves: { abierto: true, apertura: '08:00', cierre: '22:00' },
      viernes: { abierto: true, apertura: '08:00', cierre: '23:00' },
      sabado: { abierto: true, apertura: '08:00', cierre: '23:00' },
      domingo: { abierto: true, apertura: '09:00', cierre: '21:00' }
    },
    bar: {
      lunes: { abierto: true, apertura: '16:00', cierre: '02:00' },
      martes: { abierto: true, apertura: '16:00', cierre: '02:00' },
      miercoles: { abierto: true, apertura: '16:00', cierre: '02:00' },
      jueves: { abierto: true, apertura: '16:00', cierre: '02:00' },
      viernes: { abierto: true, apertura: '16:00', cierre: '03:00' },
      sabado: { abierto: true, apertura: '16:00', cierre: '03:00' },
      domingo: { abierto: true, apertura: '14:00', cierre: '24:00' }
    },
    cafeteria: {
      lunes: { abierto: true, apertura: '07:00', cierre: '20:00' },
      martes: { abierto: true, apertura: '07:00', cierre: '20:00' },
      miercoles: { abierto: true, apertura: '07:00', cierre: '20:00' },
      jueves: { abierto: true, apertura: '07:00', cierre: '20:00' },
      viernes: { abierto: true, apertura: '07:00', cierre: '21:00' },
      sabado: { abierto: true, apertura: '08:00', cierre: '21:00' },
      domingo: { abierto: true, apertura: '08:00', cierre: '20:00' }
    }
  };
  
  return horariosBase[tipo] || horariosBase.restaurante;
};

const generarMenu = (tipo) => {
  const menus = {
    restaurante: [
      {
        categoria: 'Platillos Principales',
        items: [
          { nombre: 'Enchiladas Queretanas', descripcion: 'Con queso local y salsa roja', precio: 120 },
          { nombre: 'Cecina Enchilada', descripcion: 'Especialidad de la Sierra Gorda', precio: 180 },
          { nombre: 'Gorditas de Chicharrón', descripcion: 'Tortillas rellenas tradicionales', precio: 95 }
        ]
      }
    ],
    bar: [
      {
        categoria: 'Bebidas Tradicionales',
        items: [
          { nombre: 'Mezcal de la Sierra', descripcion: 'Destilado local artesanal', precio: 80 },
          { nombre: 'Pulque Curado', descripcion: 'De frutas de temporada', precio: 60 },
          { nombre: 'Cerveza Artesanal Local', descripcion: 'Producida en Querétaro', precio: 45 }
        ]
      }
    ],
    cafeteria: [
      {
        categoria: 'Cafés de la Sierra',
        items: [
          { nombre: 'Café de Olla', descripcion: 'Con canela y piloncillo', precio: 35 },
          { nombre: 'Café Americano Local', descripcion: 'Granos de la Sierra Gorda', precio: 40 },
          { nombre: 'Cappuccino Artesanal', descripcion: 'Con leche local', precio: 55 }
        ]
      }
    ]
  };
  
  return menus[tipo] || menus.restaurante;
};

// Función principal del seed (COMPLETO CON 55 ESTABLECIMIENTOS)
const seedDatabaseJalpan = async () => {
  try {
    console.log('\n🏪 CREANDO BASE DE DATOS CON TODOS LOS ESTABLECIMIENTOS REALES DE JALPAN');
    console.log('==========================================================================');
    console.log('🗑️  ADVERTENCIA: Esto borrará TODOS los datos existentes');
    console.log(`📍 Se crearán ${establecimientosJalpan.length} establecimientos reales + 1 Super Admin`);
    
    await connectDB();
    
    // Verificar emails duplicados
    console.log('\n🔍 Verificando emails duplicados...');
    const emails = establecimientosJalpan.map(item => item.admin.email);
    const emailsUnicos = new Set(emails);
    
    if (emails.length !== emailsUnicos.size) {
      console.log('❌ Se encontraron emails duplicados. Cancelando...');
      const duplicados = emails.filter((email, index) => emails.indexOf(email) !== index);
      console.log('Duplicados:', [...new Set(duplicados)]);
      return;
    }
    console.log('✅ Todos los emails son únicos');
    
    // BORRAR TODOS LOS DATOS EXISTENTES
    console.log('\n🗑️  Borrando todos los datos existentes...');
    const deletedAdmins = await Admin.deleteMany({});
    const deletedRestaurants = await Restaurant.deleteMany({});
    console.log(`✅ Eliminados ${deletedAdmins.deletedCount} admins y ${deletedRestaurants.deletedCount} restaurantes`);
    
    // CREAR SUPER ADMIN PRIMERO
    console.log('\n👑 Creando Super Admin...');
    try {
      const superAdmin = new Admin({
        nombre: 'Super',
        apellido: 'Admin',
        email: 'superadmin@jalpan.com.mx',
        password: 'superadmin123',
        telefono: '4411000000',
        rol: 'super-admin', // ← CORREGIDO: era 'superadmin', ahora es 'super-admin'
        activo: true
      });
      
      await superAdmin.save();
      console.log('✅ Super Admin creado exitosamente');
    } catch (error) {
      console.error('❌ Error creando Super Admin:', error.message);
    }
    
    console.log(`\n🏗️  Creando ${establecimientosJalpan.length} establecimientos reales...`);
    
    let creados = 0;
    let errores = 0;
    const credencialesCreadas = [];
    const estadisticas = { restaurante: 0, bar: 0, cafeteria: 0 };
    
    for (const [index, item] of establecimientosJalpan.entries()) {
      try {
        // Crear admin
        const admin = new Admin({
          nombre: item.admin.nombre,
          apellido: item.admin.apellido,
          email: item.admin.email,
          password: 'password123',
          telefono: item.restaurante.telefono,
          rol: 'admin',
          activo: true
        });
        
        const adminGuardado = await admin.save();
        
        // Crear restaurante con URLs válidas
        const restaurante = new Restaurant({
          nombre: item.restaurante.nombre,
          tipo: item.restaurante.tipo,
          descripcion: item.restaurante.descripcion,
          direccion: {
            calle: item.restaurante.direccion,
            ciudad: 'Jalpan de Serra',
            codigoPostal: '76340',
            coordenadas: generarCoordenadasJalpan()
          },
          telefono: item.restaurante.telefono,
          email: item.admin.email,
          capacidad: item.restaurante.capacidad,
          horarios: generarHorarios(item.restaurante.tipo),
          menu: generarMenu(item.restaurante.tipo),
          servicios: {
            petFriendly: item.restaurante.petFriendly || false,
            wifi: true,
            estacionamiento: true,
            terraza: item.restaurante.petFriendly || false
          },
          redes: {
            facebook: generarFacebookURL(item.restaurante.facebook),
            instagram: item.restaurante.instagram || '',
            website: ''
          },
          adminId: adminGuardado._id,
          activo: true
        });
        
        await restaurante.save();
        
        estadisticas[item.restaurante.tipo]++;
        credencialesCreadas.push({
          email: item.admin.email,
          nombre: `${item.admin.nombre} ${item.admin.apellido}`,
          restaurante: item.restaurante.nombre,
          tipo: item.restaurante.tipo,
          rnt: item.restaurante.rnt
        });
        
        creados++;
        console.log(`✅ ${index + 1}/${establecimientosJalpan.length} - ${item.restaurante.nombre} (${item.restaurante.tipo.toUpperCase()}) - ${item.admin.email}`);
        
      } catch (error) {
        errores++;
        console.error(`❌ Error con ${item.restaurante.nombre}:`, error.message);
      }
    }
    
    // Verificar totales finales
    const totalAdmins = await Admin.countDocuments();
    const totalRestaurantes = await Restaurant.countDocuments();
    
    // Estadísticas finales
    console.log('\n📊 ESTADÍSTICAS FINALES:');
    console.log('========================');
    console.log(`✅ Establecimientos creados: ${creados} de ${establecimientosJalpan.length}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`👑 Super Admin: 1`);
    console.log(`👤 Total Admins: ${totalAdmins}`);
    console.log(`🏪 Total Restaurantes: ${totalRestaurantes}`);
    console.log(`📍 Ubicación: Todos en Jalpan de Serra, Querétaro`);
    
    console.log(`\n🏪 DISTRIBUCIÓN POR TIPO:`);
    console.log(`   🍽️  Restaurantes: ${estadisticas.restaurante}`);
    console.log(`   🍺 Bares: ${estadisticas.bar}`);
    console.log(`   ☕ Cafeterías: ${estadisticas.cafeteria}`);
    
    // Estadísticas RNT
    const conRNT = credencialesCreadas.filter(c => c.rnt === 'SI').length;
    const sinRNT = credencialesCreadas.filter(c => c.rnt === 'NO').length;
    console.log(`\n📋 REGISTRO NACIONAL DE TURISMO (RNT):`);
    console.log(`   ✅ Con RNT: ${conRNT}`);
    console.log(`   ❌ Sin RNT: ${sinRNT}`);
    console.log(`   ⚠️  Otros: ${creados - conRNT - sinRNT}`);
    
    // Credenciales del Super Admin
    console.log('\n👑 SUPER ADMIN:');
    console.log('===============');
    console.log('📧 superadmin@jalpan.com.mx / superadmin123');
    console.log('🔑 Acceso completo al sistema');
    console.log('⚡ Puede gestionar todos los 55 establecimientos');
    
    // Ejemplos de credenciales
    console.log('\n🚀 EJEMPLOS DE ESTABLECIMIENTOS:');
    console.log('================================');
    console.log('📧 payin_olvera@hotmail.com / password123 → El Aguaje del Moro (Restaurante)');
    console.log('📧 gus0885@hotmail.com / password123 → Antojitos Gus Gus (Restaurante)');
    console.log('📧 restaurantbarcasaarriaga@gmail.com / password123 → Casa Arriaga Restaurant-Bar');
    console.log('📧 casadelasavesjalpan@gmail.com / password123 → Café de las Aves (Cafetería)');
    console.log('📧 lacigarramusicbar@jalpan.com.mx / password123 → La Cigarra Music Bar (Bar)');
    
    console.log('\n✨ BASE DE DATOS COMPLETA CON TODOS LOS ESTABLECIMIENTOS DE JALPAN');
    console.log('=================================================================');
    console.log('🔄 Reinicia tu servidor: npm run dev');
    console.log('🌐 Ve a: http://localhost:3003');
    console.log('👑 Super Admin: superadmin@jalpan.com.mx / superadmin123');
    console.log('🔐 Establecimientos: email / password123');
    console.log(`📱 ${creados} establecimientos reales + 1 Super Admin listos`);
    console.log('🏪 ¡El directorio más completo de Jalpan de Serra, Querétaro!');
    
    return { creados, errores, estadisticas, totalAdmins, totalRestaurantes };
    
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
  seedDatabaseJalpan()
    .then((resultado) => {
      console.log('\n🎉 ¡BASE DE DATOS COMPLETA CREADA CON ÉXITO!');
      console.log(`✨ ${resultado.creados} establecimientos reales de Jalpan de Serra`);
      console.log('🏆 ¡El directorio digital más completo de Jalpan!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabaseJalpan };