import { petDB } from '../data/petsystem.js';
import { cargarDatabase, guardarDatabase } from '../data/database.js';

const CONFIG = {
  exp: { feed: 10, play: 15, walk: 20, sleep: 25, care: 30 },
  cooldowns: { feed: 30, play: 20, walk: 60, sleep: 480, care: 120 },
  prices: {
    rename: 1000000,
    adopt: 5000000,
    food: { apple: 100, meat: 200, fish: 150, carrot: 80, cake: 300, bone: 250, milk: 120 }
  }
};

class CooldownManager {
  constructor() {
    this.cooldowns = new Map();
  }

  setCooldown(userId, action) {
    const key = `${userId}_${action}`;
    const cooldownTime = CONFIG.cooldowns[action] * 60 * 1000;
    this.cooldowns.set(key, Date.now() + cooldownTime);
    setTimeout(() => this.cooldowns.delete(key), cooldownTime);
  }

  getCooldown(userId, action) {
    const key = `${userId}_${action}`;
    const endTime = this.cooldowns.get(key);
    if (!endTime) return 0;
    const remaining = endTime - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
  }
}

const cooldownManager = new CooldownManager();

export const command = 'mascota';
export const aliases = ['pet', 'hijo', 'pareja', 'amor'];

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!args[0]) return await showHelp(sock, from, sender, msg);

  const subCommand = args[0].toLowerCase();

  switch (subCommand) {
    case 'crear':
    case 'adoptar':
      return await createPet(sock, from, sender, msg, args.slice(1));

    case 'ver':
    case 'info':
      return await showPetInfo(sock, from, sender, msg, args.slice(1));

    case 'alimentar':
    case 'comida':
      return await feedPet(sock, from, sender, msg, args.slice(1));

    case 'jugar':
      return await playWithPet(sock, from, sender, msg, args.slice(1));

    case 'pasear':
      return await walkPet(sock, from, sender, msg, args.slice(1));

    case 'dormir':
      return await sleepPet(sock, from, sender, msg, args.slice(1));

    case 'cuidar':
      return await careForPet(sock, from, sender, msg, args.slice(1));

    case 'tienda':
      return await showShop(sock, from, sender, msg);

    case 'comprar':
      return await buyItem(sock, from, sender, msg, args.slice(1));

    case 'renombrar':
      return await renamePet(sock, from, sender, msg, args.slice(1));

    case 'solicitar':
    case 'pedir':
      return await requestAdoption(sock, from, sender, msg, args.slice(1));

    case 'aceptar':
      return await acceptAdoption(sock, from, sender, msg, args.slice(1));

    case 'rechazar':
      return await rejectAdoption(sock, from, sender, msg, args.slice(1));

    case 'pareja':
    case 'amor':
      return await coupleInfo(sock, from, sender, msg);

    case 'hijo':
      return await createChild(sock, from, sender, msg, args.slice(1));

    case 'abandonar':
      return await abandonPet(sock, from, sender, msg, args.slice(1));

    case 'top':
      return await showTopPets(sock, from, msg);

    case 'estadisticas':
      return await showStats(sock, from, sender, msg);

    case 'ayuda':
    case 'help':
      return await showHelp(sock, from, sender, msg);

    default:
      return await sock.sendMessage(from, {
        text: `❌ Comando no reconocido. Usa *.mascota ayuda* para ver los comandos disponibles.`
      }, { quoted: msg });
  }
}

async function showHelp(sock, from, sender, msg) {
  const helpText = `🐾 *SISTEMA DE MASCOTAS Y PAREJAS* 🐾

🎯 *Comandos Básicos:*
• .mascota crear <nombre> - Adopta una mascota
• .mascota ver - Ver tu mascota
• .mascota alimentar - Dar de comer
• .mascota jugar - Jugar con tu mascota
• .mascota pasear - Sacar a pasear
• .mascota dormir - Poner a dormir
• .mascota cuidar - Cuidar necesidades

👫 *Comandos de Pareja:*
• .mascota solicitar @usuario - Pedir ser pareja
• .mascota aceptar <id> - Aceptar solicitud
• .mascota pareja - Ver info de pareja
• .mascota hijo <nombre> - Tener un hijo juntos

🛒 *Tienda y Gestión:*
• .mascota tienda - Ver tienda
• .mascota comprar <item> - Comprar items
• .mascota renombrar <nombre> - Cambiar nombre
• .mascota abandonar - Liberar mascota

📊 *Otros:*
• .mascota top - Top mascotas
• .mascota estadisticas - Estadísticas
• .mascota ayuda - Esta ayuda

💕 *Con amor, tu mascota crecerá y se hará fuerte!*`;

  await sock.sendMessage(from, { text: helpText }, { quoted: msg });
}

