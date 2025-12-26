import { cargarDatabase } from '../data/database.js';
import { cargarDatos } from '../lib/cacheManager.js'; // Usar caché centralizada

export const command = 'misps';

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const db = cargarDatabase();
    db.users = db.users || {};
    const user = db.users[sender];

    if (!user) {
        await sock.sendMessage(from, { text: '❌ No estás registrado. Usa minar para empezar.' });
        return;
    }

    user.personajes = user.personajes || [];

    if (user.personajes.length === 0) {
        await sock.sendMessage(from, { 
            text: '📦 No tienes personajes aún.\n\n💡 Compra uno con:\n• `.buy2 <nombre>`\n• `.buy2 random`\n• `.buy2 Spooky Lucky Block`' 
        });
        return;
    }

    
    const { personajes } = cargarDatos();

    
    const userCharacters = user.personajes
        .map(pName => {
            const clave = String(pName).toLowerCase().trim();
            // 1) exact nombre
            let found = personajes.find(p => p.nombre && p.nombre.toLowerCase() === clave);
            if (found) return found;
            // 2) base exact without efectos
            found = personajes.find(p => p.base && p.base.toLowerCase() === clave && (!p.efectos || p.efectos.length === 0));
            if (found) return found;
            // 3) any base match
            found = personajes.find(p => p.base && p.base.toLowerCase() === clave);
            if (found) return found;
            // 4) fallback: nombre includes
            found = personajes.find(p => p.nombre && p.nombre.toLowerCase().includes(clave));
            return found;
        })
        .filter(p => p !== undefined);

    
    const personajesNormales = userCharacters.filter(p => !p.nombre.toLowerCase().includes("lucky block"));
    const luckyBlocks = userCharacters.filter(p => p.nombre.toLowerCase().includes("lucky block"));

    
    personajesNormales.sort((a, b) => b.precio - a.precio);
    luckyBlocks.sort((a, b) => b.precio - a.precio);

    let texto = `🐼 *Tus Personajes* 🐼\n\n`;

    
    const valorTotal = userCharacters.reduce((sum, p) => sum + (p.precio || 0), 0);
    const alineados = Object.values(user.alineacion?.posiciones || {}).length;
    
    texto += `📊 *Estadísticas:*\n`;
    texto += `• Total: ${userCharacters.length} personajes\n`;
    texto += `• Valor total: ${valorTotal.toLocaleString()} 🐼\n`;
    texto += `• Alineados: ${alineados}\n`;
    texto += `• Lucky Blocks: ${luckyBlocks.length}\n\n`;

    
    if (personajesNormales.length > 0) {
        texto += `🎯 *Personajes (${personajesNormales.length}):*\n`;
        
        const mostrar = personajesNormales.slice(0, 50);
        mostrar.forEach((p, index) => {
            const efectosText = p.efectos && p.efectos.length > 0 ? ` ${p.efectos.join(' ')}` : '';
            const alineado = user.alineacion && Object.values(user.alineacion.posiciones || {}).includes(p.nombre) ? ' ⚽' : '';
            texto += `${index + 1}. *${p.nombre}* (${p.calidad})${efectosText} – 💰 ${p.precio.toLocaleString()} 🐼${alineado}\n`;
        });

        if (personajesNormales.length > 50) {
            texto += `\n... y ${personajesNormales.length - 50} personajes más\n`;
            texto += `💡 Usa \`.misps <nombre>\` para buscar un personaje específico`;
        }
    }

 
    if (luckyBlocks.length > 0) {
        texto += `\n🎁 *Lucky Blocks (${luckyBlocks.length}):*\n`;
        luckyBlocks.forEach((lb, index) => {
            texto += `${index + 1}. *${lb.nombre}* – 💰 ${lb.precio.toLocaleString()} 🐼\n`;
        });
        
        texto += `\n💡 Usa \`.open <nombre>\` para abrir tus Lucky Blocks`;
    }

   
    if (args.length > 0) {
        const busqueda = args.join(' ').toLowerCase();
        const encontrados = userCharacters.filter(p => 
            p.nombre.toLowerCase().includes(busqueda)
        );

        if (encontrados.length > 0) {
            texto = `🔍 *Resultados para "${args.join(' ')}":*\n\n`;
            encontrados.forEach((p, index) => {
                const efectosText = p.efectos && p.efectos.length > 0 ? ` ${p.efectos.join(' ')}` : '';
                const alineado = user.alineacion && Object.values(user.alineacion.posiciones || {}).includes(p.nombre) ? ' ⚽' : '';
                texto += `${index + 1}. *${p.nombre}* (${p.calidad})${efectosText}\n`;
                texto += `   💰 ${p.precio.toLocaleString()} 🐼${alineado}\n\n`;
            });
            
            texto += `📝 Encontrados: ${encontrados.length} personaje(s)`;
        } else {
            texto = `❌ No se encontraron personajes que coincidan con "*${args.join(' ')}*"`;
        }
    }

    await sock.sendMessage(from, { text: texto }, { quoted: msg });
}
