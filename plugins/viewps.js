import fs from 'fs';
import { cargarStock } from './addstock.js';

const data = JSON.parse(fs.readFileSync('./data/personajes.json', 'utf8'));
const personajes = data.characters;

export const command = 'viewps';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const stock = cargarStock();

  // Filtrar personajes sin efectos
  const personajesNormales = personajes.filter(p => !p.efectos);

  // Paginación: 30 por página
  const pagina = args[0] ? parseInt(args[0]) : 1;
  const porPagina = 30;
  const totalPaginas = Math.ceil(personajesNormales.length / porPagina);

  if (isNaN(pagina) || pagina < 1 || pagina > totalPaginas) {
    await sock.sendMessage(from, { text: `❌ Página inválida. Usa un número entre 1 y ${totalPaginas}.` }, { quoted: msg });
    return;
  }

  const inicio = (pagina - 1) * porPagina;
  const fin = inicio + porPagina;
  const personajesPagina = personajesNormales.slice(inicio, fin);

  const ahora = Date.now();
  const lista = personajesPagina.map((p, idx) => {
    const nombreKey = p.nombre.toLowerCase();
    const itemStock = stock[nombreKey];
    let stockInfo = '⚠️ Sin stock registrado';

    if (itemStock) {
      const cantidad = itemStock.cantidad;
      const tiempoRestante = Math.max(0, (itemStock.ultimoReset + (30 * 60 * 1000)) - ahora); // reset cada 30 min
      const minutos = Math.floor(tiempoRestante / 60000);
      const segundos = Math.floor((tiempoRestante % 60000) / 1000);
      stockInfo = `📦 Unidades: ${cantidad}\n⏳ Reset en: ${minutos}m ${segundos}s`;
    }

    return `${inicio + idx + 1}. ✨ *${p.nombre}* [${p.calidad}]\n💰 ${p.precio.toLocaleString()} Pandacoins\n📝 ${p.descripcion}\n${stockInfo}\n`;
  }).join('\n');

  const texto = `🎭 *Personajes disponibles (Página ${pagina}/${totalPaginas}):*\n\n${lista}\n\nPara comprar: *.buy NombrePersonaje*\nUsa *.viewps <número de página>* para ver más.`;

  await sock.sendMessage(from, { text: texto }, { quoted: msg });
}