async function createPet(sock, from, sender, msg, args) {
  const db = cargarDatabase();
  const user = db.users?.[sender];

  if (!user) {
    return await sock.sendMessage(from, {
      text: '❌ Primero debes registrarte en el bot.'
    }, { quoted: msg });
  }

  if (args.length < 1) {
    return await sock.sendMessage(from, {
      text: '❌ Uso: .mascota crear <nombre>\nEjemplo: .mascota crear Sparky'
    }, { quoted: msg });
  }

  const petName = args.join(' ');
  const userPets = petDB.getUserPets(sender);

  if (userPets.length >= 3) {
    return await sock.sendMessage(from, {
      text: '❌ Ya tienes 3 mascotas. Puedes tener máximo 3 mascotas.'
    }, { quoted: msg });
  }

  const newPet = petDB.createPet(sender, petName, 'random');
  const petType = petDB.db.petTypes[newPet.type];

  const response = `🎉 *¡Felicidades! Has adoptado una mascota* 🎉

🐾 *Nombre:* ${newPet.name}
${petType.name} (${petType.rarity})
❤️ *Salud:* ${newPet.health}/${newPet.maxHealth}
😊 *Felicidad:* ${newPet.happiness}%
🍖 *Hambre:* ${newPet.hunger}%
⚡ *Energía:* ${newPet.energy}%
📊 *Nivel:* ${newPet.level}

✨ *Consejos:*
• Aliméntala con .mascota alimentar
• Juega con ella para aumentar felicidad
• Sácala a pasear para ganar experiencia
• Cuídala bien y subirá de nivel!

💕 ¡Cuídala con amor!`;

  await sock.sendMessage(from, { text: response }, { quoted: msg });
}

async function showPetInfo(sock, from, sender, msg, args) {
  const userPets = petDB.getUserPets(sender);

  if (userPets.length === 0) {
    return await sock.sendMessage(from, {
      text: '❌ No tienes mascotas. Usa *.mascota crear <nombre>* para adoptar una.'
    }, { quoted: msg });
  }

  let pet;
  if (args.length > 0 && args[0].startsWith('pet_')) {
    pet = petDB.getPet(args[0]);
    if (!pet || !pet.owners.includes(sender)) {
      return await sock.sendMessage(from, {
        text: '❌ No tienes acceso a esta mascota.'
      }, { quoted: msg });
    }
  } else {
    pet = userPets[0];
  }

  const petType = petDB.db.petTypes[pet.type];
  const birthDate = new Date(pet.birthDate);
  const ageDays = Math.floor((Date.now() - birthDate) / (1000 * 60 * 60 * 24));
  const levelProgress = (pet.exp / pet.expToNextLevel) * 100;
  const progressBar = '█'.repeat(Math.round((levelProgress / 100) * 10)) + '░'.repeat(10 - Math.round((levelProgress / 100) * 10));

  const ownersInfo = pet.owners.map(owner => `@${owner.split('@')[0]}`).join(', ');                                                                                              
  const response = `🐾 *INFORMACIÓN DE MASCOTA* 🐾

📛 *Nombre:* ${pet.name}                                                                                                                                                         ${petType.name} ⭐ Nivel ${pet.level}                                                                                                                                            👤 *Dueños:* ${ownersInfo}                                                                                                                                                                                                                                                                                                                                        ❤️ *Salud:* ${pet.health}/${pet.maxHealth} ${pet.health >= 70 ? '🟢' : pet.health >= 40 ? '🟡' : '🔴'}                                                                            😊 *Felicidad:* ${pet.happiness}% ${pet.happiness >= 80 ? '😄' : pet.happiness >= 60 ? '😊' : pet.happiness >= 40 ? '😐' : pet.happiness >= 20 ? '😞' : '😢'}
🍖 *Hambre:* ${pet.hunger}% ${pet.hunger <= 20 ? '🍖' : pet.hunger <= 40 ? '🍗' : pet.hunger <= 60 ? '🥩' : pet.hunger <= 80 ? '🍽️' : '🆘'}
⚡ *Energía:* ${pet.energy}% ${pet.energy >= 80 ? '⚡' : pet.energy >= 60 ? '🔋' : pet.energy >= 40 ? '🪫' : pet.energy >= 20 ? '😴' : '💤'}
                                                                                                                                                                                 📊 *Experiencia:* ${pet.exp}/${pet.expToNextLevel}                                                                                                                               ${progressBar} (${levelProgress.toFixed(1)}%)
                                                                                                                                                                                 📅 *Edad:* ${ageDays} días                                                                                                                                                       📍 *Estado:* ${pet.status === 'awake' ? '👁️ Despierto' : '💤 Durmiendo'}
🏠 *Ubicación:* ${pet.location === 'home' ? 'En casa' : 'Paseando'}                                                                                                                                                                                                                                                                                               📈 *Estadísticas:*
• 🍽️ Alimentado: ${pet.stats.timesFed} veces                                                                                                                                      • 🎮 Jugado: ${pet.stats.timesPlayed} veces                                                                                                                                      • 🚶 Paseado: ${pet.stats.timesWalked} veces
• 😴 Dormido: ${pet.stats.timesSlept} veces

💬 Usa .mascota ayuda para ver todos los comandos.`;

  await sock.sendMessage(from, {
    text: response,
    mentions: pet.owners.map(owner => owner)
  }, { quoted: msg });
}

