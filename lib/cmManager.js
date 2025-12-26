export function ensureCMUser(user) {
  if (!global.cmDB) global.cmDB = {};

  const defaults = {
    name: '',
    spins: 5,
    coins: 0,
    shields: 0,
    villageLevel: 1,
    creditos: 0
  };

  if (!global.cmDB[user] || typeof global.cmDB[user] !== 'object') {
    global.cmDB[user] = { ...defaults };
  }

  const u = global.cmDB[user];


  u.spins = Number(u.spins) || 0;
  u.coins = Number(u.coins) || 0;
  u.shields = Number(u.shields) || 0;
  u.villageLevel = Number(u.villageLevel) || 1;
  u.creditos = Number(u.creditos) || 0;

  if (!('name' in u)) u.name = '';

  return u;
}

export function saveCM() {
  if (typeof global.guardarCM === 'function') global.guardarCM();
}
