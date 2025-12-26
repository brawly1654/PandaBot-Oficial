// data/database.js
import fs from 'fs';
import { enviarAlerta } from '../utils/alertaGrupo.js';
import { createDatabaseBackup } from '../tools/createBackup.js';

const dbFile = './data/database.json';
const logFile = './logs/db.log';
const MAX_SAVES_WITHOUT_BACKUP = 25;

function logEvento(texto) {
  const timestamp = new Date().toISOString();
  fs.mkdirSync('./logs', { recursive: true });
  fs.appendFileSync(logFile, `[${timestamp}] ${texto}\n`);
}

function ensureMeta(data) {
  if (!data || typeof data !== 'object') return;
  data._meta = data._meta || {};
  if (typeof data._meta.savesWithoutBackup !== 'number') {
    data._meta.savesWithoutBackup = 0;
  }
}

export function iniciarSistemaBossAutomatico(data) {
  if (!data) return;

  if (!data.bossGlobal) {
    data.bossGlobal = {
      activo: false,
      nombre: "",
      vidaActual: 0,
      vidaMaxima: 0,
      recompensaBase: 0,
      fechaInicio: null,
      ataquesRecibidos: 0,
      ataquesNecesarios: 0,
      derrotado: false,
      historicoAtaques: {}
    };
    logEvento('🐉 Sistema boss global inicializado');
  }

  const ahora = Date.now();
  const ultimoBoss = data.ultimoBossTimestamp || 0;

  if ((!data.bossGlobal.activo || data.bossGlobal.derrotado) &&
      (ahora - ultimoBoss >= 24 * 60 * 60 * 1000)) {

    const nombresBoss = [
      "Dragón Infernal", "Titan de Hielo", "Golem Ancestral",
      "Serpiente Marina", "Fénix Renacido", "Ciclope Gigante",
      "Kraken Abisal", "Minotauro Legendario", "Hidra Venenosa",
      "Dragón Diario", "Guardián Nocturno", "Bestia Celestial"
    ];

    const bossElegido = nombresBoss[Math.floor(Math.random() * nombresBoss.length)];
    const vidaBase = 500;
    const ataquesNecesarios = 50;
    const recompensaBase = 2000;

    data.bossGlobal = {
      activo: true,
      nombre: bossElegido,
      vidaActual: vidaBase,
      vidaMaxima: vidaBase,
      recompensaBase: recompensaBase,
      fechaInicio: ahora,
      ataquesRecibidos: 0,
      ataquesNecesarios: ataquesNecesarios,
      derrotado: false,
      historicoAtaques: {}
    };

    data.ultimoBossTimestamp = ahora;
    logEvento(`🐉 Nuevo boss automático creado: ${bossElegido}`);

    return true;
  }

  return false;
}

export function inicializarSistemaEconomico(data) {
  if (!data) return;
  
  if (!data.economia) {
    data.economia = {
      precios: {
        recursos: {
          pescado: 50,
          carne: 70,
          madera: 30,
          oro: 100,
          diamantes: 500,
          piedras: 10,
          comida: 20,
          hierro: 80,
          carbon: 40,
          cuero: 60,
          tela: 45,
          plata: 150,
          esmeraldas: 800,
          rubies: 1000
        },
        herramientas: {
          pico: 500,
          hacha: 300,
          caña: 200,
          arco: 800,
          espada: 1200,
          armadura: 1500
        },
        especiales: {
          pocion: 300,
          llave: 1000,
          gema: 500,
          pergamino: 2000
        }
      },
      impuestos: 0.10,
      inflacion: 1.0,
      ultimaActualizacion: Date.now()
    };
    logEvento('💰 Sistema económico inicializado');
  }
  
  if (!data.users) data.users = {};
}

