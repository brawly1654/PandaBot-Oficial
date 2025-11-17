import chalk from 'chalk';
import { cargarDatabase, guardarDatabase } from './data/database.js';
import { DateTime } from 'luxon';
import fs from 'fs';
import path from 'path';
import { prefix, ownerNumber } from './config.js';

// ============================================
// SISTEMA DE CARGA AUTOMÁTICA DE PLUGINS
// ============================================
const pluginsMap = new Map();
const aliasMap = new Map();

async function loadPlugins() {
  console.log(chalk.yellow('📦 Cargando plugins...'));
  const pluginsPath = path.join(process.cwd(), 'plugins');
  const files = fs.readdirSync(pluginsPath).filter(f => f.endsWith('.js'));
  
  let loaded = 0;
  for (const file of files) {
    try {
      const plugin = await import(`./plugins/${file}`);
      
      // Registrar comando principal
      if (plugin.command) {
        pluginsMap.set(plugin.command.toLowerCase(), plugin);
        loaded++;
        
        // Registrar aliases si existen
        if (plugin.aliases && Array.isArray(plugin.aliases)) {
          for (const alias of plugin.aliases) {
            aliasMap.set(alias.toLowerCase(), plugin.command.toLowerCase());
          }
        }
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error cargando ${file}:`), error.message);
    }
  }
  
  console.log(chalk.green(`✅ ${loaded} plugins cargados correctamente`));
  console.log(chalk.cyan(`📝 ${aliasMap.size} aliases registrados`));
}

// Cargar plugins al inicio
await loadPlugins();

// ============================================
// CACHE DE ARCHIVOS (evita lecturas repetidas)
// ============================================
let configCache = null;
let configLastModified = 0;
let blockedWordsCache = {};
let blockedWordsLastCheck = 0;
let afkCache = {};
let afkLastCheck = 0;
let muteadosCache = {};
let muteadosLastCheck = 0;

function getConfig() {
  const configPath = './config.json';
  const stats = fs.statSync(configPath);
  
  if (!configCache || stats.mtimeMs > configLastModified) {
    configCache = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    configLastModified = stats.mtimeMs;
  }
  
  return configCache;
}

function getBlockedWords() {
  const now = Date.now();
  const blockedWordsPath = path.resolve('./data/blockedWords.json');
  
  if (!fs.existsSync(blockedWordsPath)) return {};
  
  // Actualizar cache cada 5 segundos
  if (now - blockedWordsLastCheck > 5000) {
    blockedWordsCache = JSON.parse(fs.readFileSync(blockedWordsPath, 'utf8'));
    blockedWordsLastCheck = now;
  }
  
  return blockedWordsCache;
}

function getAfkData() {
  const now = Date.now();
  const afkFile = './data/afk.json';
  
  if (!fs.existsSync(afkFile)) return {};
  
  if (now - afkLastCheck > 3000) {
    afkCache = JSON.parse(fs.readFileSync(afkFile, 'utf8'));
    afkLastCheck = now;
  }
  
  return afkCache;
}

function getMuteados() {
  const now = Date.now();
  const muteadosFile = './data/muteados.json';
  
  if (!fs.existsSync(muteadosFile)) {
    fs.writeFileSync(muteadosFile, '{}');
    return {};
  }
  
  if (now - muteadosLastCheck > 3000) {
    muteadosCache = JSON.parse(fs.readFileSync(muteadosFile, 'utf8'));
    muteadosLastCheck = now;
  }
  
  return muteadosCache;
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================
function normalizeNumber(raw) {
  return raw.split('@')[0].replace(/[^\d+]/g, '');
}

// ============================================
// HANDLER PRINCIPAL
// ============================================
export async function handleMessage(sock, msg) {
  try {
    // Extraer información básica
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
    if (!body) return;
    
    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const sender = msg.key.participant || msg.key.remoteJid;
    const senderNumber = normalizeNumber(sender);
    
    // ============================================
    // VALIDACIÓN TEMPRANA (early returns)
    // ============================================
    
    // 1. Ignorar mensajes propios
    if (msg.key.fromMe) return;
    
    // 2. Cargar database
    const db = cargarDatabase();
    db.bannedUsers = db.bannedUsers || [];
    
    // 3. Verificar ban
    if (db.bannedUsers.includes(sender)) {
      console.log(chalk.red(`🚫 Usuario baneado: ${sender}`));
      return;
    }
    
    // 4. Verificar muteo
    if (isGroup) {
      const muteados = getMuteados();
      if (muteados[from]?.includes(sender)) {
        console.log(chalk.yellow(`🔇 Mensaje eliminado por muteo: ${sender}`));
        await sock.sendMessage(from, { delete: msg.key });
        return;
      }
    }
    
    // 5. Verificar palabras bloqueadas
    const blockedWords = getBlockedWords();
    if (blockedWords[from] && blockedWords[from].length > 0) {
      const texto = body.toLowerCase();
      const contiene = blockedWords[from].some(word => texto.includes(word));
      if (contiene) {
        await sock.sendMessage(from, { delete: msg.key });
        return;
      }
    }
    
    // 6. Verificar menciones AFK
    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
      const afkData = getAfkData();
      const mentioned = msg.message.extendedTextMessage.contextInfo.mentionedJid;
      
      for (const mentionedId of mentioned) {
        const cleanId = mentionedId.split('@')[0];
        if (afkData[cleanId]) {
          await sock.sendMessage(from, { delete: msg.key });
          await sock.sendMessage(from, {
            text: `🚫 No molestes al usuario, está AFK: *${afkData[cleanId].reason}*`,
            mentions: [mentionedId]
          });
          break;
        }
      }
    }
    
    // ============================================
    // VERIFICAR SI ES OWNER
    // ============================================
    const isOwner = ownerNumber.includes(`+${senderNumber}`);
    
    // ============================================
    // MODO OWNER / GRUPOS / PRIVADOS
    // ============================================
    const config = getConfig();
    config.global = config.global || { modoowner: false, grupos: true, chatsprivados: true, ownerNumber };
    
    if (config.global.modoowner && !isOwner) return;
    if (isGroup && !config.global.grupos) return;
    if (!isGroup && !config.global.chatsprivados) return;
    
    // ============================================
    // ANTILINK (solo en grupos)
    // ============================================
    if (isGroup && config.groups?.[from]?.antilink) {
      if (/(https?:\/\/[^\s]+)/i.test(body)) {
        try {
          const metadata = await sock.groupMetadata(from);
          const isAdmin = metadata.participants.some(p =>
            p.id.startsWith(senderNumber) && (p.admin === 'admin' || p.admin === 'superadmin')
          );
          
          if (!isOwner && !isAdmin) {
            await sock.sendMessage(from, { delete: msg.key });
            await sock.groupParticipantsUpdate(from, [sender], 'remove');
            await sock.sendMessage(from, { 
              text: `🚫 Usuario @${senderNumber} eliminado por enviar link.`,
              mentions: [sender]
            });
          }
        } catch (e) {
          console.error(chalk.red('❌ Error en antilink:'), e.message);
        }
      }
    }
    
    // ============================================
    // SISTEMA DE CUMPLEAÑOS
    // ============================================
    const user = db.users[sender];
    if (user?.birthday) {
      const [day, month] = user.birthday.split('/').map(Number);
      const today = DateTime.now().setZone('America/Santiago');
      
      if (today.day === day && today.month === month && user.birthdayMessageSent !== today.year) {
        await sock.sendMessage(from, {
          react: { text: '🎉', key: msg.key }
        });
        
        await sock.sendMessage(from, {
          text: `🎂 ¡Feliz cumpleaños, @${senderNumber}! Gracias por formar parte de esta familia.`,
          mentions: [sender]
        });
        
        user.birthdayMessageSent = today.year;
        guardarDatabase(db);
      }
    }
    
    // ============================================
    // LOGGING DE MENSAJES
    // ============================================
    const groupName = isGroup ? (await sock.groupMetadata(from)).subject : 'Chat Privado';
    const senderName = msg.pushName || senderNumber;
    const isCommand = body.startsWith(prefix);
    
    if (isCommand) {
      console.log(chalk.gray('=============================='));
      console.log(`🤖 ${chalk.bold.yellow('Comando Recibido:')}`);
      console.log(`- ${chalk.white('Usuario:')} ${chalk.cyan(senderName)}`);
      console.log(`- ${chalk.white('Número:')} +${senderNumber}`);
      console.log(`- ${chalk.white('Grupo:')} ${chalk.green(groupName)}`);
      console.log(`- ${chalk.white('Comando:')} ${chalk.yellow(body)}`);
      console.log(chalk.gray('=============================='));
    } else {
      console.log(chalk.gray('=============================='));
      console.log(`💬 ${chalk.bold.blue('Mensaje de Texto:')}`);
      console.log(`- ${chalk.white('Usuario:')} ${chalk.cyan(senderName)}`);
      console.log(`- ${chalk.white('Grupo:')} ${chalk.green(groupName)}`);
      console.log(`- ${chalk.white('Mensaje:')} ${chalk.white(body.substring(0, 50))}...`);
      console.log(chalk.gray('=============================='));
    }
    
    // ============================================
    // PROCESAMIENTO DE COMANDOS
    // ============================================
    if (!isCommand) return;
    
    const args = body.slice(prefix.length).trim().split(/\s+/);
    const cmdName = args.shift().toLowerCase();
    
    // Buscar comando (incluyendo aliases)
    let plugin = pluginsMap.get(cmdName);
    
    // Si no se encuentra, buscar en aliases
    if (!plugin) {
      const mainCommand = aliasMap.get(cmdName);
      if (mainCommand) {
        plugin = pluginsMap.get(mainCommand);
      }
    }
    
    // Ejecutar plugin
    if (plugin) {
      try {
        await plugin.run(sock, msg, args);
      } catch (error) {
        console.error(chalk.red('❌ Error ejecutando comando:'), error);
        await sock.sendMessage(from, { 
          text: `⚠️ Error ejecutando el comando. Por favor, inténtalo de nuevo.` 
        });
      }
    } else {
      // Comando no encontrado
      console.log(chalk.yellow(`⚠️ Comando no encontrado: ${cmdName}`));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error en handleMessage:'), error);
  }
}

// ============================================
// FUNCIÓN PARA RECARGAR PLUGINS (útil para desarrollo)
// ============================================
export async function reloadPlugins() {
  pluginsMap.clear();
  aliasMap.clear();
  await loadPlugins();
  console.log(chalk.green('✅ Plugins recargados'));
}