async function feedPet(sock, from, sender, msg, args) {
  const userPets = petDB.getUserPets(sender);

  if (userPets.length === 0) {
    return await sock.sendMessage(from, {
      text: '❌ No tienes mascotas para alimentar.'
    }, { quoted: msg });
  }

  const cooldown = cooldownManager.getCooldown(sender, 'feed');
  if (cooldown > 0) {
    return await sock.sendMessage(from, {
      text: `⏰ Espera ${cooldown} minutos antes de alimentar de nuevo.`
    }, { quoted: msg });
  }

  const pet = userPets[0];
  let foodItem = null;
  let foodType = 'basic';

  if (args.length > 0) {
    foodType = args[0].toLowerCase();
    if (pet.inventory.food && pet.inventory.food[foodType] > 0) {
      foodItem = petDB.db.foodItems[foodType];
      // Actualizar inventario
      petDB.updatePet(pet.id, {
        inventory: {
          ...pet.inventory,
          food: {
            ...pet.inventory.food,
            [foodType]: pet.inventory.food[foodType] - 1
          }
        }
      });
    }
  }

  if (!foodItem) {
    foodItem = petDB.db.foodItems.apple;
    foodType = 'apple';
  }

  const healthGain = Math.min(foodItem.health, pet.maxHealth - pet.health);
  const happinessGain = foodItem.happiness;
  const hungerReduction = Math.min(foodItem.hunger, pet.hunger);

  const newHealth = Math.min(pet.maxHealth, pet.health + healthGain);
  const newHappiness = Math.min(100, pet.happiness + happinessGain);
  const newHunger = Math.max(0, pet.hunger + hungerReduction);
  const newExp = pet.exp + CONFIG.exp.feed;
  const newTimesFed = pet.stats.timesFed + 1;

  // Actualizar mascota en la base de datos
  petDB.updatePet(pet.id, {
    health: newHealth,
    happiness: newHappiness,
    hunger: newHunger,
    exp: newExp,
    stats: {
      ...pet.stats,
      timesFed: newTimesFed
    }
  });

  cooldownManager.setCooldown(sender, 'feed');

  // Verificar si subió de nivel
  const updatedPet = petDB.getPet(pet.id);
  const leveledUp = checkLevelUp(updatedPet);

  let response = `🍽️ *${pet.name} ha sido alimentado!* 🍽️

🥗 *Comida usada:* ${foodItem.name}
❤️ *Salud:* +${healthGain} (${newHealth}/${pet.maxHealth})
😊 *Felicidad:* +${happinessGain}% (${newHappiness}%)
🍖 *Hambre:* -${Math.abs(hungerReduction)}% (${newHunger}%)
⭐ *Experiencia:* +${CONFIG.exp.feed} XP

📊 *Total comidas:* ${newTimesFed}`;

  if (leveledUp) {
    response += `\n\n🎉 *¡NIVEL SUBIDO!* 🎉\n¡${pet.name} ahora es nivel ${updatedPet.level}!`;
  }

  await sock.sendMessage(from, { text: response }, { quoted: msg });
}

async function playWithPet(sock, from, sender, msg, args) {
  const userPets = petDB.getUserPets(sender);

  if (userPets.length === 0) {
    return await sock.sendMessage(from, {
      text: '❌ No tienes mascotas para jugar.'
    }, { quoted: msg });
  }

  const pet = userPets[0];

  if (pet.status === 'sleeping') {
    return await sock.sendMessage(from, {
      text: '😴 Tu mascota está durmiendo. Espera a que despierte.'
    }, { quoted: msg });
  }

  const cooldown = cooldownManager.getCooldown(sender, 'play');
  if (cooldown > 0) {
    return await sock.sendMessage(from, {
      text: `⏰ Espera ${cooldown} minutos antes de jugar de nuevo.`
    }, { quoted: msg });
  }

  if (pet.energy < 20) {
    return await sock.sendMessage(from, {
      text: '⚡ Tu mascota está muy cansada para jugar. Déjala descansar.'
    }, { quoted: msg });
  }

  let toyBonus = 0;
  let toyName = '';
  let inventoryUpdates = {};

  if (args.length > 0 && pet.inventory.toys && pet.inventory.toys[args[0]] > 0) {
    const toyType = args[0];
    const toy = petDB.db.toyItems[toyType];
    if (toy) {
      toyBonus = toy.happiness;
      toyName = toy.name;
      const newToyCount = pet.inventory.toys[toyType] - 1;
      
      if (newToyCount <= 0) {
        inventoryUpdates = {
          toys: { ...pet.inventory.toys }
        };
        delete inventoryUpdates.toys[toyType];
      } else {
        inventoryUpdates = {
          toys: {
            ...pet.inventory.toys,
            [toyType]: newToyCount
          }
        };
      }
    }
  }

  const happinessGain = 15 + toyBonus;
  const energyCost = 15;
  const expGain = CONFIG.exp.play + (toyBonus > 0 ? 5 : 0);

  const newHappiness = Math.min(100, pet.happiness + happinessGain);
  const newEnergy = Math.max(0, pet.energy - energyCost);
  const newExp = pet.exp + expGain;
  const newTimesPlayed = pet.stats.timesPlayed + 1;

  // Actualizar mascota
  const updates = {
    happiness: newHappiness,
    energy: newEnergy,
    exp: newExp,
    stats: {
      ...pet.stats,
      timesPlayed: newTimesPlayed
    }
  };

  if (Object.keys(inventoryUpdates).length > 0) {
    updates.inventory = {
      ...pet.inventory,
      ...inventoryUpdates
    };
  }

  petDB.updatePet(pet.id, updates);
  cooldownManager.setCooldown(sender, 'play');

  // Verificar si subió de nivel
  const updatedPet = petDB.getPet(pet.id);
  const leveledUp = checkLevelUp(updatedPet);

  let response = `🎮 *¡Jugando con ${pet.name}!* 🎮\n\n`;

  if (toyName) {
    response += `🧸 *Juguete usado:* ${toyName}\n`;
  }

  response += `😊 *Felicidad:* +${happinessGain}% (${newHappiness}%)
⚡ *Energía:* -${energyCost}% (${newEnergy}%)
⭐ *Experiencia:* +${expGain} XP

📊 *Total juegos:* ${newTimesPlayed}`;

  if (leveledUp) {
    response += `\n\n🎉 *¡NIVEL SUBIDO!* 🎉\n¡${pet.name} ahora es nivel ${updatedPet.level}!`;
  }

  await sock.sendMessage(from, { text: response }, { quoted: msg });
}

