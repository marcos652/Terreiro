/**
 * Define custom claim role=MASTER para um usuário específico.
 * Pré-requisitos:
 *  - Ter o arquivo serviceAccountKey.json na raiz do projeto (mesma pasta deste script).
 *  - Ter instalado firebase-admin (npm install firebase-admin).
 */
const admin = require('firebase-admin');
const path = require('path');

// UID que você forneceu
const MASTER_UID = 'rpdLNx3X4CZhFvB6O9bvXbFA72y1';

// Caminho da service account
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
});

async function main() {
  await admin.auth().setCustomUserClaims(MASTER_UID, { role: 'MASTER' });
  console.log('Claim MASTER aplicada para UID:', MASTER_UID);
  process.exit(0);
}

main().catch((err) => {
  console.error('Falhou ao aplicar claim:', err);
  process.exit(1);
});