export function inicializarUsuario(userId, data) {
  if (!data.users[userId]) {
    data.users[userId] = {
      nombre: `Usuario_${userId.split('@')[0]}`,
      registrado: new Date().toISOString(),
      
      pandacoins: 1000,
      exp: 0,
      nivel: 1,
      
      inventario: {
        recursos: {
          pescado: 0,
          carne: 0,
          madera: 0,
          oro: 0,
          diamantes: 0,
          piedras: 0,
          comida: 10,
          hierro: 0,
          carbon: 0,
          cuero: 0,
          tela: 0,
          plata: 0,
          esmeraldas: 0,
          rubies: 0
        },
        
        herramientas: {
          pico: 0,
          hacha: 0,
          caña: 0,
          arco: 0,
          espada: 0,
          armadura: 0
        },
        
        especiales: {
          pocion: 3,
          llave: 1,
          gema: 0,
          pergamino: 0
        },
        
        mascotas: {
          comida_basica: 5,
          comida_premium: 0,
          juguetes: 2
        }
      },
      
      stats: {
        pescas: 0,
        cazas: 0,
        minas: 0,
        ventas: 0,
        compras: 0,
        boss_danio: 0,
        misiones_completadas: 0
      },
      
      misiones_activas: {},
      
      logros: []
    };
    logEvento(`👤 Usuario ${userId} inicializado`);
    return true;
  }
  return false;
}

export function cargarDatabase() {
  if (!fs.existsSync(dbFile)) {
    const initialData = {
      users: {},
      clanes: {},
      economia: null,
      bossGlobal: null,
      _meta: {
        version: "2.0",
        savesWithoutBackup: 0,
        creado: new Date().toISOString()
      }
    };
    
    fs.writeFileSync(dbFile, JSON.stringify(initialData, null, 2));
    logEvento('📁 Base de datos creada desde cero');
  }

  try {
    const data = JSON.parse(fs.readFileSync(dbFile));
    ensureMeta(data);
    
    inicializarSistemaEconomico(data);
    iniciarSistemaBossAutomatico(data);
    
    logEvento('✅ Base de datos cargada correctamente.');
    return data;
  } catch (err) {
    logEvento(`❌ Error al leer la base: ${err.message}`);
    return null;
  }
}

export function guardarDatabase(data, sock = null) {
  if (!data || typeof data !== 'object') {
    logEvento('❌ Intento de guardar base inválida (no es un objeto).');
    return;
  }

  ensureMeta(data);

  let savesWithoutBackup = data._meta.savesWithoutBackup ?? 0;
  savesWithoutBackup += 1;

  let backupInfo = null;

  if (savesWithoutBackup >= MAX_SAVES_WITHOUT_BACKUP) {
    try {
      backupInfo = createDatabaseBackup({
        filenameFormatter: (timestamp) => `backup(${timestamp}).json`,
        filenamePrefix: 'backup',
        maxBackups: 10
      });
      logEvento(`📦 Backup creado: ${backupInfo.backupPath}`);
      savesWithoutBackup = 0;
    } catch (err) {
      logEvento(`⚠️ No se pudo crear el backup automático: ${err.message}`);
    }
  }

  data._meta.savesWithoutBackup = savesWithoutBackup;

  try {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
    logEvento('💾 Base de datos guardada correctamente.');

    if (sock) {
      const backupDato = backupInfo?.fileName || 'sin información';
      const alertMessage = backupInfo
        ? `⚠️ *La base de datos fue modificada.*\nBackup creado: ${backupDato}`
        : '⚠️ *La base de datos fue modificada.*\nNo se pudo crear el backup automático.';
      enviarAlerta(sock, alertMessage);
    }
  } catch (err) {
    logEvento(`❌ Error al guardar la base: ${err.message}`);
  }
}

export function guardarPersonajes(personajes) {
  fs.writeFileSync('./data/personajes.json', JSON.stringify({ characters: personajes }, null, 2));
  logEvento('📁 Personajes guardados.');
}

export function crearBossManual(data, nombre, vida = 500, ataquesNecesarios = 50, recompensa = 2000) {
  if (!data) return false;

  data.bossGlobal = {
    activo: true,
    nombre: nombre,
    vidaActual: vida,
    vidaMaxima: vida,
    recompensaBase: recompensa,
    fechaInicio: Date.now(),
    ataquesRecibidos: 0,
    ataquesNecesarios: ataquesNecesarios,
    derrotado: false,
    historicoAtaques: {}
  };

  data.ultimoBossTimestamp = Date.now();
  logEvento(`🐉 Boss manual creado: ${nombre}`);

  return true;
}