async function walkPet(sock, from, sender, msg, args) {
  const userPets = petDB.getUserPets(sender);

  if (userPets.length === 0) {
    return await sock.sendMessage(from, {
      text: '❌ No tienes mascotas para pasear.'
    }, { quoted: msg });
  }

  const pet = userPets[0];

  if (pet.status === 'sleeping') {
    return await sock.sendMessage(from, {
      text: '😴 Tu mascota está durmiendo. Espera a que despierte.'
    }, { quoted: msg });
  }

  const cooldown = cooldownManager.getCooldown(sender, 'walk');
  if (cooldown > 0) {
    return await sock.sendMessage(from, {
      text: `⏰ Espera ${cooldown} minutos antes de pasear de nuevo.`
    }, { quoted: msg });
  }

  if (pet.energy < 30) {
    return await sock.sendMessage(from, {
      text: '⚡ Tu mascota está muy cansada para pasear. Déjala descansar.'
    }, { quoted: msg });
  }

  const happinessGain = 20;
  const energyCost = 25;
  const expGain = CONFIG.exp.walk;

  const newHappiness = Math.min(100, pet.happiness + happinessGain);
  const newEnergy = Math.max(0, pet.energy - energyCost);
  const newExp = pet.exp + expGain;
  const newTimesWalked = pet.stats.timesWalked + 1;

  // Actualizar mascota
  petDB.updatePet(pet.id, {
    happiness: newHappiness,
    energy: newEnergy,
    exp: newExp,
    location: 'walking',
    stats: {
      ...pet.stats,
      timesWalked: newTimesWalked
    }
  });

  cooldownManager.setCooldown(sender, 'walk');

  // Verificar si subió de nivel
  const updatedPet = petDB.getPet(pet.id);
  const leveledUp = checkLevelUp(updatedPet);

  // Programar el regreso a casa
  setTimeout(() => {
    const currentPet = petDB.getPet(pet.id);
    if (currentPet?.location === 'walking') {
      petDB.updatePet(pet.id, { location: 'home' });
    }
  }, 5 * 60 * 1000);

  let response = `🚶 *¡${pet.name} está de paseo!* 🚶\n\n`;
  response += `🌳 *Ubicación:* Paseando por el parque\n`;
  response += `😊 *Felicidad:* +${happinessGain}% (${newHappiness}%)
⚡ *Energía:* -${energyCost}% (${newEnergy}%)
⭐ *Experiencia:* +${expGain} XP

📊 *Total paseos:* ${newTimesWalked}

⏰ Volverá a casa en 5 minutos.`;

  if (leveledUp) {
    response += `\n\n🎉 *¡NIVEL SUBIDO!* 🎉\n¡${pet.name} ahora es nivel ${updatedPet.level}!`;
  }

  await sock.sendMessage(from, { text: response }, { quoted: msg });
}

async function sleepPet(sock, from, sender, msg, args) {
  const userPets = petDB.getUserPets(sender);

  if (userPets.length === 0) {
    return await sock.sendMessage(from, {
      text: '❌ No tienes mascotas para dormir.'
    }, { quoted: msg });
  }

  const pet = userPets[0];

  if (pet.status === 'sleeping') {
    return await sock.sendMessage(from, {
      text: '😴 Tu mascota ya está durmiendo.'
    }, { quoted: msg });
  }

  const cooldown = cooldownManager.getCooldown(sender, 'sleep');
  if (cooldown > 0) {
    return await sock.sendMessage(from, {
      text: `⏰ Espera ${cooldown} minutos antes de dormir de nuevo.`
    }, { quoted: msg });
  }

  const newTimesSlept = pet.stats.timesSlept + 1;

  // Poner a dormir la mascota
  petDB.updatePet(pet.id, {
    status: 'sleeping',
    stats: {
      ...pet.stats,
      timesSlept: newTimesSlept
    }
  });

  cooldownManager.setCooldown(sender, 'sleep');

  // Programar el despertar después de 8 horas
  setTimeout(async () => {
    const currentPet = petDB.getPet(pet.id);
    if (currentPet?.status === 'sleeping') {
      const healthRegen = Math.floor(currentPet.maxHealth * 0.3);
      const energyRegen = 50;

      const updates = {
        status: 'awake',
        health: Math.min(currentPet.maxHealth, currentPet.health + healthRegen),
        energy: Math.min(100, currentPet.energy + energyRegen),
        exp: currentPet.exp + CONFIG.exp.sleep
      };

      petDB.updatePet(pet.id, updates);
      checkLevelUp(petDB.getPet(pet.id));

      const wakeMessage = `🌅 *¡${currentPet.name} se ha despertado!* 🌅\n\n`;
      wakeMessage += `❤️ *Salud regenerada:* +${healthRegen}\n`;
      wakeMessage += `⚡ *Energía regenerada:* +${energyRegen}%\n`;
      wakeMessage += `⭐ *Experiencia por descanso:* +${CONFIG.exp.sleep} XP`;

      for (const owner of currentPet.owners) {
        await sock.sendMessage(owner.includes('@') ? owner : owner + '@s.whatsapp.net', {
          text: wakeMessage
        }).catch(() => {});
      }
    }
  }, 8 * 60 * 60 * 1000);

  const response = `😴 *${pet.name} se fue a dormir* 😴\n\n`;
  response += `💤 *Dormirá por 8 horas*\n`;
  response += `✨ *Al despertar recuperará:*\n`;
  response += `• 30% de salud\n`;
  response += `• 50% de energía\n`;
  response += `• +${CONFIG.exp.sleep} XP\n\n`;
  response += `📊 *Total siestas:* ${newTimesSlept}\n\n`;
  response += `🌅 Se despertará automáticamente.`;

  await sock.sendMessage(from, { text: response }, { quoted: msg });
}

