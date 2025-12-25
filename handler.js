import chalk from 'chalk';
import { cargarDatabase } from './data/database.js';
import fs from 'fs';
import path from 'path';
import { prefix, ownerNumber } from './config.js';
import { trackCommand } from './middleware/trackAchievements.js';
import { desactivarAFKAutomatico } from './plugins/afk.js';



function isLink(text = '') {
  return /(?:https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me\/|\.(com|net|org|gg|xyz|cl|io|me|tv|site|link)\b)/i.test(text);
}

function normalizeNumber(raw) {
  return raw.split('@')[0].replace(/[^\d+]/g, '');
}

function extractMessageBody(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ''
  );
}



const cache = new Map();
const groupMetaCache = new Map();

function cacheGet(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.exp) {
    cache.delete(key);
    return null;
  }
  return item.val;
}

function cacheSet(key, val, ttl) {
  cache.set(key, { val, exp: Date.now() + ttl });
}

async function getGroupMetadata(sock, jid) {
  const cached = groupMetaCache.get(jid);
  if (cached && Date.now() - cached.time < 5000) return cached.data;

  const data = await sock.groupMetadata(jid);
  groupMetaCache.set(jid, { data, time: Date.now() });
  return data;
}

function getJSON(file, ttl = 3000) {
  const cached = cacheGet(file);
  if (cached) return cached;

  const data = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, 'utf8'))
    : {};

  cacheSet(file, data, ttl);
  return data;
}



const pluginsMap = new Map();
const aliasMap = new Map();

async function loadPlugins() {
  const pluginsPath = path.join(process.cwd(), 'plugins');
  const files = fs.readdirSync(pluginsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    try {
      const plugin = await import(`./plugins/${file}`);
      if (plugin.command) {
        pluginsMap.set(plugin.command.toLowerCase(), plugin);
        plugin.aliases?.forEach(a => aliasMap.set(a, plugin.command));
      }
    } catch {}
  }
}

await loadPlugins();



const userCooldowns = new Map();
const COMMAND_COOLDOWN = 1000;

function checkCooldown(sender) {
  const now = Date.now();
  const last = userCooldowns.get(sender);
  if (last && now - last < COMMAND_COOLDOWN) return false;
  userCooldowns.set(sender, now);
  return true;
}



export async function handleMessage(sock, msg) {
  if (msg.key.fromMe) return;

  const body = extractMessageBody(msg);
  if (!body) return;

  const from = msg.key.remoteJid;
  const isGroup = from.endsWith('@g.us');
  const sender = msg.key.participant || from;
  const senderNumber = normalizeNumber(sender);
  const isOwner = ownerNumber.includes(`+${senderNumber}`);

  
  if (isOwner) {
    sock.sendMessage(from, { react: { text: '👑', key: msg.key } }).catch(() => {});
  }

  try {
    const db = cargarDatabase();
    if (db.reactions && db.reactions.users && db.reactions.users[sender] && db.reactions.users[sender].selected) {
      const emoji = db.reactions.users[sender].selected;
      if (emoji) {
        sock.sendMessage(from, { react: { text: emoji, key: msg.key } }).catch(() => {});
      }
    }
  } catch {}

  await desactivarAFKAutomatico(sender, from, sock).catch(() => {});

  const db = cargarDatabase();
  db.users ??= {};
  db.bannedUsers ??= [];

  if (db.bannedUsers.includes(sender)) return;

  const isCommand = body.startsWith(prefix);

  

  if (isGroup && !isCommand) {
    const antilink = getJSON('./data/antilink.json');
    if (!antilink[from] || !isLink(body)) return;

    const meta = await getGroupMetadata(sock, from);
    const admins = meta.participants.filter(p => p.admin).map(p => p.id);

    if (admins.includes(sender) || isOwner) return;

    await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
    await sock.groupParticipantsUpdate(from, [sender], 'remove').catch(() => {});
    return;
  }

  if (!isCommand) return;
  if (!checkCooldown(sender)) return;

 

  if (isGroup) {
    const modoAdmin = getJSON('./data/modoadmin.json');
    if (modoAdmin[from]) {
      const meta = await getGroupMetadata(sock, from);
      const admins = meta.participants.filter(p => p.admin).map(p => p.id);
      if (!admins.includes(sender) && !isOwner) {
        return sock.sendMessage(from, { text: '🛑 *Modo Admin activo*' });
      }
    }
    
    const modoOwner = getJSON('./data/modoowner.json');
    if (modoOwner[from]) {
      try {
        const meta = await getGroupMetadata(sock, from);
        const ownerId = meta.participants.find(p => p.admin === 'superadmin')?.id || meta.owner || meta.creator;
        if (ownerId) {
          if (!isOwner) {
            return sock.sendMessage(from, { text: '🛑 *Modo Owner activo*' });
          }
        } else {
          
          const admins = meta.participants.filter(p => p.admin).map(p => p.id);
          if (!isOwner) {
            return sock.sendMessage(from, { text: '🛑 *Modo Owner activo*' });
          }
        }
      } catch {}
    }
  }

  const args = body.slice(prefix.length).trim().split(/\s+/);
  const cmdName = args.shift().toLowerCase();

  const plugin = pluginsMap.get(cmdName) || pluginsMap.get(aliasMap.get(cmdName));
  if (!plugin) return;

  if (plugin.groupOnly && !isGroup) {
    return sock.sendMessage(from, { text: '❌ Solo en grupos.' });
  }

  if (plugin.adminOnly && isGroup) {
    const meta = await getGroupMetadata(sock, from);
    const admins = meta.participants.filter(p => p.admin).map(p => p.id);
    if (!admins.includes(sender) && !isOwner) {
      return sock.sendMessage(from, { text: '🛑 Solo admins.' });
    }
  }

  try {
    await plugin.run(sock, msg, args);
    trackCommand(sender, sock, from);
  } catch {}
}



setInterval(() => {
  const now = Date.now();
  for (const [k, t] of userCooldowns) {
    if (now - t > 3600000) userCooldowns.delete(k);
  }
}, 60000);