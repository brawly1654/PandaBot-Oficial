import fs from 'fs';
import path from 'path';

// Archivo donde guardaremos las prohibiciones
const PROHIBITIONS_FILE = './data/prohibiciones.json';

// Cargar prohibiciones
function cargarProhibiciones() {
  if (!fs.existsSync(PROHIBITIONS_FILE)) {
    fs.writeFileSync(PROHIBITIONS_FILE, JSON.stringify({}, null, 2));
    return {};
  }
  return JSON.parse(fs.readFileSync(PROHIBITIONS_FILE, 'utf8'));
}

// Guardar prohibiciones
function guardarProhibiciones(data) {
  fs.writeFileSync(PROHIBITIONS_FILE, JSON.stringify(data, null, 2));
}

// Añadir prohibición
function prohibirComando(usuario, comando, horas) {
  const prohibiciones = cargarProhibiciones();
  
  if (!prohibiciones[usuario]) {
    prohibiciones[usuario] = {};
  }
  
  const tiempoExpiracion = Date.now() + (horas * 3600000); // horas a milisegundos
  
  prohibiciones[usuario][comando] = {
    tiempoExpiracion,
    fechaProhibicion: new Date().toISOString(),
    horasProhibido: horas,
    comando
  };
  
  guardarProhibiciones(prohibiciones);
  return prohibiciones[usuario][comando];
}

// Verificar si un comando está prohibido para un usuario
export function verificarComandoProhibido(usuario, comando) {
  const prohibiciones = cargarProhibiciones();
  
  if (!prohibiciones[usuario] || !prohibiciones[usuario][comando]) {
    return false;
  }
  
  const prohibicion = prohibiciones[usuario][comando];
  
  // Verificar si la prohibición ya expiró
  if (Date.now() > prohibicion.tiempoExpiracion) {
    // Eliminar prohibición expirada
    delete prohibiciones[usuario][comando];
    
    // Si no hay más prohibiciones para este usuario, eliminar la entrada
    if (Object.keys(prohibiciones[usuario]).length === 0) {
      delete prohibiciones[usuario];
    }
    
    guardarProhibiciones(prohibiciones);
    return false;
  }
  
  return {
    prohibido: true,
    tiempoRestante: prohibicion.tiempoExpiracion - Date.now(),
    horasProhibido: prohibicion.horasProhibido,
    comando: prohibicion.comando
  };
}

// Listar prohibiciones de un usuario
function listarProhibicionesUsuario(usuario) {
  const prohibiciones = cargarProhibiciones();
  return prohibiciones[usuario] || {};
}

// Eliminar prohibición específica
function eliminarProhibicion(usuario, comando) {
  const prohibiciones = cargarProhibiciones();
  
  if (prohibiciones[usuario] && prohibiciones[usuario][comando]) {
    delete prohibiciones[usuario][comando];
    
    if (Object.keys(prohibiciones[usuario]).length === 0) {
      delete prohibiciones[usuario];
    }
    
    guardarProhibiciones(prohibiciones);
    return true;
  }
  
  return false;
}