async function careForPet(sock, from, sender, msg, args) {
  const userPets = petDB.getUserPets(sender);

  if (userPets.length === 0) {
    return await sock.sendMessage(from, {
      text: '❌ No tienes mascotas para cuidar.'
    }, { quoted: msg });
  }

  const cooldown = cooldownManager.getCooldown(sender, 'care');
  if (cooldown > 0) {
    return await sock.sendMessage(from, {
      text: `⏰ Espera ${cooldown} minutos antes de cuidar de nuevo.`
    }, { quoted: msg });
  }

  const pet = userPets[0];

  const healthGain = 5;
  const happinessGain = 10;
  const energyGain = 5;
  const expGain = CONFIG.exp.care;

  const newHealth = Math.min(pet.maxHealth, pet.health + healthGain);
  const newHappiness = Math.min(100, pet.happiness + happinessGain);
  const newEnergy = Math.min(100, pet.energy + energyGain);
  const newExp = pet.exp + expGain;

  // Actualizar mascota
  petDB.updatePet(pet.id, {
    health: newHealth,
    happiness: newHappiness,
    energy: newEnergy,
    exp: newExp
  });

  cooldownManager.setCooldown(sender, 'care');

  // Verificar si subió de nivel
  const updatedPet = petDB.getPet(pet.id);
  const leveledUp = checkLevelUp(updatedPet);

  let response = `💝 *Cuidando a ${pet.name}* 💝\n\n`;
  response += `❤️ *Salud:* +${healthGain} (${newHealth}/${pet.maxHealth})
😊 *Felicidad:* +${happinessGain}% (${newHappiness}%)
⚡ *Energía:* +${energyGain}% (${newEnergy}%)
⭐ *Experiencia:* +${expGain} XP\n\n`;
  response += `✨ ${pet.name} se siente amado y cuidado!`;

  if (leveledUp) {
    response += `\n\n🎉 *¡NIVEL SUBIDO!* 🎉\n¡${pet.name} ahora es nivel ${updatedPet.level}!`;
  }

  await sock.sendMessage(from, { text: response }, { quoted: msg });
}

async function requestAdoption(sock, from, sender, msg, args) {
  if (!msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
    return await sock.sendMessage(from, {
      text: '❌ Debes mencionar a la persona. Ejemplo: .mascota solicitar @usuario'
    }, { quoted: msg });
  }

  const mentionedUser = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];

  if (mentionedUser === sender) {
    return await sock.sendMessage(from, {
      text: '❌ No puedes enviarte una solicitud a ti mismo.'
    }, { quoted: msg });
  }

  // Verificar si ya son pareja
  const existingCouple = petDB.getCouple(sender);
  if (existingCouple && existingCouple.users.includes(mentionedUser)) {
    return await sock.sendMessage(from, {
      text: '❌ Ya son pareja.'
    }, { quoted: msg });
  }

  // Verificar si ya existe una solicitud pendiente
  const pendingRequests = petDB.getPendingRequests(mentionedUser);
  const existingRequest = pendingRequests.find(req => req.from === sender);

  if (existingRequest) {
    return await sock.sendMessage(from, {
      text: '❌ Ya enviaste una solicitud a esta persona.'
    }, { quoted: msg });
  }

  // Crear solicitud usando el método de la base de datos
  const request = petDB.createAdoptionRequest(sender, mentionedUser, from);

  const response = `💌 *SOLICITUD DE PAREJA ENVIADA* 💌\n\n`;
  response += `👤 *De:* @${sender.split('@')[0]}\n`;
  response += `👤 *Para:* @${mentionedUser.split('@')[0]}\n\n`;
  response += `📝 *ID de solicitud:* ${request.id}\n`;
  response += `⏰ *Expira en:* 24 horas\n\n`;
  response += `💬 *Para aceptar:*\n`;
  response += `.mascota aceptar ${request.id}\n\n`;
  response += `💬 *Para rechazar:*\n`;
  response += `.mascota rechazar ${request.id}`;

  await sock.sendMessage(from, {
    text: response,
    mentions: [sender, mentionedUser]
  }, { quoted: msg });
}

async function acceptAdoption(sock, from, sender, msg, args) {
  if (args.length < 1) {
    return await sock.sendMessage(from, {
      text: '❌ Uso: .mascota aceptar <id_solicitud>'
    }, { quoted: msg });
  }

  const requestId = args[0];
  const request = petDB.db.adoptionRequests[requestId];

  if (!request) {
    return await sock.sendMessage(from, {
      text: '❌ Solicitud no encontrada o expirada.'
    }, { quoted: msg });
  }

  if (request.to !== sender) {
    return await sock.sendMessage(from, {
      text: '❌ Esta solicitud no es para ti.'
    }, { quoted: msg });
  }

  if (request.status !== 'pending') {
    return await sock.sendMessage(from, {
      text: '❌ Esta solicitud ya fue procesada.'
    }, { quoted: msg });
  }

  const existingCouple = petDB.getCouple(sender);
  if (existingCouple) {
    return await sock.sendMessage(from, {
      text: '❌ Ya tienes una pareja activa.'
    }, { quoted: msg });
  }

  // Crear pareja usando el método de la base de datos
  const couple = petDB.createCouple(request.from, sender);
  request.status = 'accepted';
  petDB.saveDatabase();

  const response = `💕 *¡PAREJA FORMADA!* 💕\n\n`;
  response += `👫 *Pareja:*\n`;
  response += `• @${request.from.split('@')[0]}\n`;
  response += `• @${sender.split('@')[0]}\n\n`;
  response += `💑 *ID de pareja:* ${couple.id}\n`;
  response += `💖 *Puntos de amor:* ${couple.lovePoints}\n`;
  response += `⭐ *Nivel de relación:* ${couple.level}\n\n`;
  response += `✨ *Ahora pueden:*\n`;
  response += `• Compartir mascotas\n`;
  response += `• Tener un hijo juntos\n`;
  response += `• Ganar puntos de amor\n\n`;
  response += `💬 Usa .mascota pareja para ver la info`;

  await sock.sendMessage(from, {
    text: response,
    mentions: [request.from, sender]
  }, { quoted: msg });
}

