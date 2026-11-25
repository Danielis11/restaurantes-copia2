// Noticias y eventos reales de Jalpan de Serra (2025-2026) para la sección
// «Noticias y eventos» de la portada. Se puede correr varias veces: si una
// noticia ya existe (mismo título en español) se actualiza, no se duplica.
//
//   node scripts/seedNoticias2026.js
//
// Fuentes (consultadas en noviembre de 2026):
//  - Feria Jalpan 2026 ........ jalpan.gob.mx/noticias.html?t=arranco-la-feria-jalpan-2026
//  - Festival de las Juventudes gente-bien.mx/inicia-el-festival-de-las-juventudes-2026-en-jalpan-de-serra/
//  - 16 años Pueblo Mágico .... adn40.mx (14/10/2026)
//  - Festival de la Huasteca .. queretaro.travel/eventos/28th-huasteca-festival-2025/
//  - Fiesta de Santiago ....... plazadearmas.com.mx/alistan-festival-de-santiago-en-jalpan-de-serra
require('dotenv').config();
const mongoose = require('mongoose');
const Noticia = require('../models/Noticia');

const img = (archivo) => ({ url: `/images/jalpan/${archivo}`, public_id: `local:jalpan/${archivo}` });

const noticias = [
    {
        fecha: '2026-10-16',
        imagen: img('kiosco-mision-960.webp'),
        titulo: {
            es: 'Jalpan celebró 16 años como Pueblo Mágico',
            en: 'Jalpan celebrated 16 years as a Pueblo Mágico',
            fr: 'Jalpan a fêté ses 16 ans de Pueblo Mágico'
        },
        descripcion: {
            es: 'Del 16 al 18 de octubre el Jardín Principal fue sede del aniversario como Pueblo Mágico. Hubo corredor gastronómico y artesanal, danza folclórica y huapango con el trío Sierra Genuina, cabalgata, los Voladores de Palo de Tamaletom y, el domingo, la Carrera Trail Jalpan Mágico con recorridos de 13, 26 y 38 km.',
            en: 'From October 16 to 18 the main square hosted the Pueblo Mágico anniversary: a food and crafts corridor, folk dance, huapango by the trio Sierra Genuina, a horseback parade, the Voladores de Palo of Tamaletom and, on Sunday, the Jalpan Mágico trail race with 13, 26 and 38 km routes.',
            fr: 'Du 16 au 18 octobre, le jardin principal a accueilli l’anniversaire de Pueblo Mágico : allée gastronomique et artisanale, danse folklorique, huapango avec le trio Sierra Genuina, cavalcade, les Voladores de Tamaletom et, le dimanche, le trail Jalpan Mágico de 13, 26 et 38 km.'
        }
    },
    {
        fecha: '2026-09-10',
        imagen: img('plaza-arboles-960.webp'),
        titulo: {
            es: 'Arrancó el Festival de las Juventudes 2026',
            en: 'The 2026 Youth Festival kicked off',
            fr: 'Coup d’envoi du Festival de la jeunesse 2026'
        },
        descripcion: {
            es: 'El 10 de septiembre el Ayuntamiento inauguró una semana de encuentros culturales, deportivos y educativos para jóvenes. La primera jornada abrió la galería fotográfica «Constelación Joven» y la conferencia «Semillas de vida: estrategias para la prevención».',
            en: 'On September 10 the town council opened a week of cultural, sports and educational meetings for young people. The first day opened the photo gallery “Constelación Joven” and the talk “Semillas de vida: estrategias para la prevención”.',
            fr: 'Le 10 septembre, la mairie a inauguré une semaine de rencontres culturelles, sportives et éducatives pour les jeunes. La première journée a ouvert la galerie photo « Constelación Joven » et la conférence « Semillas de vida ».'
        }
    },
    {
        fecha: '2026-07-25',
        imagen: img('mision-atardecer-960.webp'),
        titulo: {
            es: 'Fiesta patronal de Santiago Apóstol',
            en: 'Feast of Saint James the Apostle',
            fr: 'Fête patronale de saint Jacques'
        },
        descripcion: {
            es: 'Cada 25 de julio Jalpan celebra a su santo patrono, Santiago Apóstol, que da nombre a la misión franciscana. El día empieza con las mañanitas al santo, y en torno a la fecha el Museo Histórico de la Sierra Gorda organiza el Festival de Santiago con teatro, talleres y música de sones y huapango.',
            en: 'Every July 25 Jalpan honors its patron, Saint James the Apostle, who gives the Franciscan mission its name. The day starts with the mañanitas to the saint, and around the date the Sierra Gorda History Museum holds the Santiago Festival with theater, workshops and son and huapango music.',
            fr: 'Chaque 25 juillet, Jalpan fête son patron, saint Jacques, qui donne son nom à la mission franciscaine. La journée commence par les mañanitas au saint et, autour de cette date, le Musée historique de la Sierra Gorda organise le Festival de Santiago : théâtre, ateliers, son et huapango.'
        }
    },
    {
        fecha: '2026-04-19',
        imagen: img('vista-aerea-960.webp'),
        titulo: {
            es: 'Arrancó la Feria Jalpan 2026',
            en: 'Feria Jalpan 2026 got under way',
            fr: 'Ouverture de la Feria Jalpan 2026'
        },
        descripcion: {
            es: 'La noche del 19 de abril se inauguró la feria anual del municipio con la coronación de la reina Salma y la princesa Keila. La velada siguió con el grupo de danza Xalli-Pan y cerró con La Firma.',
            en: 'On the night of April 19 the town’s annual fair opened with the crowning of queen Salma and princess Keila. The evening went on with the Xalli-Pan dance group and closed with La Firma.',
            fr: 'Le soir du 19 avril, la foire annuelle de la commune a ouvert avec le couronnement de la reine Salma et de la princesse Keila. La soirée s’est poursuivie avec le groupe de danse Xalli-Pan et s’est terminée avec La Firma.'
        }
    },
    {
        fecha: '2025-10-16',
        imagen: img('mision-noche-960.webp'),
        titulo: {
            es: 'Festival de la Huasteca: «Cuerpos de maíz»',
            en: 'Huasteca Festival: “Bodies of Corn”',
            fr: 'Festival de la Huasteca : « Corps de maïs »'
        },
        descripcion: {
            es: 'Del 16 al 19 de octubre de 2025 Jalpan recibió la edición 28 del Festival de la Huasteca, dedicada al maíz. Más de 400 artistas y portadores de tradición llenaron la plaza principal con danzas agrícolas, huapangueros y rituales ligados al maíz.',
            en: 'From October 16 to 19, 2025 Jalpan hosted the 28th Huasteca Festival, devoted to corn. More than 400 artists and tradition bearers filled the main square with farming dances, huapango musicians and corn rituals.',
            fr: 'Du 16 au 19 octobre 2025, Jalpan a accueilli la 28e édition du Festival de la Huasteca, consacrée au maïs. Plus de 400 artistes et porteurs de tradition ont animé la place principale : danses agricoles, huapangueros et rituels du maïs.'
        }
    }
];

(async () => {
    if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI en el .env');
    await mongoose.connect(process.env.MONGODB_URI);
    for (const n of noticias) {
        const r = await Noticia.findOneAndUpdate(
            { 'titulo.es': n.titulo.es },
            { $set: { ...n, fecha: new Date(n.fecha + 'T12:00:00Z'), activo: true } },
            { upsert: true, new: true, includeResultMetadata: true }
        );
        console.log(r.lastErrorObject && r.lastErrorObject.updatedExisting ? 'actualizada' : 'creada', '·', n.fecha, '·', n.titulo.es);
    }
    await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
