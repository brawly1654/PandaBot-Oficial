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

// 🔥 SISTEMA BOSS GLOBAL - Función para inicializar boss automático
export function iniciarSistemaBossAutomatico(data) {
  if (!data) return;

  // Inicializar estructura del boss si no existe
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

  // Verificar y crear boss automático cada 24h
  const ahora = Date.now();
  const ultimoBoss = data.ultimoBossTimestamp || 0;

  // Si no hay boss activo y han pasado 24 horas desde el último
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

    return true; // Indica que se creó un nuevo boss
  }

  return false;
}

// 🔥 SISTEMA ECONÓMICO COMPLETO
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
      impuestos: 0.10, // 10% de impuesto en transacciones
      inflacion: 1.0, // Multiplicador de precios
      ultimaActualizacion: Date.now()
    };
    logEvento('💰 Sistema económico inicializado');
  }
  
  // Inicializar estructura de usuarios si no existe
  if (!data.users) data.users = {};
}

// 🔥 FUNCIÓN PARA INICIALIZAR USUARIO
export function inicializarUsuario(userId, data) {
  if (!data.users[userId]) {
    data.users[userId] = {
      // Datos básicos
      nombre: `Usuario_${userId.split('@')[0]}`,
      registrado: new Date().toISOString(),
      
      // Economía
      pandacoins: 1000, // Dinero inicial
      exp: 0,
      nivel: 1,
      
      // Inventario organizado
      inventario: {
        // RECURSOS (para crafting y venta)
        recursos: {
          pescado: 0,
          carne: 0,
          madera: 0,
          oro: 0,
          diamantes: 0,
          piedras: 0,
          comida: 10, // Comida inicial
          hierro: 0,
          carbon: 0,
          cuero: 0,
          tela: 0,
          plata: 0,
          esmeraldas: 0,
          rubies: 0
        },
        
        // HERRAMIENTAS (mejoran la eficiencia)
        herramientas: {
          pico: 0,
          hacha: 0,
          caña: 0,
          arco: 0,
          espada: 0,
          armadura: 0
        },
        
        // ESPECIALES (para misiones y eventos)
        especiales: {
          pocion: 3, // Pociones iniciales
          llave: 1,  // Llave inicial
          gema: 0,
          pergamino: 0
        },
        
        // MASCOTAS
        mascotas: {
          comida_basica: 5,
          comida_premium: 0,
          juguetes: 2
        }
      },
      
      // Estadísticas
      stats: {
        pescas: 0,
        cazas: 0,
        minas: 0,
        ventas: 0,
        compras: 0,
        boss_danio: 0,
        misiones_completadas: 0
      },
      
      // Misiones activas
      misiones_activas: {},
      
      // Logros
      logros: []
    };
    logEvento(`👤 Usuario ${userId} inicializado`);
    return true;
  }
  return false;
}

export function cargarDatabase() {
  if (!fs.existsSync(dbFile)) {
    // Crear base de datos inicial
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
    
    // 🔥 Inicializar sistemas
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

// 🔥 Función auxiliar para crear boss manualmente (para admins)
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

// 🔥 Función para obtener estadísticas del boss
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

// 🔥 FUNCIONES ECONÓMICAS NUEVAS

// Obtener precio de un recurso
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

// Remover recurso de usuario
export function removerRecurso(data, userId, recurso, cantidad) {
  if (!data.users[userId] || !data.users[userId].inventario?.recursos) return false;
  
  const actual = data.users[userId].inventario.recursos[recurso] || 0;
  if (actual < cantidad) return false;
  
  data.users[userId].inventario.recursos[recurso] = actual - cantidad;
  return true;
}

// Obtener inventario de usuario
export function obtenerInventarioUsuario(data, userId) {
  if (!data.users[userId]) return null;
  
  return {
    recursos: data.users[userId].inventario?.recursos || {},
    herramientas: data.users[userId].inventario?.herramientas || {},
    especiales: data.users[userId].inventario?.especiales || {},
    mascotas: data.users[userId].inventario?.mascotas || {}
  };
}