async function rejectAdoption(sock, from, sender, msg, args) {
  if (args.length < 1) {
    return await sock.sendMessage(from, {
      text: '❌ Uso: .mascota rechazar <id_solicitud>'
    }, { quoted: msg });
  }

  const requestId = args[0];
  const request = petDB.db.adoptionRequests[requestId];

  if (!request || request.to !== sender || request.status !== 'pending') {
    return await sock.sendMessage(from, {
      text: '❌ Solicitud no válida.'
    }, { quoted: msg });
  }

  request.status = 'rejected';
  petDB.saveDatabase();

  await sock.sendMessage(from, {
    text: '❌ Has rechazado la solicitud de pareja.'
  }, { quoted: msg });
}

async function createChild(sock, from, sender, msg, args) {
  const couple = petDB.getCouple(sender);

  if (!couple) {
    return await sock.sendMessage(from, {
      text: '❌ No tienes una pareja. Usa .mascota solicitar @usuario'
    }, { quoted: msg });
  }

  if (args.length < 1) {
    return await sock.sendMessage(from, {
      text: '❌ Uso: .mascota hijo <nombre>\nEjemplo: .mascota hijo Alex'
    }, { quoted: msg });
  }

  const childName = args.join(' ');

  if (couple.petId) {
    return await sock.sendMessage(from, {
      text: '❌ Ya tienen una mascota/hijo juntos.'
    }, { quoted: msg });
  }

  const childPet = petDB.createPet(couple.users[0], childName, 'random');
  
  // Agregar al segundo dueño
  childPet.owners.push(couple.users[1]);
  
  // Actualizar la mascota con ambos dueños
  petDB.updatePet(childPet.id, {
    owners: childPet.owners
  });
  
  // Actualizar la pareja
  couple.petId = childPet.id;
  couple.lovePoints += 100;
  petDB.db.couples[couple.id] = couple;
  
  petDB.saveDatabase();

  const petType = petDB.db.petTypes[childPet.type];
  const otherUser = couple.users.find(u => u !== sender);

  const response = `👶 *¡HAN TENIDO UN HIJO!* 👶\n\n`;
  response += `📛 *Nombre:* ${childPet.name}\n`;
  response += `${petType.name} (Hijo especial)\n\n`;
  response += `👨‍👩‍👦 *Padres:*\n`;
  response += `• @${sender.split('@')[0]}\n`;
  response += `• @${otherUser.split('@')[0]}\n\n`;
  response += `💖 *Puntos de amor:* +100\n`;
  response += `⭐ *Nivel de relación:* ${couple.level}\n\n`;
  response += `✨ *Ahora pueden cuidar juntos a ${childPet.name}*`;

  await sock.sendMessage(from, {
    text: response,
    mentions: [sender, otherUser]
  }, { quoted: msg });
}

async function showShop(sock, from, sender, msg) {
  const db = cargarDatabase();
  const user = db.users[sender];

  if (!user) {
    return await sock.sendMessage(from, {
      text: '❌ Primero debes registrarte en el bot.'
    }, { quoted: msg });
  }

  let shopText = `🛒 *TIENDA DE MASCOTAS* 🛒\n\n`;
  shopText += `💰 *Tus pandacoins:* ${user.pandacoins?.toLocaleString() || 0}\n\n`;

  shopText += `🍎 *COMIDA:*\n`;
  for (const [key, item] of Object.entries(petDB.db.foodItems)) {
    shopText += `• ${item.name}: ${item.price} coins\n`;
    shopText += `  (+${item.health}❤️ +${item.happiness}😊 -${Math.abs(item.hunger)}🍖)\n`;
  }

  shopText += `\n🧸 *JUGUETES:*\n`;
  for (const [key, item] of Object.entries(petDB.db.toyItems)) {
    shopText += `• ${item.name}: ${item.price} coins\n`;
    shopText += `  (+${item.happiness}😊 ${item.durability} usos)\n`;
  }

  shopText += `\n🎯 *OTROS:*\n`;
  shopText += `• Cambiar nombre: ${CONFIG.prices.rename.toLocaleString()} coins\n`;
  shopText += `• Adopción especial: ${CONFIG.prices.adopt.toLocaleString()} coins\n`;

  shopText += `\n💬 *Para comprar:*\n`;
  shopText += `.mascota comprar <item> <cantidad>\n`;
  shopText += `Ejemplo: .mascota comprar apple 3`;

  await sock.sendMessage(from, { text: shopText }, { quoted: msg });
}

