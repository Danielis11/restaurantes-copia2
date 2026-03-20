require('dotenv').config();
const mongoose = require('mongoose');
const Guia = require('./models/Guia');

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jalpan-turismo';

const guiasData = [
  { nombreCompleto: "OSIRIS OLVERA OLVERA", credencialSECTUR: "L002917", autorizacionCONANP: "F00.6.DRCEN/1531/2024", rnt: "31220090014", telefono: "4411033129", estado: "activo" },
  { nombreCompleto: "ALFONSO MORADO MARTÍNEZ", credencialSECTUR: "E003709", autorizacionCONANP: "F00.6.DRCEN/1180/2024", rnt: "31226090010", telefono: "4422836467", estado: "activo" },
  { nombreCompleto: "GRISELDA HURTADO SÁNCHEZ", credencialSECTUR: "E003780", autorizacionCONANP: "F00.6.DRCEN/0910/2023", rnt: "31220095d8cd3", telefono: "4412129319", estado: "activo" },
  { nombreCompleto: "JUANA HURTADO SÁNCHEZ", credencialSECTUR: "E003792", autorizacionCONANP: "F00.6.DRCEN/1435/2024", rnt: "31220090012", telefono: "4411011444", estado: "activo" },
  { nombreCompleto: "VICTORIA VALDELAMAR PEÑA", credencialSECTUR: "E004810", autorizacionCONANP: "F00.6.DRCEN/1412/2024", rnt: "31220090003", telefono: "4411056704", estado: "activo" },
  { nombreCompleto: "JOSÉ LUIS REYNOSO GÓMEZ", credencialSECTUR: "E003842", autorizacionCONANP: "F00.6.DRCEN/1637/2023", rnt: "31220090013", telefono: "4411050062", estado: "activo" },
  { nombreCompleto: "LEVI EDUARDO TREJO RUBIO", credencialSECTUR: "E004097", autorizacionCONANP: "F00.6.DRCEN/1656/2023", rnt: "3122009c759fa", telefono: "4421872660", estado: "activo" },
  { nombreCompleto: "FRANCISCO JAVIER GARAY GARCÍA", credencialSECTUR: "E003595", autorizacionCONANP: "EN PROCESO 2025", rnt: "31220090008", telefono: "4411162433", estado: "activo" },
  { nombreCompleto: "JESÚS CASTILLO RÍOS", credencialSECTUR: "E003400", autorizacionCONANP: "F00.6.DRCEN/1665/2023N", rnt: "31220090015", telefono: "7204737657", estado: "activo" },
  { nombreCompleto: "HUGO CÉSAR RUBIO LUGO", credencialSECTUR: "E003962", autorizacionCONANP: "F00.6.DRCEN/1531/2024", rnt: "3122010ce3e6b", telefono: "4411188636", estado: "activo" },
  { nombreCompleto: "MARCELO BENÍTEZ TREJO", credencialSECTUR: "E003701", autorizacionCONANP: "-----", rnt: "31220090007", telefono: "4411079201", estado: "activo" },
  { nombreCompleto: "JUAN MANUEL GARCÍA YÁÑEZ", credencialSECTUR: "E003795", autorizacionCONANP: "-----", rnt: "31220090005", telefono: "4411223243", estado: "activo" },
  { nombreCompleto: "BRENDA KARINA SÁNCHEZ TORRES", credencialSECTUR: "E005304", autorizacionCONANP: "-----", rnt: "3122003fa35f1", telefono: "4871135879", estado: "activo" },
  { nombreCompleto: "MA DE LA CRUZ BARRERA BALDERAS", credencialSECTUR: "E004978", autorizacionCONANP: "-----", rnt: "31220091968ca", telefono: "4411176262", estado: "activo" },
  { nombreCompleto: "TANIA GUADALUPE REYES TREJO", credencialSECTUR: "E005193", autorizacionCONANP: "-----", rnt: "3122003f1e0ee", telefono: "4871479033", estado: "activo" },
  { nombreCompleto: "REYNA PATRICIA MÁRQUEZ CHÁVEZ", credencialSECTUR: "E004141", autorizacionCONANP: "F00.6.DRCEN/1412/2024", rnt: "31220100003", telefono: "4411096540", estado: "activo" },
  { nombreCompleto: "MARCELA LÓPEZ SERVÍN", credencialSECTUR: "E001715", autorizacionCONANP: "F00.6.DRCEN/1434/2024", rnt: "31220090004", telefono: "4411079959", estado: "activo" },
  { nombreCompleto: "TORIBIO RUBIO HERNÁNDEZ", credencialSECTUR: "E001711", autorizacionCONANP: "F00.6.DRCEN/1665/2023N", rnt: "31220099dec54", telefono: "4411515548", estado: "activo" },
  { nombreCompleto: "ROBERTO ESTRADA MÁRQUEZ", credencialSECTUR: "E001531", autorizacionCONANP: "F00.6.DRCEN/1434/2024", rnt: "31220101d0a67", telefono: "4411151022", estado: "activo" },
  { nombreCompleto: "NORBERTO DE JESÚS ESTRADA MÁRQUEZ", credencialSECTUR: "E001528", autorizacionCONANP: "F00.6.DRCEN/1434/2024", rnt: "3122010001", telefono: "4411010099", estado: "activo" },
  { nombreCompleto: "ANA ISCELA ORDUÑA SÁNCHEZ", credencialSECTUR: "E001719", autorizacionCONANP: "-----", rnt: "-----", telefono: "4411175086", estado: "activo" }
];

async function seedGuias() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Remove existing guides if necessary? Let's not remove them just in case, unless they already exist.
    // Instead, we will upsert using credencialSECTUR.

    for (const guiaData of guiasData) {
      if (guiaData.autorizacionCONANP === '-----') {
        guiaData.autorizacionCONANP = 'N/A';
      }
      if (guiaData.rnt === '-----') {
        guiaData.rnt = 'N/A';
      }
      
      const existingGuia = await Guia.findOne({ credencialSECTUR: guiaData.credencialSECTUR });
      if (existingGuia) {
        console.log(`Guide ${guiaData.nombreCompleto} already exists. Updating...`);
        await Guia.updateOne({ credencialSECTUR: guiaData.credencialSECTUR }, guiaData);
      } else {
        console.log(`Creating guide ${guiaData.nombreCompleto}...`);
        const guia = new Guia(guiaData);
        await guia.save();
      }
    }

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Error seeding guides:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

seedGuias();
