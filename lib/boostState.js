const efectosBoost = {};
const suerteTimeouts = {};
const expiraciones = {};

export function getEfectosBoost() {
  return efectosBoost;
}

export function getSuerteMultiplicador() {
  return efectosBoost['general'] || 1;
}

export { efectosBoost, suerteTimeouts, expiraciones };