async function buyItem(sock, from, sender, msg, args) {
  if (args.length < 1) {
    return await sock.sendMessage(from, {
      text: '❌ Uso: .mascota comprar <item> [cantidad]\nEjemplo: .mascota comprar apple 2'
    }, { quoted: msg });
  }

  const itemName = args[0].toLowerCase();
  const quantity = parseInt(args[1]) || 1;

  const db = cargarDatabase();
  const user = db.users[sender];

  if (!user) {
    return await sock.sendMessage(from, {
      text: '❌ Primero debes registrarte en el bot.'
    }, { quoted: msg });
  }

  let item, price;

  if (petDB.db.foodItems[itemName]) {
    item = petDB.db.foodItems[itemName];
    price = item.price * quantity;
  } else if (petDB.db.toyItems[itemName]) {
    item = petDB.db.toyItems[itemName];
    price = item.price * quantity;
  } else {
    return await sock.sendMessage(from, {
      text: `❌ Item no encontrado. Usa .mascota tienda para ver items disponibles.`
    }, { quoted: msg });
  }

  if (user.pandacoins < price) {
    return await sock.sendMessage(from, {
      text: `❌ No tienes suficiente dinero.\n💰 Necesitas: ${price.toLocaleString()} coins\n💰 Tienes: ${user.pandacoins.toLocaleString()} coins`
    }, { quoted: msg });
  }

  const userPets = petDB.getUserPets(sender);
  if (userPets.length === 0) {
    return await sock.sendMessage(from, {
      text: '❌ No tienes mascotas. Adopta una primero.'
    }, { quoted: msg });
  }

  const pet = userPets[0];
  user.pandacoins -= price;

  let inventoryUpdates = {};
  if (petDB.db.foodItems[itemName]) {
    const currentCount = pet.inventory.food?.[itemName] || 0;
    inventoryUpdates = {
      food: {
        ...pet.inventory.food,
        [itemName]: currentCount + quantity
      }
    };
  } else if (petDB.db.toyItems[itemName]) {
    const currentCount = pet.inventory.toys?.[itemName] || 0;
    inventoryUpdates = {
      toys: {
        ...pet.inventory.toys,
        [itemName]: currentCount + quantity
      }
    };
  }

  // Actualizar inventario de la mascota
  petDB.updatePet(pet.id, {
    inventory: {
      ...pet.inventory,
      ...inventoryUpdates
    }
  });

  guardarDatabase(db);

  const response = `🛒 *COMPRA EXITOSA* 🛒\n\n`;
  response += `📦 *Item:* ${item.name} x${quantity}\n`;
  response += `💰 *Precio:* ${price.toLocaleString()} coins\n`;
  response += `💳 *Saldo restante:* ${user.pandacoins.toLocaleString()} coins\n\n`;
  response += `📥 *Ahora tienes:*\n`;

  const updatedPet = petDB.getPet(pet.id);
  if (petDB.db.foodItems[itemName]) {
    response += `${item.name}: ${updatedPet.inventory.food?.[itemName] || 0} unidades\n`;
  } else {
    response += `${item.name}: ${updatedPet.inventory.toys?.[itemName] || 0} unidades\n`;
  }

  response += `\n🎮 Usa .mascota alimentar ${itemName} para usar`;

  await sock.sendMessage(from, { text: response }, { quoted: msg });
}

async function renamePet(sock, from, sender, msg, args) {
  if (args.length < 1) {
    return await sock.sendMessage(from, {
      text: '❌ Uso: .mascota renombrar <nuevo_nombre>'
    }, { quoted: msg });
  }

  const newName = args.join(' ');
  const db = cargarDatabase();
  const user = db.users[sender];

  if (!user) {
    return await sock.sendMessage(from, {
      text: '❌ Primero debes registrarte en el bot.'
    }, { quoted: msg });
  }

  if (user.pandacoins < CONFIG.prices.rename) {
    return await sock.sendMessage(from, {
      text: `❌ No tienes suficiente dinero.\n💰 Necesitas: ${CONFIG.prices.rename.toLocaleString()} coins`
    }, { quoted: msg });
  }

  const userPets = petDB.getUserPets(sender);
  if (userPets.length === 0) {
    return await sock.sendMessage(from, {
      text: '❌ No tienes mascotas para renombrar.'
    }, { quoted: msg });
  }

  const pet = userPets[0];
  const oldName = pet.name;

  user.pandacoins -= CONFIG.prices.rename;
  
  // Renombrar la mascota
  petDB.updatePet(pet.id, {
    name: newName
  });
  
  guardarDatabase(db);

  const response = `✏️ *¡MASCOTA RENOMBRADA!* ✏️\n\n`;
  response += `📛 *Nombre anterior:* ${oldName}\n`;
  response += `📛 *Nuevo nombre:* ${newName}\n`;
  response += `💰 *Costo:* ${CONFIG.prices.rename.toLocaleString()} coins\n`;
  response += `💳 *Saldo restante:* ${user.pandacoins.toLocaleString()} coins\n\n`;
  response += `✨ ¡Ahora ${newName} tiene un nuevo nombre!`;

  await sock.sendMessage(from, { text: response }, { quoted: msg });
}