// Obtener todos los plugins disponibles
function obtenerPluginsDisponibles() {
  const pluginsPath = path.join(process.cwd(), 'plugins');
  const archivosPlugins = fs.readdirSync(pluginsPath).filter(f => f.endsWith('.js'));
  const comandos = [];
  
  for (const archivo of archivosPlugins) {
    try {
      const filePath = path.join(pluginsPath, archivo);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Buscar export const command = 'comando'
      const commandMatch = fileContent.match(/export\s+const\s+command\s*=\s*['"`]([^'"`]+)['"`]/);
      if (commandMatch) {
        comandos.push(commandMatch[1]);
      }
    } catch (error) {
      // Ignorar errores de lectura
    }
  }
  
  return comandos;
}

// EL COMANDO PRINCIPAL
export const command = 'prohibir';
export const aliases = ['bancommand', 'blockcmd'];
export const description = 'Prohibir un comando a un usuario';
export const category = 'admin';
export const usage = '.prohibir <comando> @usuario <horas>';
export const ownerOnly = true;

// FUNCIÓN RUN PRINCIPAL
export async function run(sock, msg, args) {
  try {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    
    // Validar argumentos
    if (args.length < 3) {
      return await sock.sendMessage(from, {
        text: `⚠️ *USO INCORRECTO*\n━━━━━━━━━━━━━━━━\nUso: .prohibir <comando> @usuario <horas>\nEjemplo: .prohibir delete @usuario 24\n━━━━━━━━━━━━━━━━\n💡 Prohíbe un comando por horas específicas.`,
        mentions: isGroup ? [sender] : []
      });
    }
    
    const comando = args[0].toLowerCase().replace(/^\./, ''); // Quitar el punto si lo tiene
    const mencion = args[1];
    const horas = parseInt(args[2]);
    
    // Validar horas
    if (isNaN(horas) || horas < 1 || horas > 720) {
      return await sock.sendMessage(from, {
        text: `⚠️ *HORAS INVÁLIDAS*\n━━━━━━━━━━━━━━━━\nLas horas deben ser entre 1 y 720 (30 días).\n━━━━━━━━━━━━━━━━\n💡 Ejemplo: .prohibir comando @usuario 24`,
        mentions: isGroup ? [sender] : []
      });
    }
    
    // Extraer el usuario mencionado
    let usuarioMencionado = '';
    
    if (mencion.includes('@s.whatsapp.net')) {
      usuarioMencionado = mencion;
    } else if (mencion.includes('@')) {
      // Es una mención en el texto
      const numero = mencion.replace('@', '').replace(/[^\d]/g, '');
      if (numero) {
        usuarioMencionado = numero + '@s.whatsapp.net';
      }
    } else {
      // Asumir que es un número
      const numeroLimpio = mencion.replace(/[^\d]/g, '');
      if (numeroLimpio) {
        usuarioMencionado = numeroLimpio + '@s.whatsapp.net';
      }
    }
    
    if (!usuarioMencionado) {
      return await sock.sendMessage(from, {
        text: '❌ *USUARIO NO VÁLIDO*\n━━━━━━━━━━━━━━━━\nDebes mencionar a un usuario o proporcionar su número.\n━━━━━━━━━━━━━━━━\n💡 Ejemplo: .prohibir comando @5512345678 24',
        mentions: isGroup ? [sender] : []
      });
    }
    
    // Verificar si el comando existe
    const comandosDisponibles = obtenerPluginsDisponibles();
    if (!comandosDisponibles.includes(comando)) {
      // Verificar si es un alias
      let comandoEncontrado = null;
      for (const cmd of comandosDisponibles) {
        try {
          const filePath = path.join(process.cwd(), 'plugins', `${cmd}.js`);
          const fileContent = fs.readFileSync(filePath, 'utf8');
          
          // Buscar aliases
          const aliasesMatch = fileContent.match(/export\s+const\s+aliases\s*=\s*\[([^\]]+)\]/);
          if (aliasesMatch) {
            const aliases = aliasesMatch[1].split(',').map(a => a.trim().replace(/['"`]/g, ''));
            if (aliases.includes(comando)) {
              comandoEncontrado = cmd;
              break;
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      if (!comandoEncontrado) {
        return await sock.sendMessage(from, {
          text: `❌ *COMANDO NO ENCONTRADO*\n━━━━━━━━━━━━━━━━\nEl comando "${comando}" no existe.\n━━━━━━━━━━━━━━━━\n💡 Usa .help para ver los comandos disponibles.`,
          mentions: isGroup ? [sender] : []
        });
      }
    }
    
    // Aplicar prohibición (usamos el comando encontrado o el original)
    const comandoAProhibir = comandoEncontrado || comando;
    const prohibicion = prohibirComando(usuarioMencionado, comandoAProhibir, horas);
    
    // Formatear tiempo
    const fechaExpiracion = new Date(prohibicion.tiempoExpiracion);
    const fechaFormateada = fechaExpiracion.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Mensaje de éxito
    const mensajeExito = `✅ *COMANDO PROHIBIDO*\n━━━━━━━━━━━━━━━━\n👤 Usuario: @${usuarioMencionado.split('@')[0]}\n⚡ Comando: ${comandoAProhibir}\n⏰ Duración: ${horas} horas\n📅 Expira: ${fechaFormateada}\n━━━━━━━━━━━━━━━━\n⚠️ El usuario no podrá usar este comando hasta la fecha indicada.`;
    
    // Enviar mensaje
    if (isGroup) {
      await sock.sendMessage(from, {
        text: mensajeExito,
        mentions: [usuarioMencionado, sender]
      });
    } else {
      await sock.sendMessage(from, { text: mensajeExito });
    }
    
    // Reacción de confirmación
    await sock.sendMessage(from, {
      react: { text: '✅', key: msg.key }
    });
    
    // Enviar notificación al usuario afectado (si es diferente al sender)
    if (usuarioMencionado !== sender) {
      try {
        const tiempoRestante = horas * 3600000;
        const horasRestantes = Math.floor(tiempoRestante / 3600000);
        const minutosRestantes = Math.floor((tiempoRestante % 3600000) / 60000);
        
        await sock.sendMessage(usuarioMencionado, {
          text: `🚫 *COMANDO RESTRINGIDO*\n━━━━━━━━━━━━━━━━\nEl comando *${comandoAProhibir}* te ha sido prohibido por ${horas} horas.\n⏰ Vuelve a estar disponible en: ${horasRestantes}h ${minutosRestantes}m\n📅 Fecha de expiración: ${fechaFormateada}\n━━━━━━━━━━━━━━━━\n⚠️ Esta restricción fue aplicada por un owner.`
        });
      } catch (error) {
        // Ignorar si no se puede enviar mensaje privado
      }
    }
    
  } catch (error) {
    console.error('Error en comando prohibir:', error);
    const from = msg.key.remoteJid;
    await sock.sendMessage(from, {
      text: `❌ *ERROR*\n━━━━━━━━━━━━━━━━\nOcurrió un error al prohibir el comando:\n${error.message}\n━━━━━━━━━━━━━━━━\n⚠️ Revisa los argumentos e intenta nuevamente.`
    });
  }
}

// También exportamos las funciones auxiliares para usar en handler.js
export { verificarComandoProhibido };
