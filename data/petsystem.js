// data/petsystem.js
import fs from 'fs';
import path from 'path';

const DB_PATH = './data/petsystem.json';

class PetSystemDB {
  constructor() {
    this.loadDatabase();
    this.initializeDefaultData();
  }

  loadDatabase() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        this.db = JSON.parse(data);
      } else {
        this.db = {
          pets: {},
          couples: {},
          adoptionRequests: {},
          petStats: {
            totalPets: 0,
            totalCouples: 0,
            topPets: []
          }
        };
        this.saveDatabase();
      }
    } catch (error) {
      console.error('Error loading pet database:', error);
      this.db = {
        pets: {},
        couples: {},
        adoptionRequests: {},
        petStats: {
          totalPets: 0,
          totalCouples: 0,
          topPets: []
        }
      };
    }
  }

  saveDatabase() {
    try {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_PATH, JSON.stringify(this.db, null, 2));
    } catch (error) {
      console.error('Error saving pet database:', error);
    }
  }

  initializeDefaultData() {
    if (!this.db.petTypes) {
      this.db.petTypes = {
        dragon: { name: '🐉 Dragón', rarity: 'legendary', baseStats: { health: 100, happiness: 80, hunger: 50 } },
        unicorn: { name: '🦄 Unicornio', rarity: 'epic', baseStats: { health: 90, happiness: 90, hunger: 40 } },
        phoenix: { name: '🔥 Fénix', rarity: 'epic', baseStats: { health: 85, happiness: 85, hunger: 45 } },
        wolf: { name: '🐺 Lobo', rarity: 'rare', baseStats: { health: 80, happiness: 75, hunger: 60 } },
        cat: { name: '🐱 Gato', rarity: 'common', baseStats: { health: 70, happiness: 80, hunger: 70 } },
        dog: { name: '🐶 Perro', rarity: 'common', baseStats: { health: 75, happiness: 85, hunger: 65 } },
        fox: { name: '🦊 Zorro', rarity: 'uncommon', baseStats: { health: 65, happiness: 70, hunger: 75 } },
        rabbit: { name: '🐰 Conejo', rarity: 'uncommon', baseStats: { health: 60, happiness: 85, hunger: 80 } },
        bird: { name: '🐦 Pájaro', rarity: 'common', baseStats: { health: 55, happiness: 75, hunger: 85 } },
        hamster: { name: '🐹 Hámster', rarity: 'common', baseStats: { health: 50, happiness: 90, hunger: 90 } }
      };
    }

    if (!this.db.foodItems) {
      this.db.foodItems = {
        apple: { name: '🍎 Manzana', health: 10, happiness: 5, hunger: -20, price: 100 },
        meat: { name: '🥩 Carne', health: 15, happiness: 10, hunger: -30, price: 200 },
        fish: { name: '🐟 Pescado', health: 12, happiness: 8, hunger: -25, price: 150 },
        carrot: { name: '🥕 Zanahoria', health: 8, happiness: 3, hunger: -15, price: 80 },
        cake: { name: '🍰 Pastel', health: 5, happiness: 20, hunger: -10, price: 300 },
        bone: { name: '🦴 Hueso', health: 20, happiness: 15, hunger: -35, price: 250 },
        milk: { name: '🥛 Leche', health: 7, happiness: 12, hunger: -18, price: 120 }
      };
    }

    if (!this.db.toyItems) {
      this.db.toyItems = {
        ball: { name: '⚽ Pelota', happiness: 15, durability: 10, price: 150 },
        doll: { name: '🧸 Muñeco', happiness: 20, durability: 15, price: 250 },
        rope: { name: '🪢 Cuerda', happiness: 10, durability: 20, price: 100 },
        frisbee: { name: '🥏 Frisbee', happiness: 18, durability: 12, price: 200 },
        puzzle: { name: '🧩 Rompecabezas', happiness: 25, durability: 8, price: 350 }
      };
    }

    this.saveDatabase();
  }

  // Métodos para mascotas
  createPet(userId, petName, petType = 'random') {
    const petId = `pet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let selectedType = petType;
    if (petType === 'random') {
      const types = Object.keys(this.db.petTypes);
      selectedType = types[Math.floor(Math.random() * types.length)];
    }

    const baseStats = this.db.petTypes[selectedType].baseStats;
    
    const newPet = {
      id: petId,
      name: petName,
      type: selectedType,
      owners: [userId],
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      health: baseStats.health,
      maxHealth: baseStats.health,
      happiness: baseStats.happiness,
      hunger: baseStats.hunger,
      energy: 100,
      birthDate: new Date().toISOString(),
      lastInteraction: new Date().toISOString(),
      status: 'awake',
      location: 'home',
      inventory: {
        food: {},
        toys: {}
      },
      stats: {
        timesFed: 0,
        timesPlayed: 0,
        timesWalked: 0,
        timesSlept: 0,
        totalExp: 0
      }
    };

    this.db.pets[petId] = newPet;
    this.db.petStats.totalPets++;
    this.saveDatabase();
    return newPet;
  }

  getPet(petId) {
    return this.db.pets[petId];
  }

  getUserPets(userId) {
    return Object.values(this.db.pets).filter(pet => 
      pet.owners.includes(userId)
    );
  }

  updatePet(petId, updates) {
    if (this.db.pets[petId]) {
      Object.assign(this.db.pets[petId], updates);
      this.db.pets[petId].lastInteraction = new Date().toISOString();
      this.saveDatabase();
      return true;
    }
    return false;
  }

  // Métodos para parejas
  createCouple(user1, user2, petId = null) {
    const coupleId = `couple_${Date.now()}`;
    
    const newCouple = {
      id: coupleId,
      users: [user1, user2],
      petId: petId,
      lovePoints: 0,
      level: 1,
      createdAt: new Date().toISOString(),
      lastInteraction: new Date().toISOString(),
      status: 'active'
    };

    this.db.couples[coupleId] = newCouple;
    this.db.petStats.totalCouples++;
    
    // Si tienen mascota, agregar al segundo dueño
    if (petId && this.db.pets[petId]) {
      if (!this.db.pets[petId].owners.includes(user2)) {
        this.db.pets[petId].owners.push(user2);
      }
    }

    this.saveDatabase();
    return newCouple;
  }

  getCouple(userId) {
    return Object.values(this.db.couples).find(couple => 
      couple.users.includes(userId) && couple.status === 'active'
    );
  }

  // Métodos para solicitudes
  createAdoptionRequest(fromUser, toUser, groupId) {
    const requestId = `req_${Date.now()}`;
    
    const request = {
      id: requestId,
      from: fromUser,
      to: toUser,
      groupId: groupId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 horas
    };

    this.db.adoptionRequests[requestId] = request;
    this.saveDatabase();
    return request;
  }

  getPendingRequests(userId) {
    return Object.values(this.db.adoptionRequests).filter(
      req => req.to === userId && req.status === 'pending'
    );
  }

  // Métodos para estadísticas
  updateTopPets() {
    const allPets = Object.values(this.db.pets);
    this.db.petStats.topPets = allPets
      .sort((a, b) => b.level - a.level || b.exp - a.exp)
      .slice(0, 10)
      .map(pet => ({
        id: pet.id,
        name: pet.name,
        type: pet.type,
        level: pet.level,
        owners: pet.owners
      }));
    this.saveDatabase();
  }

  getGlobalStats() {
    this.updateTopPets();
    return this.db.petStats;
  }
}

export const petDB = new PetSystemDB();
