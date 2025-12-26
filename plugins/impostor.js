// Código por miangeldev
// impostor.js (actualizado)
// - 30s por turno
// - Mensaje claro para FALSO IMPOSTOR
// - Si el último no habla a tiempo, se marca (silencio) y se pasa a votación

global.impostorGames = global.impostorGames || {};
import { trackImpostorPlay, trackImpostorWin } from '../middleware/trackAchievements.js';

// -----------------------------
// Constantes de personalización
// -----------------------------
const MIN_PLAYERS               = 3;
const MAX_PLAYERS               = 12;
const TWO_IMPOSTORS_THRESHOLD   = 7;        // >=7 jugadores → 2 impostores
const FALSE_IMPOSTOR_DEN        = 30;       // 1 de 30
const MAX_WORD_LEN              = 24;

const TURN_TIME_MS              = 30_000;   // <<< 30s por turno
const VOTE_TIME_MS              = 60_000;
const RUNOFF_TIME_MS            = 45_000;
const SHUFFLE_TURN_ORDER        = true;

const ANIMALS = [
  'PERRO','GATO','LEON','TIGRE','ELEFANTE','JIRAFA','ZORRO','OSO','LOBO','CEBRA',
  'COCODRILO','HIPOPOTAMO','RINOCERONTE','PINGUINO','KOALA','CANGURO','AGUILA',
  'OVEJA','CABRA','GALLINA','PAVO','RATON','ARDILLA','MAPACHE','PANDA','GORILA',
  'MONO','IGUANA','SERPIENTE','RANA','TORTUGA', 'INDONESIA', 'MEXICO', 'CHILE',
  'JAPÓN', 'PERÚ', 'BRASIL', 'COLOMBIA', 'CAMERÚN', 'AUSTRIA', 'FRANCIA', 'PANDABOT',
  'REGGAETON', 'ARGENTINA', 'ESPAÑA', 'TRALALERO', 'CHINA', 'ALEMANIA', 'ITALIA',
  'AFRICA', 'CHAD', 'COREA', 'TOMAS', 'ROBERTO', 'PACO', 'FANTASMA', 'AUTISMO',
  'TOM', 'JOSEFINO', 'MOTOR', 'BICICLETA', 'AVIÓN', 'TOBOGÁN', 'MIGUELITO', 'THIAGO',
  'SIGMA', 'MBAPPÉ', 'MESSI', 'CR7', 'RONALDINHO', 'NEYMAR', 'BARCELONA',
  'REAL_MADRID', 'PSG', 'IMPOSTOR', 'LABUBU', 'CHICLE', 'DORITOS', 'COCA-COLA',
  'UNIVERSIDAD', 'TACOS', 'ADMINISTRADOR', 'LUKAS', 'KENNEDY', 'NOVIA',
  'PREMIER_LEAGUE', 'HARRY_KANE', 'POGBA', 'DEMBELÉ', 'PELÉ', 'MARADONA',
  'MC_DONALDS', 'DONA', 'BRAWL_STARS', 'BOB_ESPONJA', 'TUNGTUNGTUNGSAHUR',
  'LIRILI_LARILA', '2024', '2025', '2023', '2022', '2018', 'FORTNITE', 'MINECRAFT',
  'ROBLOX', 'CEREBRO', 'PENE', 'LOW_FADE', 'EDIT', 'DRIBBLING', 'PHONK', 'K-POP',
  'RITUAL', 'BAÑO', 'COCINA', 'JAMÓN', 'BANDA', 'PENSAR', 'SALTAR', 'CUERDA',
  'PASTEL', 'PANQUEQUES', 'CALIENTE', 'CAFÉ', 'MATE', 'PELOTA', 'FÚTBOL', 'PIERNA',
  'CHAMBA', 'COURTOIS', 'IBAI', 'SOS', 'PISCO', 'GAFAS', 'SOL', 'TRIPULANTE'
];