async function abandonPet(sock, from, sender, msg, args) {
  const userPets = petDB.getUserPets(sender);
  
  if (userPets.length === 0) {
    return await sock.sendMessage(from, {
      text: '❌ No tienes mascotas para abandonar.'
    }, { quoted: msg });
  }

  const pet = userPets[0];

  if (pet.owners.length > 1) {
    // Remover solo a este dueño
    const newOwners = pet.owners.filter(owner => owner !== sender);
    
    petDB.updatePet(pet.id, {
      owners: newOwners
    });

    const response = `👋 *Has dejado de cuidar a ${pet.name}* 👋\n\n`;
    response += `📛 *Mascota:* ${pet.name}\n`;
    response += `👥 *Dueños restantes:* ${newOwners.length}\n`;
    response += `💔 Ya no eres responsable de esta mascota.\n\n`;
    response += `✨ La mascota seguirá con sus otros dueños.`;
    
    await sock.sendMessage(from, { text: response }, { quoted: msg });
  } else {
    // Eliminar completamente la mascota
    delete petDB.db.pets[pet.id];
    petDB.db.petStats.totalPets--;
    petDB.saveDatabase();

    const response = `💔 *Has abandonado a ${pet.name}* 💔\n\n`;
    response += `📛 *Mascota:* ${pet.name}\n`;
    response += `⭐ *Nivel alcanzado:* ${pet.level}\n`;
    response += `📅 *Tiempo juntos:* ${Math.floor((Date.now() - new Date(pet.birthDate)) / (1000 * 60 * 60 * 24))} días\n\n`;
    response += `😢 ${pet.name} ha sido enviado a un buen hogar.\n`;
    response += `✨ Puedes adoptar otra mascota cuando quieras.`;

    await sock.sendMessage(from, { text: response }, { quoted: msg });
  }
}

async function showTopPets(sock, from, msg) {
  const stats = petDB.getGlobalStats();

  let topText = `🏆 *TOP 10 MASCOTAS* 🏆\n\n`;
  topText += `📊 *Total mascotas:* ${stats.totalPets}\n`;
  topText += `💕 *Total parejas:* ${stats.totalCouples}\n\n`;

  if (stats.topPets.length === 0) {
    topText += `📭 Aún no hay mascotas registradas.`;
  } else {
    stats.topPets.forEach((pet, index) => {
      const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
      const petType = petDB.db.petTypes[pet.type];
      topText += `${emoji} *${pet.name}* ${petType.name}\n`;
      topText += `   ⭐ Nivel ${pet.level} | 👥 ${pet.owners.length} dueño(s)\n`;
    });
  }

  topText += `\n💬 Usa .mascota crear <nombre> para unirte al ranking!`;

  await sock.sendMessage(from, { text: topText }, { quoted: msg });
}

async function coupleInfo(sock, from, sender, msg) {
  const couple = petDB.getCouple(sender);

  if (!couple) {
    return await sock.sendMessage(from, {
      text: '❌ No tienes una pareja. Usa .mascota solicitar @usuario'
    }, { quoted: msg });
  }

  const otherUser = couple.users.find(u => u !== sender);
  const togetherDays = Math.floor((Date.now() - new Date(couple.createdAt)) / (1000 * 60 * 60 * 24));

  let response = `💑 *INFORMACIÓN DE PAREJA* 💑\n\n`;
  response += `👫 *Pareja:*\n`;
  response += `• @${sender.split('@')[0]}\n`;
  response += `• @${otherUser.split('@')[0]}\n\n`;
  response += `💖 *Puntos de amor:* ${couple.lovePoints}\n`;
  response += `⭐ *Nivel de relación:* ${couple.level}\n`;
  response += `📅 *Juntos desde:* ${togetherDays} días\n\n`;

  if (couple.petId) {
    const pet = petDB.getPet(couple.petId);
    if (pet) {
      response += `👶 *Hijo/Mascota compartida:*\n`;
      response += `🐾 ${pet.name} - Nivel ${pet.level}\n\n`;
    }
  }

  response += `✨ *Para tener un hijo:*\n`;
  response += `.mascota hijo <nombre>\n\n`;
  response += `💕 ¡Sigan acumulando puntos de amor!`;

  await sock.sendMessage(from, {
    text: response,
    mentions: [sender, otherUser]
  }, { quoted: msg });
}

async function showStats(sock, from, sender, msg) {
  const stats = petDB.getGlobalStats();
  const userPets = petDB.getUserPets(sender);

  let response = `📊 *ESTADÍSTICAS DEL SISTEMA* 📊\n\n`;
  response += `🐾 *Mascotas totales:* ${stats.totalPets}\n`;
  response += `💕 *Parejas formadas:* ${stats.totalCouples}\n`;
  response += `🎯 *Tus mascotas:* ${userPets.length}/3\n\n`;

  if (userPets.length > 0) {
    response += `🏆 *Tus mejores mascotas:*\n`;
    userPets.sort((a, b) => b.level - a.level).slice(0, 3).forEach((pet, i) => {
      response += `${i + 1}. ${pet.name} - Nivel ${pet.level}\n`;
    });
  }

  response += `\n💬 ¡Sigue cuidando a tus mascotas para subir en el ranking!`;

  await sock.sendMessage(from, { text: response }, { quoted: msg });
}

function checkLevelUp(pet) {
  if (pet.exp >= pet.expToNextLevel) {
    const newLevel = pet.level + 1;
    const newExp = pet.exp - pet.expToNextLevel;
    const newExpToNextLevel = Math.floor(pet.expToNextLevel * 1.5);
    const newMaxHealth = pet.maxHealth + Math.floor(pet.maxHealth * 0.1);
    
    petDB.updatePet(pet.id, {
      level: newLevel,
      exp: newExp,
      expToNextLevel: newExpToNextLevel,
      maxHealth: newMaxHealth,
      health: newMaxHealth,
      happiness: Math.min(100, pet.happiness + 5)
    });
    
    return true;
  }
  return false;
}
