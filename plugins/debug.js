export const command = 'debug';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  
  let debugInfo = '🔧 *DIAGNÓSTICO DEL BOT*\n\n';
  
  try {
    // Verificar si los módulos están cargados
    const modules = {
      'activate': await import('./activate.js').catch(e => ({ error: e.message })),
      'buy': await import('./buy.js').catch(e => ({ error: e.message })),
      'spawn': await import('./spawn.js').catch(e => ({ error: e.message }))
    };
    
    debugInfo += '*📦 MÓDULOS CARGADOS:*\n';
    for (const [name, module] of Object.entries(modules)) {
      if (module.error) {
        debugInfo += `❌ ${name}: ${module.error}\n`;
      } else if (module.command) {
        debugInfo += `✅ ${name}: ${module.command}\n`;
      } else {
        debugInfo += `⚠️ ${name}: Sin command export\n`;
      }
    }
    
    debugInfo += '\n*🔄 CICLOS DE DEPENDENCIA:*\n';
    
    // Verificar imports
    const activateCode = await import('fs').then(fs => 
      fs.readFileSync('./plugins/activate.js', 'utf8')
    );
    const buyCode = await import('fs').then(fs => 
      fs.readFileSync('./plugins/buy.js', 'utf8')
    );
    
    if (activateCode.includes("from './buy.js'")) {
      debugInfo += `🔗 activate.js → importa → buy.js\n`;
    }
    if (buyCode.includes("from './activate.js'")) {
      debugInfo += `🔗 buy.js → importa → activate.js ← ¡CICLO DETECTADO!\n`;
    }
    
  } catch (error) {
    debugInfo += `❌ Error en diagnóstico: ${error.message}\n`;
  }
  
  await sock.sendMessage(from, { text: debugInfo }, { quoted: msg });
}