// -----------------------------
// Utilidades
// -----------------------------
function getName(sock, jid) {
  const c = sock?.store?.contacts?.[jid];
  if (c?.name) return c.name;
  if (c?.verifiedName) return c.verifiedName;
  return jid.split('@')[0];
}
async function getGroupName(sock, jid) {
  if (jid.endsWith('@g.us')) {
    try {
      const md = await sock.groupMetadata(jid);
      return md?.subject || getName(sock, jid);
    } catch {}
  }
  return getName(sock, jid);
}
function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { const a = arr.slice(); for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function clearPhaseTimer(game) { if (game.phaseTimer) { clearTimeout(game.phaseTimer); game.phaseTimer = null; } }
function clearTurnTimer(game) { if (game.turnTimer) { clearTimeout(game.turnTimer); game.turnTimer = null; } }
function alivePlayers(game) { return game.jugadores.filter(j => j.alive); }
function impostorsAliveCount(game) { return game.jugadores.filter(j => j.alive && j.role === 'impostor').length; }
function crewsAliveCount(game) { return game.jugadores.filter(j => j.alive && j.role !== 'impostor').length; }
function atOf(jid) { return '@' + jid.split('@')[0]; }
function rosterLineAt(p) { return `*ID ${p.id}* — ${atOf(p.jid)} ${p.nombre ? `(${p.nombre})` : ''}${p.alive ? '' : ' (⛔️ eliminado)'}`; }
function sanitizeWord(w) { const t = (w || '').trim(); if (!t) return ''; return t.replace(/\s+/g, ' ').slice(0, MAX_WORD_LEN); }
function norm(s) { return (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'').toUpperCase(); }
function nameOrAtForSender(jid, msg) { const senderJid = msg.key.participant || msg.key.remoteJid; if (jid === senderJid && msg.pushName) return `*${msg.pushName}*`; return atOf(jid); }
function nameOrAt(jid) { return atOf(jid); }
function getMentionedJids(msg) {
  const m = msg?.message || {};
  const out = new Set();
  for (const v of Object.values(m)) {
    const mj = v?.contextInfo?.mentionedJid;
    if (Array.isArray(mj)) for (const x of mj) out.add(x);
    const cap = v?.caption?.contextInfo?.mentionedJid;
    if (Array.isArray(cap)) for (const x of cap) out.add(x);
  }
  return [...out];
}
function buildRosterWithMentions(players) { const mentions = players.map(p => p.jid); const text = players.map(rosterLineAt).join('\n'); return { text, mentions }; }
function buildOptionsWithMentions(players) {
  const mentions = players.map(p => p.jid);
  const text = players.map(p => `*ID ${p.id}* — ${atOf(p.jid)} ${p.nombre ? `(${p.nombre})` : ''}`).join('\n') || '(No hay opciones)';
  return { text, mentions };
}
async function checkParityAndMaybeEnd(sock, game) {
  const imp = impostorsAliveCount(game);
  const crew = crewsAliveCount(game);
  if (imp <= 0) { await endGame(sock, game, '🏆 *¡Los tripulantes ganan!* No quedan impostores.'); return true; }
  if (imp >= crew) { await endGame(sock, game, '🕵️‍♂️ *¡Los impostores ganan!* Alcanzaron la paridad.'); return true; }
  return false;
}

// -----------------------------
// Turnos (palabras uno por uno)
// -----------------------------
function buildTurnQueue(game) {
  const vivos = alivePlayers(game).map(p => p.jid);
  return SHUFFLE_TURN_ORDER ? shuffle(vivos) : vivos;
}
function remainingToSpeak(game) {
  return alivePlayers(game).filter(p => !game.palabras[p.jid]).length;
}
async function promptCurrentTurn(sock, game) {
  clearTurnTimer(game);
  const jid = game.turnoDeJid;
  if (!jid) return;
  const vivos = alivePlayers(game).filter(p => !game.palabras[p.jid]);
  const idx = vivos.findIndex(p => p.jid === jid);
  const next = (idx >= 0 && idx + 1 < vivos.length) ? vivos[idx + 1].jid : null;

  const mentions = next ? [jid, next] : [jid];
  await sock.sendMessage(game.chatId, {
    text:
`🗣️ *Ronda ${game.ronda} — Turnos de palabra (uno por uno)*

Ahora, ${atOf(jid)} tiene que decir su palabra.
Comando: \`.impostor palabra <tu_palabra>\`
${next ? `Siguiente: ${atOf(next)}` : 'Será el último de la ronda.'}

⏳ Tienes ${Math.floor(TURN_TIME_MS/1000)}s.`,
    mentions
  });

  game.turnoTimestamp = Date.now() + TURN_TIME_MS;
  game.turnTimer = setTimeout(async () => {
    // Expiró turno: cuenta como silencio y avanza.
    if (game.estado !== 'Jugando' || game.turnoDeJid !== jid) return;
    game.palabras[jid] = '(silencio)'; // <<<< marca como "ya habló" para cerrar si era el último
    await sock.sendMessage(game.chatId, {
      text: `⏰ ${atOf(jid)} *perdió su turno* (silencio).`,
      mentions: [jid]
    });
    await advanceTurnOrClose(sock, game);
  }, TURN_TIME_MS);
}
async function advanceTurnOrClose(sock, game) {
  clearTurnTimer(game);
  const vivos = alivePlayers(game).map(p => p.jid);
  const pendientes = vivos.filter(jid => !game.palabras[jid]);
  if (pendientes.length === 0) {
    await closeRoundAndStartVoting(sock, game, false);
    return;
  }
  const currentIdx = pendientes.indexOf(game.turnoDeJid);
  const nextJid = (currentIdx === -1) ? pendientes[0] : pendientes[(currentIdx + 1) % pendientes.length];
  game.turnoDeJid = nextJid;
  await promptCurrentTurn(sock, game);
}

// -----------------------------
// Fases
// -----------------------------
async function startRound(sock, game) {
  clearPhaseTimer(game); clearTurnTimer(game);
  game.estado = 'Jugando';
  game.palabras = {}; game.votos = {}; game.votingCandidates = null;

  const vivos = alivePlayers(game);
  const roster = buildRosterWithMentions(vivos);

  await sock.sendMessage(game.chatId, {
    text:
`🟢 *Ronda ${game.ronda} — Digan UNA palabra relacionada (UNO POR UNO)*

*Jugadores vivos (${vivos.length}):*
${roster.text}

⚠️ *Palabra prohibida:* si dices la palabra exacta, *quedas eliminado*.`,
    mentions: roster.mentions
  });

  game.turnQueue = buildTurnQueue(game);
  const first = game.turnQueue.find(jid => game.jugadores.find(p => p.jid === jid && p.alive));
  game.turnoDeJid = first || null;

  if (!game.turnoDeJid) { await closeRoundAndStartVoting(sock, game, false); return; }
  await promptCurrentTurn(sock, game);
}

async function closeRoundAndStartVoting(sock, game, porTiempo = false) {
  clearPhaseTimer(game); clearTurnTimer(game);
  if (game.estado !== 'Jugando') return;

  const vivos = alivePlayers(game);
  const lines = vivos.map(p => {
    const w = game.palabras[p.jid];
    return `• ${atOf(p.jid)}: ${w ? `_${w}_` : '—'}`;
  }).join('\n');
  const mentions = vivos.map(p => p.jid);

  await sock.sendMessage(game.chatId, {
    text:
`📝 *Palabras de la Ronda ${game.ronda}:*
${lines}

${porTiempo ? '⏰ Se acabó el tiempo.' : '✅ Fin de turnos.'} Ahora *voten en el grupo* quién es el impostor.`,
    mentions
  });

  await startVoting(sock, game);
}

async function startVoting(sock, game) {
  clearPhaseTimer(game); clearTurnTimer(game);
  game.estado = 'Votando'; game.votos = {}; game.votingCandidates = null;
  game.turnoTimestamp = Date.now() + VOTE_TIME_MS;

  const vivos = alivePlayers(game);
  const opts = buildOptionsWithMentions(vivos);

  await sock.sendMessage(game.chatId, {
    text:
`🗳️ *VOTACIÓN (Ronda ${game.ronda})*
Vota con: \`.impostor votar <ID>\` o \`.impostor votar @usuario\`

*Opciones:*
${opts.text}

⏳ Tienen ${Math.floor(VOTE_TIME_MS/1000)}s.`,
    mentions: opts.mentions
  });

  game.phaseTimer = setTimeout(async () => {
    if (game.estado !== 'Votando') return;
    await tallyVotes(sock, game, true);
  }, VOTE_TIME_MS);
}

async function startRunoffVoting(sock, game, candidateIds) {
  clearPhaseTimer(game); clearTurnTimer(game);
  game.estado = 'Votando2'; game.votos = {}; game.votingCandidates = candidateIds.slice();
  game.turnoTimestamp = Date.now() + RUNOFF_TIME_MS;

  const vivos = alivePlayers(game).filter(o => candidateIds.includes(o.id));
  const opts = buildOptionsWithMentions(vivos);

  await sock.sendMessage(game.chatId, {
    text:
`🗳️ *SEGUNDA VUELTA (Ronda ${game.ronda})*
Voten SOLO entre los empatados:
\`.impostor votar <ID>\` o \`.impostor votar @usuario\`

*Opciones (empatados):*
${opts.text}

⏳ Tienen ${Math.floor(RUNOFF_TIME_MS/1000)}s.`,
    mentions: opts.mentions
  });

  game.phaseTimer = setTimeout(async () => {
    if (game.estado !== 'Votando2') return;
    await tallyRunoffVotes(sock, game, true);
  }, RUNOFF_TIME_MS);
}

async function tallyVotes(sock, game, porTiempo = false) {
  clearPhaseTimer(game);
  if (game.estado !== 'Votando') return;

  const vivos = alivePlayers(game);
  const counts = new Map();
  for (const voter of vivos) {
    const targetId = game.votos[voter.jid];
    if (!targetId) continue;
    counts.set(targetId, (counts.get(targetId) || 0) + 1);
  }

  const resumen = vivos.map(p => `• ${atOf(p.jid)} (ID ${p.id}): ${counts.get(p.id) || 0} voto(s)`).join('\n');
  const resumenMentions = vivos.map(p => p.jid);

  if (counts.size === 0) {
    await sock.sendMessage(game.chatId, {
      text:
`🗳️ *Votación cerrada*${porTiempo ? ' (tiempo agotado)' : ''}.
Nadie votó. 🤦‍♂️
${resumen}

📣 *Nadie es eliminado.* Siguiente ronda…`,
      mentions: resumenMentions
    });
    await nextRoundOrWin(sock, game, null);
    return;
  }

  let maxVotes = -1, topIds = [];
  for (const [id, v] of counts.entries()) {
    if (v > maxVotes) { maxVotes = v; topIds = [id]; }
    else if (v === maxVotes) topIds.push(id);
  }

  if (topIds.length !== 1) {
    const empEmp = alivePlayers(game).filter(x => topIds.includes(x.id));
    const empText = empEmp.map(x => `• ${atOf(x.jid)} (ID ${x.id})`).join('\n');
    const empMentions = empEmp.map(x => x.jid);
    await sock.sendMessage(game.chatId, {
      text:
`🗳️ *Empate en la votación.* Se hará *segunda vuelta* entre:
${empText}

${resumen}`,
      mentions: [...new Set([...resumenMentions, ...empMentions])]
    });
    await startRunoffVoting(sock, game, topIds);
    return;
  }

  await eliminateById(sock, game, topIds[0], { text: resumen, mentions: resumenMentions });
}

async function tallyRunoffVotes(sock, game, porTiempo = false) {
  clearPhaseTimer(game);
  if (game.estado !== 'Votando2') return;

  const vivos = alivePlayers(game);
  const allowed = new Set(game.votingCandidates || []);
  const counts = new Map();

  for (const voter of vivos) {
    const targetId = game.votos[voter.jid];
    if (!targetId) continue;
    if (!allowed.has(targetId)) continue;
    counts.set(targetId, (counts.get(targetId) || 0) + 1);
  }

  const cand = vivos.filter(p => allowed.has(p.id));
  const resumen = cand.map(p => `• ${atOf(p.jid)} (ID ${p.id}): ${counts.get(p.id) || 0} voto(s)`).join('\n');
  const resumenMentions = cand.map(p => p.jid);

  if (counts.size === 0) {
    await sock.sendMessage(game.chatId, {
      text:
`🗳️ *Segunda vuelta cerrada*${porTiempo ? ' (tiempo agotado)' : ''}.
Nadie votó. 🤦‍♂️
${resumen || ''}

📣 *Nadie es eliminado.* Siguiente ronda…`,
      mentions: resumenMentions
    });
    await nextRoundOrWin(sock, game, null);
    return;
  }

  let maxVotes = -1, topIds = [];
  for (const [id, v] of counts.entries()) {
    if (v > maxVotes) { maxVotes = v; topIds = [id]; }
    else if (v === maxVotes) topIds.push(id);
  }

  if (topIds.length !== 1) {
    await sock.sendMessage(game.chatId, {
      text:
`🗳️ *Segunda vuelta empatada.* No habrá eliminado esta ronda.
${resumen || ''}`,
      mentions: resumenMentions
    });
    await nextRoundOrWin(sock, game, null);
    return;
  }

  await eliminateById(sock, game, topIds[0], { text: resumen, mentions: resumenMentions });
}

async function eliminateById(sock, game, eliminatedId, resumenObj) {
  const elim = game.jugadores.find(p => p.id === eliminatedId);
  if (!elim || !elim.alive) {
    await sock.sendMessage(game.chatId, { text: '⚠️ Error al eliminar (ID inválido). Se continúa sin eliminación.' });
    await nextRoundOrWin(sock, game, null);
    return;
  }

  elim.alive = false;
  const wasImp = elim.role === 'impostor';

  const text =
`☠️ *Eliminado:* ${nameOrAt(elim.jid)} (ID ${elim.id}) — era *${wasImp ? 'IMPOSTOR' : 'Tripulante'}*.
${resumenObj?.text ? `\n${resumenObj.text}` : ''}`;

  await sock.sendMessage(game.chatId, { text, mentions: [elim.jid, ...(resumenObj?.mentions || [])] });

  if (await checkParityAndMaybeEnd(sock, game)) return;
  await nextRoundOrWin(sock, game, elim);
}

async function nextRoundOrWin(sock, game, eliminated) {
  game.ronda += 1;
  await startRound(sock, game);
}

async function endGame(sock, game, message) {
  clearPhaseTimer(game); clearTurnTimer(game);
  game.estado = 'Finalizado';
  await sock.sendMessage(game.chatId, { text: message });
  // Determine winners and track wins
  try {
    const impAlive = impostorsAliveCount(game);
    const crewAlive = crewsAliveCount(game);
    let winnersRole = null;
    if (impAlive <= 0) winnersRole = 'crew';
    else if (impAlive >= crewAlive) winnersRole = 'impostor';

    if (winnersRole) {
      for (const pj of game.jugadores) {
        if (!pj) continue;
        if (winnersRole === 'crew' && pj.role !== 'impostor') {
          try { trackImpostorWin(pj.jid, sock, game.chatId); } catch (e) {}
        }
        if (winnersRole === 'impostor' && pj.role === 'impostor') {
          try { trackImpostorWin(pj.jid, sock, game.chatId); } catch (e) {}
        }
      }
    }
  } catch (e) {}
  delete global.impostorGames[game.chatId];
}

// -----------------------------
// Comando principal
// -----------------------------
export const command = 'impostor';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const sub = (args[0] || '').toLowerCase();

  const isGroup = from.endsWith('@g.us');
  if (!isGroup) return sock.sendMessage(from, { text: '❌ Usa `.impostor` *en el grupo*.' });

  const game = global.impostorGames[from];

  if (sub === 'crear') {
    if (game && game.estado !== 'Finalizado') {
      return sock.sendMessage(from, { text: '⚠️ Ya hay una sala activa en este grupo.' }, { quoted: msg });
    }
    const ownerName = getName(sock, sender);
    global.impostorGames[from] = {
      chatId: from,
      owner: sender,
      estado: 'Esperando',
      jugadores: [{ jid: sender, nombre: ownerName, id: 1, alive: true, role: null, esOwner: true, falso: false }],
      animal: null,
      ronda: 1,
      palabras: {},
      votos: {},
      votingCandidates: null,
      turnoTimestamp: 0,
      phaseTimer: null,
      turnTimer: null,
      turnQueue: [],
      turnoDeJid: null
    };
    const roster = buildRosterWithMentions([{ jid: sender, nombre: ownerName, id: 1, alive: true }]);
    return sock.sendMessage(from, {
      text:
`🕵️ *Sala de Impostor creada por* ${atOf(sender)}.

Para unirse: \`.impostor join\`
Para iniciar (${MIN_PLAYERS}–${MAX_PLAYERS} jugadores): \`.impostor iniciar\`
Ayuda: \`.impostor ayuda\``,
      mentions: roster.mentions
    }, { quoted: msg });
  }

  if (sub === 'join') {
    if (!game || game.estado !== 'Esperando') {
      return sock.sendMessage(from, { text: '❌ No hay sala en espera. Usa \`.impostor crear\`.' }, { quoted: msg });
    }
    if (game.jugadores.length >= MAX_PLAYERS) {
      return sock.sendMessage(from, { text: `❌ La sala está llena (máx. ${MAX_PLAYERS}).` }, { quoted: msg });
    }
    if (game.jugadores.some(p => p.jid === sender)) {
      return sock.sendMessage(from, { text: '⚠️ Ya estás en la sala.' }, { quoted: msg });
    }
    const nombre = getName(sock, sender);
    game.jugadores.push({ jid: sender, nombre, id: game.jugadores.length + 1, alive: true, role: null, esOwner: false, falso: false });

    const vivos = game.jugadores;
    const roster = buildRosterWithMentions(vivos);
    return sock.sendMessage(from, {
      text: `✅ ${atOf(sender)} se unió.\n\n*Jugadores (${vivos.length}/${MAX_PLAYERS}):*\n${roster.text}`,
      mentions: roster.mentions
    }, { quoted: msg });
  }

  if (sub === 'iniciar') {
    if (!game || game.estado !== 'Esperando') return sock.sendMessage(from, { text: '❌ No hay sala lista para iniciar.' }, { quoted: msg });
    if (game.jugadores.length < MIN_PLAYERS) return sock.sendMessage(from, { text: `❌ Se necesitan *mínimo ${MIN_PLAYERS}* jugadores.` }, { quoted: msg });
    if (game.jugadores[0].jid !== sender) return sock.sendMessage(from, { text: '❌ Solo el *creador* puede iniciar.' }, { quoted: msg });

    game.animal = pickRandom(ANIMALS);

    const countImpostors = (game.jugadores.length >= TWO_IMPOSTORS_THRESHOLD) ? 2 : 1;
    const pool = shuffle(game.jugadores.map(p => p.jid));
    const impJids = new Set(pool.slice(0, countImpostors));

    for (const pj of game.jugadores) {
      pj.role = impJids.has(pj.jid) ? 'impostor' : 'crew';
      pj.falso = false;
      pj.alive = true;
    }

    // Falso impostor (1/30) entre tripulantes
    const roll = Math.floor(Math.random() * FALSE_IMPOSTOR_DEN);
    if (roll === 0) {
      const crews = game.jugadores.filter(p => p.role === 'crew');
      if (crews.length > 0) pickRandom(crews).falso = true;
    }

    game.ronda = 1;
    game.estado = 'Preparando';

    // Roles por DM
    for (const pj of game.jugadores) {
      if (pj.role === 'impostor') {
        await sock.sendMessage(pj.jid, {
          text:
`🕵️‍♂️ *ROL:* IMPOSTOR
No conoces la palabra.
Tu objetivo es pasar desapercibido y sobrevivir (paridad).`
        });
      } else {
        if (pj.falso) {
          await sock.sendMessage(pj.jid, {
            text:
`🕵️‍♂️ *ROL:* FALSO IMPOSTOR
*ERES UN FALSO IMPOSTOR, deberás encontrar tú también la palabra.*
No recibes la palabra. Intenta camuflarte entre los tripulantes usando pistas y relación semántica sin delatarte.`
          });
        } else {
          await sock.sendMessage(pj.jid, {
            text:
`👥 *ROL:* Tripulante
*PALABRA:* ${game.animal}
No reveles el nombre; usa palabras relacionadas.`
          });
        }
      }
    }

    const roster = buildRosterWithMentions(game.jugadores);
    await sock.sendMessage(from, {
      text:
`✅ *Partida iniciada.* Jugadores: ${game.jugadores.length}.
Se enviaron los *roles por DM*.

📣 Dirán *una palabra uno por uno* con \`.impostor palabra <tu_palabra>\`. Luego votan con \`.impostor votar <ID>|@usuario\`.

⚠️ *Palabra prohibida:* si dices la palabra exacta, *quedas eliminado*.

🔢 Impostores: ${countImpostors}`,
      mentions: roster.mentions
    });

    await startRound(sock, game);
    // Track game participation for all players
    try {
      for (const pj of game.jugadores) {
        try { trackImpostorPlay(pj.jid, sock, from); } catch (e) {}
      }
    } catch (e) {}
    return;
  }

  // Palabra (uno por uno)
  if (sub === 'palabra') {
    const game = global.impostorGames[from];
    if (!game || game.estado !== 'Jugando') return sock.sendMessage(from, { text: '❌ No hay ronda activa para palabras ahora.' });
    const pj = game.jugadores.find(p => p.jid === sender);
    if (!pj || !pj.alive) return sock.sendMessage(from, { text: '❌ No estás en la partida o has sido eliminado.' });

    if (game.turnoDeJid !== pj.jid) {
      const ahora = game.turnoDeJid ? atOf(game.turnoDeJid) : '—';
      return sock.sendMessage(from, { text: `⏳ No es tu turno. Ahora le toca a ${ahora}.` });
    }

    const palabra = sanitizeWord(args.slice(1).join(' '));
    if (!palabra) return sock.sendMessage(from, { text: '❌ Debes escribir una palabra. Ej.: `.impostor palabra colmillos`' });
    if (game.palabras[pj.jid]) return sock.sendMessage(from, { text: '⚠️ Ya enviaste tu palabra en esta ronda.' });

    if (norm(palabra) === norm(game.animal)) {
      pj.alive = false;
      clearTurnTimer(game);
      await sock.sendMessage(game.chatId, { text: `⛔️ *Palabra prohibida*: ${nameOrAtForSender(pj.jid, msg)} dijo la *palabra exacta* y fue *eliminado*.`, mentions: [pj.jid] });

      if (await checkParityAndMaybeEnd(sock, game)) return;

      if (remainingToSpeak(game) === 0) await closeRoundAndStartVoting(sock, game, false);
      else await advanceTurnOrClose(sock, game);
      return;
    }

    game.palabras[pj.jid] = palabra;

    clearTurnTimer(game);
    await sock.sendMessage(from, { text: `🗣️ ${nameOrAtForSender(pj.jid, msg)} aportó su palabra.` , mentions: [pj.jid] });

    if (remainingToSpeak(game) === 0) await closeRoundAndStartVoting(sock, game, false);
    else await advanceTurnOrClose(sock, game);
    return;
  }

  // Votar
  if (sub === 'votar') {
    const game = global.impostorGames[from];
    if (!game || (game.estado !== 'Votando' && game.estado !== 'Votando2')) return sock.sendMessage(from, { text: '❌ No estamos en fase de votación.' });
    const pj = game.jugadores.find(p => p.jid === sender);
    if (!pj || !pj.alive) return sock.sendMessage(from, { text: '❌ No puedes votar (no estás vivo).' });

    const mentioned = getMentionedJids(msg).map(j => game.jugadores.find(p => p.jid === j && p.alive)).filter(Boolean);
    let target = mentioned[0] || null;

    if (!target) {
      const idStr = args[1];
      const targetId = parseInt((idStr || '').trim(), 10);
      if (Number.isFinite(targetId)) target = game.jugadores.find(p => p.id === targetId && p.alive) || null;
    }

    if (!target) return sock.sendMessage(from, { text: '❌ Indica un objetivo válido: `.impostor votar <ID>` o `.impostor votar @usuario`.' });
    if (game.estado === 'Votando2' && game.votingCandidates && !game.votingCandidates.includes(target.id)) {
      return sock.sendMessage(from, { text: '❌ Segunda vuelta: vota solo entre los *empatados*.' });
    }
    if (target.jid === pj.jid) return sock.sendMessage(from, { text: '❌ No puedes votarte a ti mismo.' });

    game.votos[pj.jid] = target.id;

    const votoText = `✅ ${nameOrAtForSender(pj.jid, msg)} votó por ${nameOrAt(target.jid)} (ID ${target.id}).`;
    await sock.sendMessage(from, { text: votoText, mentions: [pj.jid, target.jid] });

    const vivos = alivePlayers(game);
    const totalVivos = vivos.length;
    const votosRecibidos = Object.keys(game.votos).length;
    if (votosRecibidos >= totalVivos) {
      if (game.estado === 'Votando2') await tallyRunoffVotes(sock, game, false);
      else await tallyVotes(sock, game, false);
    }
    return;
  }

  // Estado
  if (sub === 'estado') {
    const game = global.impostorGames[from];
    if (!game) return sock.sendMessage(from, { text: '❌ No hay sala/partida en este grupo.' });

    const vivos = alivePlayers(game);
    const roster = buildRosterWithMentions(vivos);
    let fase = game.estado;
    if (fase === 'Jugando')  fase = `Jugando (por turnos) — ${Math.max(0, Math.ceil((game.turnoTimestamp - Date.now())/1000))}s`;
    if (fase === 'Votando')  fase = `Votando (grupo) — ${Math.max(0, Math.ceil((game.turnoTimestamp - Date.now())/1000))}s`;
    if (fase === 'Votando2') fase = `Segunda vuelta (grupo) — ${Math.max(0, Math.ceil((game.turnoTimestamp - Date.now())/1000))}s`;

    const turnoTxt = game.estado === 'Jugando' && game.turnoDeJid ? `\nTurno actual: ${atOf(game.turnoDeJid)}` : '';

    return sock.sendMessage(from, {
      text:
`📊 *Estado — Ronda ${game.ronda}*
Fase: ${fase}${turnoTxt}

*Vivos (${vivos.length}):*
${roster.text}

⚠️ Palabra prohibida activa: decir la *palabra exacta* te elimina.`,
      mentions: roster.mentions
    });
  }

  // Abandonar
  if (sub === 'abandonar') {
    const game = global.impostorGames[from];
    if (!game) return sock.sendMessage(from, { text: '❌ No hay sala/partida en este grupo.' });
    if (game.owner !== sender) return sock.sendMessage(from, { text: '❌ Solo el *creador* puede finalizar la sala/partida.' });
    await endGame(sock, game, '🛑 *Partida finalizada por el creador.*');
    return;
  }

  // Ayuda
  if (sub === 'ayuda' || !sub) {
    return sock.sendMessage(from, {
      text:
`🕵️ *Impostor — Juego de Palabras*
\`.impostor crear\` — Crea sala (grupo)
\`.impostor join\` — Únete (${MIN_PLAYERS}–${MAX_PLAYERS} jugadores)
\`.impostor iniciar\` — Inicia (creador)
\`.impostor palabra <tu_palabra>\` — *UNO POR UNO* (30s por turno)
\`.impostor votar <ID>|@usuario\` — Vota en el grupo
\`.impostor estado\` — Ver progreso
\`.impostor abandonar\` — Finaliza (creador)

*Reglas:*
• 1 impostor (o 2 si hay ≥${TWO_IMPOSTORS_THRESHOLD}); no conocen la palabra.
• Con prob. 1/${FALSE_IMPOSTOR_DEN}, un tripulante es *Falso impostor* (recibe aviso y NO recibe la palabra).
• Cada ronda: palabra *por turnos* y luego votación.
• *Palabra prohibida:* decir la palabra exacta → *eliminado*.
• Victoria: si *no quedan impostores* → ganan tripulantes; si *impostores ≥ tripulantes* → ganan impostores.
• Empate → segunda vuelta; si vuelve a empatar, *nadie eliminado*.`
    });
  } else {
    return sock.sendMessage(from, { text: '❌ Subcomando inválido. Usa `.impostor ayuda`.' });
  }
}
