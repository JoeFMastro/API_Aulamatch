'use strict';

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno del test para que funcione cuando se corre directamente
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test') });

async function runSetup() {
  const testDbName = process.env.DB_NAME || 'aulamatch_test';
  
  if (!process.env.DATABASE_URL) {
    console.error('[dbSetup] ERROR: DATABASE_URL no está definida en el entorno.');
    process.exit(1);
  }

  // 1. Conectar a la base de datos 'postgres' por defecto
  let defaultUrl;
  try {
    const parsed = new URL(process.env.DATABASE_URL);
    parsed.pathname = '/postgres';
    defaultUrl = parsed.toString();
  } catch (err) {
    console.error('[dbSetup] ERROR: DATABASE_URL inválida.', err.message);
    process.exit(1);
  }

  console.log(`[dbSetup] Conectando a la base de datos por defecto para verificar si existe '${testDbName}'...`);
  const client = new Client({ connectionString: defaultUrl });
  
  try {
    await client.connect();
    
    // Verificar si existe la base de datos de test
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [testDbName]);
    if (res.rows.length === 0) {
      console.log(`[dbSetup] La base de datos '${testDbName}' no existe. Creándola...`);
      // CREATE DATABASE no se puede ejecutar en bloques transaccionales y requiere ejecutar fuera de $1
      await client.query(`CREATE DATABASE ${testDbName}`);
      console.log(`[dbSetup] Base de datos '${testDbName}' creada con éxito.`);
    } else {
      console.log(`[dbSetup] La base de datos '${testDbName}' ya existe.`);
    }
  } catch (err) {
    console.error('[dbSetup] ERROR durante la verificación/creación de la base de datos:', err.message);
    console.error('[dbSetup] Por favor, asegúrate de que el contenedor de PostgreSQL esté corriendo.');
    process.exit(1);
  } finally {
    await client.end();
  }

  // 2. Conectar a la base de datos de test y correr las migraciones
  console.log(`[dbSetup] Conectando a '${testDbName}' para aplicar el esquema...`);
  const testClient = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await testClient.connect();
    
    const sqlDir = path.resolve(__dirname, '../sql');
    const files = [
      '01_schema.sql',
      '02_usuarios.sql',
      '03_notificaciones.sql'
    ];

    for (const file of files) {
      const filePath = path.join(sqlDir, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Archivo de migración no encontrado: ${filePath}`);
      }
      console.log(`[dbSetup] Ejecutando script: ${file}...`);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Ejecutar el script SQL completo
      await testClient.query(sql);
    }
    
    console.log('[dbSetup] Base de datos de test inicializada y migraciones aplicadas correctamente.');
  } catch (err) {
    console.error('[dbSetup] ERROR al aplicar el esquema en la base de datos de test:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await testClient.end();
  }
}

if (require.main === module) {
  runSetup();
}

module.exports = runSetup;