export function obtenerEstadisticasBoss(data) {
  if (!data || !data.bossGlobal) {
    return null;
  }

  return {
    activo: data.bossGlobal.activo,
    nombre: data.bossGlobal.nombre,
    vidaActual: data.bossGlobal.vidaActual,
    vidaMaxima: data.bossGlobal.vidaMaxima,
    progreso: (data.bossGlobal.ataquesRecibidos / data.bossGlobal.ataquesNecesarios) * 100,
    ataquesRecibidos: data.bossGlobal.ataquesRecibidos,
    ataquesNecesarios: data.bossGlobal.ataquesNecesarios,
    recompensaBase: data.bossGlobal.recompensaBase,
    participantes: Object.keys(data.bossGlobal.historicoAtaques || {}).length,
    derrotado: data.bossGlobal.derrotado
  };
}

export function obtenerPrecioRecurso(data, recurso) {
  if (!data.economia || !data.economia.precios.recursos[recurso]) {
    return 0;
  }
  return Math.floor(data.economia.precios.recursos[recurso] * data.economia.inflacion);
}

// Agregar recurso a usuario
export function agregarRecurso(data, userId, recurso, cantidad) {
  if (!data.users[userId]) return false;
  
  if (!data.users[userId].inventario) {
    data.users[userId].inventario = { recursos: {} };
  }
  
  if (!data.users[userId].inventario.recursos) {
    data.users[userId].inventario.recursos = {};
  }
  
  const actual = data.users[userId].inventario.recursos[recurso] || 0;
  data.users[userId].inventario.recursos[recurso] = actual + cantidad;
  
  return true;
}

export function removerRecurso(data, userId, recurso, cantidad) {
  if (!data.users[userId] || !data.users[userId].inventario?.recursos) return false;
  
  const actual = data.users[userId].inventario.recursos[recurso] || 0;
  if (actual < cantidad) return false;
  
  data.users[userId].inventario.recursos[recurso] = actual - cantidad;
  return true;
}

export function obtenerInventarioUsuario(data, userId) {
  if (!data.users[userId]) return null;
  
  return {
    recursos: data.users[userId].inventario?.recursos || {},
    herramientas: data.users[userId].inventario?.herramientas || {},
    especiales: data.users[userId].inventario?.especiales || {},
    mascotas: data.users[userId].inventario?.mascotas || {}
  };
}

// Añade pandacoins a un usuario y reparte un porcentaje al/la cónyuge si existe
export function addPandacoins(data, userId, amount, options = {}) {
  if (!data) return null;
  if (!userId || typeof amount !== 'number' || amount <= 0) return null;

  const sharePercent = typeof options.sharePercent === 'number' ? options.sharePercent : 0.10; // 10% por defecto

  // Asegurar usuario
  inicializarUsuario(userId, data);

  const parejaId = data.users[userId].pareja || null;
  const spouseShare = parejaId ? Math.floor(amount * sharePercent) : 0;
  const userGain = amount - spouseShare;

  data.users[userId].pandacoins = (data.users[userId].pandacoins || 0) + userGain;

  if (spouseShare > 0) {
    // Asegurar pareja en la DB
    inicializarUsuario(parejaId, data);
    data.users[parejaId].pandacoins = (data.users[parejaId].pandacoins || 0) + spouseShare;
  }

  return {
    user: userId,
    userGain,
    spouse: parejaId,
    spouseShare
  };
}

// Establece pareja en la base de datos (ambos sentidos)
export function setParejaDB(data, userA, userB) {
  if (!data) return false;
  if (!userA || !userB) return false;
  inicializarUsuario(userA, data);
  inicializarUsuario(userB, data);
  data.users[userA].pareja = userB;
  data.users[userB].pareja = userA;
  return true;
}

// Elimina pareja en la base de datos (ambos sentidos)
export function clearParejaDB(data, userA) {
  if (!data) return false;
  if (!userA) return false;
  const pareja = data.users[userA]?.pareja;
  if (pareja && data.users[pareja]) {
    delete data.users[pareja].pareja;
  }
  if (data.users[userA]) delete data.users[userA].pareja;
  return true;
}
