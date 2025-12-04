import { cargarDatabase, guardarDatabase } from '../data/database.js';

const tiposGranjas = {
  1: {
    nombre: "🌾 Granja Básica",
    nivel: 1,
    costo: 50000,           // Antes: 1,000,000,000
    produccionPorSegundo: 0.5,  // Antes: 1,000 por segundo (¡Demasiado!)
    capacidad: 25000,       // Antes: 5,000,000
    mejora: 1.3             // Mejora más conservadora
  },
  2: {
    nombre: "🚜 Granja Avanzada",
    nivel: 1,
    costo: 120000,          // Antes: 2,000,000,000
    produccionPorSegundo: 1.2,  // Antes: 2,000
    capacidad: 60000,       // Antes: 25,000,000
    mejora: 1.4
  },
  3: {
    nombre: "🏭 Fábrica de Monedas",
    nivel: 1,
    costo: 300000,          // Antes: 5,000,000,000
    produccionPorSegundo: 2.5,  // Antes: 3,000
    capacidad: 150000,      // Antes: 100,000,000
    mejora: 1.5
  },
  4: {
    nombre: "💎 Mina de Diamantes",
    nivel: 1,
    costo: 750000,          // Antes: 10,000,000,000
    produccionPorSegundo: 4.5,  // Antes: 6,000
    capacidad: 375000,      // Antes: 250,000,000
    mejora: 1.6
  },
  5: {
    nombre: "🚀 Centro Espacial",
    nivel: 1,
    costo: 2000000,         // Antes: 25,000,000,000
    produccionPorSegundo: 10,   // Antes: 25,000
    capacidad: 1000000,     // Antes: 2,000,000,000
    mejora: 1.7
  }
};

let activacionesGlobales = {
  gananciaX2: {
    activo: false,
    inicio: null,
    duracion: 3 * 60 * 60 * 1000,
    nombre: "🎯 GANANCIA x2",
    descripcion: "Todas las granjas generan el doble de producción"
  },
  mejorar_50: {
    activo: false,
    inicio: null,
    duracion: 3 * 60 * 60 * 1000, // 3 horas
    nombre: "⭐ MEJORA -50%",
    descripcion: "Precio de mejora reducido en 50%"
  },
  comprar_50: {
    activo: false,
    inicio: null,
    duracion: 3 * 60 * 60 * 1000, // 3 horas
    nombre: "🛒 COMPRA -50%",
    descripcion: "Precio de compra reducido en 50%"
  },
  capacidad_x2: {
    activo: false,
    inicio: null,
    duracion: 24 * 60 * 60 * 1000, // 24 horas
    nombre: "📦 CAPACIDAD x2",
    descripcion: "Capacidad de todas las granjas duplicada"
  }
};

function verificarActivacionesExpiradas() {
  const ahora = Date.now();
  let cambios = false;

  Object.keys(activacionesGlobales).forEach(tipo => {
    const activacion = activacionesGlobales[tipo];
    if (activacion.activo && (ahora - activacion.inicio) >= activacion.duracion) {
      activacion.activo = false;
      activacion.inicio = null;
      cambios = true;
      console.log(`⏰ Activación ${tipo} desactivada por tiempo`);
    }
  });

  return cambios;
}

function migrarGranjasAntiguas(db) {
  if (!db.granjas || !db.granjas.usuarios) return;

  Object.keys(db.granjas.usuarios).forEach(usuarioId => {
    const usuarioGranjas = db.granjas.usuarios[usuarioId];
    
    usuarioGranjas.forEach(granja => {
      if (granja.produccionPorSegundo === undefined) {
        const tipo = tiposGranjas[granja.tipo];
        if (tipo) {
          if (granja.produccion && granja.tiempo) {
            granja.produccionPorSegundo = granja.produccion / (granja.tiempo * 60);
          } else {
            granja.produccionPorSegundo = tipo.produccionPorSegundo;
          }
          
          if (granja.capacidad === undefined) {
            granja.capacidad = tipo.capacidad;
          }
          
          if (granja.mejora === undefined) {
            granja.mejora = tipo.mejora;
          }
          
          if (granja.ultimaActualizacion === undefined) {
            granja.ultimaActualizacion = Date.now();
          }
          
          if (granja.acumulado === undefined) {
            granja.acumulado = 0;
          }
          
          console.log(`✅ Migrada granja de ${usuarioId}: ${tipo.nombre}`);
        }
      }
    });
  });
}

export const command = 'granja';
export const aliases = ['farm', 'granjas'];

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  const db = cargarDatabase();
  
  if (!db.granjas) {
    db.granjas = {
      usuarios: {},
      ultimaActualizacion: Date.now()
    };
  }

  verificarActivacionesExpiradas();

  migrarGranjasAntiguas(db);

  actualizarProduccionUsuario(sender, db);

  const subcomando = args[0]?.toLowerCase() || 'info';

  switch (subcomando) {
    case 'comprar':
    case 'buy':
      await comprarGranja(sock, from, sender, db, args.slice(1));
      break;
    case 'colectar':
    case 'collect':
      await colectarGranja(sock, from, sender, db);
      break;
    case 'mejorar':
    case 'upgrade':
      await mejorarGranja(sock, from, sender, db, args.slice(1));
      break;
    case 'vender':
    case 'sell':
      await venderGranja(sock, from, sender, db, args.slice(1));
      break;
    case 'info':
    case 'estado':
      await estadoGranja(sock, from, sender, db);
      break;
    case 'tienda':
    case 'shop':
      await tiendaGranjas(sock, from);
      break;
    case 'comandos':
      await mostrarComandosGranjas(sock, from);
      break;
    case 'activar':
      await activarEvento(sock, from, sender, db, args.slice(1));
      break;
    case 'eventos':
    case 'activaciones':
      await mostrarActivaciones(sock, from);
      break;
    default:
      await mostrarInfoGranjas(sock, from);
  }
}

async function mostrarActivaciones(sock, from) {
  verificarActivacionesExpiradas();
  
  let mensaje = `🎪 *EVENTOS ACTIVOS* ⏰\n\n`;
  let eventosActivos = false;

  Object.keys(activacionesGlobales).forEach(tipo => {
    const activacion = activacionesGlobales[tipo];
    if (activacion.activo) {
      eventosActivos = true;
      const tiempoRestante = activacion.duracion - (Date.now() - activacion.inicio);
      const horas = Math.floor(tiempoRestante / (60 * 60 * 1000));
      const minutos = Math.floor((tiempoRestante % (60 * 60 * 1000)) / (60 * 1000));
      
      mensaje += `*${activacion.nombre}*\n`;
      mensaje += `📝 ${activacion.descripcion}\n`;
      mensaje += `⏰ Tiempo restante: ${horas}h ${minutos}m\n\n`;
    }
  });

  if (!eventosActivos) {
    mensaje += `📭 No hay eventos activos en este momento.\n\n`;
  }

  mensaje += `💡 *Comando para owners:*\n`;
  mensaje += `.granja activar gananciaX2\n`;
  mensaje += `.granja activar mejorar_50%\n`;
  mensaje += `.granja activar comprar_50%\n`;
  mensaje += `.granja activar capacidad_x2\n\n`;
  mensaje += `⚡ ¡Los eventos potencian todas las granjas!`;

  await sock.sendMessage(from, { text: mensaje });
}

async function activarEvento(sock, from, sender, db, args) {
  const esOwner = sender.includes('166164298780822') || sender.includes('999'); // Ajusta esta condición
  
  if (!esOwner) {
    await sock.sendMessage(from, {
      text: '❌ Este comando es solo para administradores del bot.'
    });
    return;
  }

  if (!args[0]) {
    await sock.sendMessage(from, {
      text: '❌ Especifica el evento a activar.\n\n' +
            '💡 *Eventos disponibles:*\n' +
            '• gananciaX2 - Producción doble (3h)\n' +
            '• mejorar_50% - Mejoras -50% (3h)\n' + 
            '• comprar_50% - Compras -50% (3h)\n' +
            '• capacidad_x2 - Capacidad doble (24h)\n\n' +
            '🎯 *Ejemplo:* .granja activar gananciaX2'
    });
    return;
  }

  const tipoEvento = args[0].toLowerCase();
  let eventoKey = '';

  switch (tipoEvento) {
    case 'gananciax2':
      eventoKey = 'gananciaX2';
      break;
    case 'mejorar_50%':
      eventoKey = 'mejorar_50';
      break;
    case 'comprar_50%':
      eventoKey = 'comprar_50';
      break;
    case 'capacidad_x2':
      eventoKey = 'capacidad_x2';
      break;
    default:
      await sock.sendMessage(from, {
        text: '❌ Evento no válido. Usa uno de los siguientes:\n' +
              '• gananciaX2\n• mejorar_50%\n• comprar_50%\n• capacidad_x2'
      });
      return;
  }

  const evento = activacionesGlobales[eventoKey];

  if (evento.activo) {
    const tiempoRestante = evento.duracion - (Date.now() - evento.inicio);
    const horas = Math.floor(tiempoRestante / (60 * 60 * 1000));
    const minutos = Math.floor((tiempoRestante % (60 * 60 * 1000)) / (60 * 1000));
    
    await sock.sendMessage(from, {
      text: `⚠️ *${evento.nombre}* ya está activo\n\n` +
            `⏰ Tiempo restante: ${horas}h ${minutos}m\n` +
            `📝 ${evento.descripcion}`
    });
    return;
  }

  evento.activo = true;
  evento.inicio = Date.now();

  const duracionHoras = evento.duracion / (60 * 60 * 1000);

  await sock.sendMessage(from, {
    text: `🎉 *¡EVENTO ACTIVADO!* 🚀\n\n` +
          `✨ *${evento.nombre}*\n` +
          `📝 ${evento.descripcion}\n` +
          `⏰ Duración: ${duracionHoras} horas\n` +
          `🌍 Afecta a *TODAS* las granjas\n\n` +
          `💫 ¡Los jugadores disfrutarán de este bonus!\n` +
          `📊 Ver eventos activos: .granja eventos`
  });

  console.log(`✅ Evento ${eventoKey} activado por ${sender}`);
}

async function mostrarComandosGranjas(sock, from) {
  const mensaje = `🌾 *COMANDOS DE GRANJAS* 🚜\n\n` +
    `🛒 *Tienda y Compra:*\n` +
    `.granja tienda - Ver granjas disponibles\n` +
    `.granja comprar <1-5> - Comprar una granja\n\n` +
    `💰 *Gestión y Producción:*\n` +
    `.granja info - Estado de tus granjas\n` +
    `.granja colectar - Recolectar ganancias\n` +
    `.granja mejorar <número> - Mejorar granja\n` +
    `.granja vender <número> - Vender granja\n\n` +
    `🎪 *Eventos Globales:*\n` +
    `.granja eventos - Ver eventos activos\n` +
    `.granja activar <evento> - Activar evento (Owner)\n\n` +
    `📊 *Información:*\n` +
    `.granja - Información general\n` +
    `.granja comandos - Esta lista de comandos\n\n` +
    `💡 *Las ganancias suben cada 10 segundos!*`;

  await sock.sendMessage(from, { text: mensaje });
}

async function mostrarInfoGranjas(sock, from) {
  verificarActivacionesExpiradas();
  
  let mensajeEventos = '';
  Object.keys(activacionesGlobales).forEach(tipo => {
    const activacion = activacionesGlobales[tipo];
    if (activacion.activo) {
      const tiempoRestante = activacion.duracion - (Date.now() - activacion.inicio);
      const horas = Math.floor(tiempoRestante / (60 * 60 * 1000));
      const minutos = Math.floor((tiempoRestante % (60 * 60 * 1000)) / (60 * 1000));
      mensajeEventos += `\n🎯 *${activacion.nombre}* - ${horas}h ${minutos}m restantes`;
    }
  });

  const mensaje = `🌾 *SISTEMA DE GRANJAS* 🚜\n\n` +
    `💰 *Invierte y genera Pandacoins automáticamente!*\n\n` +
    `⚡ *NUEVO: Producción en tiempo real*\n` +
    `• Las ganancias suben *cada 10 segundos*\n` +
    `• Ve cómo crece tu dinero en .granja info\n` +
    `• ¡Colecta cuando quieras!\n\n` +
    `🎪 *Eventos Activos:*${mensajeEventos || ' Ninguno por ahora'}\n\n` +
    `🎯 *Mecánicas:*\n` +
    `• Cada granja produce pandacoins constantemente\n` +
    `• Mejora las granjas para aumentar producción\n` +
    `• Las granjas tienen capacidad máxima\n` +
    `• ¡No pierdes producción si no colectas!\n\n` +
    `💡 Usa: .granja comandos - Para ver todos los comandos`;

  await sock.sendMessage(from, { text: mensaje });
}

async function tiendaGranjas(sock, from) {
  verificarActivacionesExpiradas();
  
  let mensaje = `🛒 *TIENDA DE GRANJAS* 🌾\n`;

  let descuentoCompra = activacionesGlobales.comprar_50.activo ? ' 🎪 *-50% EVENTO!*' : '';
  
  mensaje += descuentoCompra ? `\n${descuentoCompra}\n\n` : '\n';

  Object.entries(tiposGranjas).forEach(([id, granja]) => {
    let costo = granja.costo;
    let precioEspecial = '';
    
    if (activacionesGlobales.comprar_50.activo) {
      costo = Math.floor(costo * 0.5);
      precioEspecial = ` 🎪 *${costo.toLocaleString()} 🐼*`;
    }

    const produccionHora = granja.produccionPorSegundo * 3600;
    const produccionBase = activacionesGlobales.gananciaX2.activo ? 
      produccionHora * 2 : produccionHora;
    
    let produccionEspecial = '';
    if (activacionesGlobales.gananciaX2.activo) {
      produccionEspecial = ` 🎪 *${produccionBase.toLocaleString()}/hora*`;
    }

    mensaje += `*${id}. ${granja.nombre}*\n` +
               `💰 Precio: ${precioEspecial || costo.toLocaleString() + ' 🐼'}\n` +
               `⏰ Producción: ${produccionEspecial || produccionHora.toLocaleString() + '/hora'}\n` +
               `📈 Por segundo: ${Math.round(granja.produccionPorSegundo).toLocaleString()} 🐼\n` +
               `📦 Capacidad: ${granja.capacidad.toLocaleString()}\n` +
               `⭐ Mejora: x${granja.mejora} por nivel\n\n`;
  });

  mensaje += `💡 *Usa:* .granja comprar <número>\n` +
             `🎯 *Ejemplo:* .granja comprar 1\n\n`;

  if (activacionesGlobales.comprar_50.activo) {
    const tiempoRestante = activacionesGlobales.comprar_50.duracion - (Date.now() - activacionesGlobales.comprar_50.inicio);
    const horas = Math.floor(tiempoRestante / (60 * 60 * 1000));
    const minutos = Math.floor((tiempoRestante % (60 * 60 * 1000)) / (60 * 1000));
    mensaje += `🎪 *OFERTA ESPECIAL:* -50% en compras (${horas}h ${minutos}m restantes)\n\n`;
  }

  mensaje += `⚡ *Las ganancias suben cada 10 segundos!*`;

  await sock.sendMessage(from, { text: mensaje });
}

async function comprarGranja(sock, from, sender, db, args) {
  if (!args[0]) {
    await sock.sendMessage(from, {
      text: '❌ Especifica el número de la granja.\n\n💡 Usa: .granja comprar <número>\n💡 Ve la tienda: .granja tienda'
    });
    return;
  }

  const granjaId = parseInt(args[0]);
  const tipoGranja = tiposGranjas[granjaId];

  if (!tipoGranja) {
    await sock.sendMessage(from, {
      text: `❌ Granja inválida. Usa un número del 1 al ${Object.keys(tiposGranjas).length}.\n\n💡 Ve la tienda: .granja tienda`
    });
    return;
  }

  let costo = tipoGranja.costo;
  if (activacionesGlobales.comprar_50.activo) {
    costo = Math.floor(costo * 0.5);
  }

  if (!db.users) db.users = {};
  if (!db.users[sender]) {
    db.users[sender] = { pandacoins: 0 };
  }

  const user = db.users[sender];

  if (user.pandacoins < costo) {
    await sock.sendMessage(from, {
      text: `❌ No tienes suficientes pandacoins.\n\n` +
            `💰 Necesitas: ${costo.toLocaleString()} 🐼\n` +
            `💳 Tienes: ${user.pandacoins.toLocaleString()} 🐼\n` +
            `🔻 Te faltan: ${(costo - user.pandacoins).toLocaleString()} 🐼`
    });
    return;
  }

  if (!db.granjas.usuarios[sender]) {
    db.granjas.usuarios[sender] = [];
  }

  const usuarioGranjas = db.granjas.usuarios[sender];

  const granjaExistente = usuarioGranjas.find(g => g.tipo === granjaId);
  if (granjaExistente) {
    await sock.sendMessage(from, {
      text: `❌ Ya tienes una ${tipoGranja.nombre}.\n\n💡 Puedes mejorarla con: .granja mejorar ${granjaId}`
    });
    return;
  }

  user.pandacoins -= costo;

  let capacidad = tipoGranja.capacidad;
  if (activacionesGlobales.capacidad_x2.activo) {
    capacidad = capacidad * 2;
  }

  const nuevaGranja = {
    tipo: granjaId,
    nivel: 1,
    produccionPorSegundo: tipoGranja.produccionPorSegundo,
    capacidad: capacidad,
    acumulado: 0,
    ultimaActualizacion: Date.now(),
    mejora: tipoGranja.mejora
  };

  usuarioGranjas.push(nuevaGranja);
  guardarDatabase(db);

  let produccionPorSegundo = tipoGranja.produccionPorSegundo;
  let produccionHora = produccionPorSegundo * 3600;
  let mensajeEvento = '';

  if (activacionesGlobales.gananciaX2.activo) {
    produccionPorSegundo *= 2;
    produccionHora *= 2;
    mensajeEvento = '\n🎪 *BONUS EVENTO: Producción x2 activa!*';
  }

  if (activacionesGlobales.capacidad_x2.activo) {
    mensajeEvento += '\n🎪 *BONUS EVENTO: Capacidad x2 activa!*';
  }

  await sock.sendMessage(from, {
    text: `✅ *¡GRANJA COMPRADA EXITOSAMENTE!* 🌾${mensajeEvento}\n\n` +
          `🏭 *Granja:* ${tipoGranja.nombre}\n` +
          `⭐ Nivel: 1\n` +
          `💰 Precio: ${costo.toLocaleString()} 🐼\n` +
          `📈 Producción: ${produccionHora.toLocaleString()}/hora\n` +
          `⚡ Por segundo: ${Math.round(produccionPorSegundo).toLocaleString()} 🐼\n` +
          `📦 Capacidad: ${capacidad.toLocaleString()}\n\n` +
          `💫 ¡Tu granja empezará a producir inmediatamente!\n` +
          `⚡ Las ganancias suben *cada 10 segundos*\n` +
          `📊 Ve el progreso con: .granja info`
  });
}

async function estadoGranja(sock, from, sender, db) {
  if (!db.granjas.usuarios[sender] || db.granjas.usuarios[sender].length === 0) {
    await sock.sendMessage(from, {
      text: `🌾 *MIS GRANJAS*\n\n📭 No tienes granjas activas.\n\n💡 Compra tu primera granja con:\n.granja tienda\n.granja comprar 1\n\nPara menu de comandos:\n.granja comandos`
    });
    return;
  }

  const usuarioGranjas = db.granjas.usuarios[sender];

  let mensaje = `🌾 *MIS GRANJAS ACTIVAS* 🚜\n`;
  
  let mensajeEventos = '';
  if (activacionesGlobales.gananciaX2.activo) {
    mensajeEventos += '\n🎪 *EVENTO ACTIVO: Ganancia x2*';
  }
  if (activacionesGlobales.capacidad_x2.activo) {
    mensajeEventos += '\n🎪 *EVENTO ACTIVO: Capacidad x2*';
  }
  
  mensaje += mensajeEventos + '\n\n';
  
  let totalAcumulado = 0;

  usuarioGranjas.forEach((granja, index) => {
    const tipo = tiposGranjas[granja.tipo];
    
    let produccionPorSegundo = granja.produccionPorSegundo || tiposGranjas[granja.tipo]?.produccionPorSegundo || 0;
    if (activacionesGlobales.gananciaX2.activo) {
      produccionPorSegundo *= 2;
    }
    
    let capacidad = granja.capacidad || tiposGranjas[granja.tipo]?.capacidad || 10000000;
    if (activacionesGlobales.capacidad_x2.activo) {
      capacidad = capacidad * 2;
    }
    
    const acumulado = granja.acumulado || 0;
    
    const produccionHora = produccionPorSegundo * 3600;
    
    const porcentajeLleno = Math.min(100, Math.round((acumulado / capacidad) * 100));
    const barraProgreso = generarBarraProgreso(porcentajeLleno);

    mensaje += `*${index + 1}. ${tipo.nombre}*\n` +
               `⭐ Nivel: ${granja.nivel || 1}\n` +
               `📈 Producción: ${produccionHora.toLocaleString()}/hora\n` +
               `💰 Acumulado: ${Math.floor(acumulado).toLocaleString()} 🐼\n` +
               `📦 Capacidad: ${capacidad.toLocaleString()}\n` +
               `📊 ${barraProgreso} ${porcentajeLleno}%\n\n`;

    totalAcumulado += acumulado;
  });

  mensaje += `💰 *Total listo para colectar:* ${Math.floor(totalAcumulado).toLocaleString()} 🐼\n\n` +
             `💡 *Comandos útiles:*\n` +
             `.granja colectar - Recolectar ${Math.floor(totalAcumulado).toLocaleString()} 🐼\n` +
             `.granja mejorar <número> - Mejorar granja\n` +
             `.granja vender <número> - Vender granja\n\n` +
             `⚡ *Las ganancias suben cada 10 segundos!*`;

  await sock.sendMessage(from, { text: mensaje });
}

async function colectarGranja(sock, from, sender, db) {
  if (!db.granjas.usuarios[sender] || db.granjas.usuarios[sender].length === 0) {
    await sock.sendMessage(from, {
      text: '❌ No tienes granjas para colectar.\n\n💡 Compra una granja con: .granja tienda'
    });
    return;
  }

  const usuarioGranjas = db.granjas.usuarios[sender];
  let totalColectado = 0;
  let granjasColectadas = 0;

  if (!db.users) db.users = {};
  if (!db.users[sender]) {
    db.users[sender] = { pandacoins: 0 };
  }

  const user = db.users[sender];

  usuarioGranjas.forEach(granja => {
    const acumulado = granja.acumulado || 0;
    if (acumulado > 0) {
      totalColectado += acumulado;
      granjasColectadas++;
      
      granja.acumulado = 0;
      granja.ultimaActualizacion = Date.now();
    }
  });

  if (totalColectado === 0) {
    await sock.sendMessage(from, {
      text: '⏰ Todavía no hay producción para colectar.\n\n💡 Tus granjas están produciendo... Vuelve en unos segundos!\n⚡ Las ganancias suben cada 10 segundos'
    });
    return;
  }

  user.pandacoins += totalColectado;
  guardarDatabase(db);

  await sock.sendMessage(from, {
    text: `💰 *¡COSECHA EXITOSA!* 🌾\n\n` +
          `📦 Granjas colectadas: ${granjasColectadas}\n` +
          `💰 Total recolectado: ${Math.floor(totalColectado).toLocaleString()} 🐼\n` +
          `💳 Nuevo saldo: ${user.pandacoins.toLocaleString()} 🐼\n\n` +
          `⚡ Tus granjas siguen produciendo...\n` +
          `💫 ¡Vuelve en segundos para más ganancias!\n` +
          `📊 Estado actual: .granja info`
  });
}

async function mejorarGranja(sock, from, sender, db, args) {
  if (!args[0]) {
    await sock.sendMessage(from, {
      text: '❌ Especifica el número de la granja a mejorar.\n\n💡 Usa: .granja mejorar <número>\n💡 Ve tus granjas: .granja info'
    });
    return;
  }

  const granjaIndex = parseInt(args[0]) - 1;
  
  if (!db.granjas.usuarios[sender] || !db.granjas.usuarios[sender][granjaIndex]) {
    await sock.sendMessage(from, {
      text: `❌ No tienes una granja en el slot ${granjaIndex + 1}.\n\n💡 Ve tus granjas: .granja info`
    });
    return;
  }

  const granja = db.granjas.usuarios[sender][granjaIndex];
  const tipo = tiposGranjas[granja.tipo];
  
  let costoMejora = Math.floor(tipo.costo * Math.pow(2, (granja.nivel || 1) - 1) * 0.5);
  
  if (activacionesGlobales.mejorar_50.activo) {
    costoMejora = Math.floor(costoMejora * 0.5);
  }

  if (!db.users) db.users = {};
  if (!db.users[sender]) {
    db.users[sender] = { pandacoins: 0 };
  }

  const user = db.users[sender];

  if (user.pandacoins < costoMejora) {
    await sock.sendMessage(from, {
      text: `❌ No tienes suficientes pandacoins para mejorar.\n\n` +
            `💰 Costo mejora: ${costoMejora.toLocaleString()} 🐼\n` +
            `💳 Tienes: ${user.pandacoins.toLocaleString()} 🐼\n` +
            `🔻 Te faltan: ${(costoMejora - user.pandacoins).toLocaleString()} 🐼`
    });
    return;
  }

  user.pandacoins -= costoMejora;
  granja.nivel = (granja.nivel || 1) + 1;
  
  let nuevaProduccion = Math.floor((granja.produccionPorSegundo || tipo.produccionPorSegundo) * (granja.mejora || tipo.mejora));
  granja.produccionPorSegundo = nuevaProduccion;
  
  let nuevaCapacidad = Math.floor((granja.capacidad || tipo.capacidad) * (granja.mejora || tipo.mejora));
  if (activacionesGlobales.capacidad_x2.activo) {
    nuevaCapacidad = nuevaCapacidad * 2;
  }
  granja.capacidad = nuevaCapacidad;

  guardarDatabase(db);

  let produccionFinal = granja.produccionPorSegundo;
  if (activacionesGlobales.gananciaX2.activo) {
    produccionFinal *= 2;
  }
  const nuevaProduccionHora = produccionFinal * 3600;

  let mensajeEvento = '';
  if (activacionesGlobales.mejorar_50.activo) {
    mensajeEvento = '\n🎪 *BONUS EVENTO: Mejoras -50%!*';
  }

  await sock.sendMessage(from, {
    text: `⭐ *¡GRANJA MEJORADA!* 🚀${mensajeEvento}\n\n` +
          `🏭 *Granja:* ${tipo.nombre}\n` +
          `✨ Nuevo nivel: ${granja.nivel}\n` +
          `💰 Costo: ${costoMejora.toLocaleString()} 🐼\n` +
          `📈 Nueva producción: ${nuevaProduccionHora.toLocaleString()}/hora\n` +
          `⚡ Por segundo: ${Math.round(produccionFinal).toLocaleString()} 🐼\n` +
          `📦 Nueva capacidad: ${granja.capacidad.toLocaleString()}\n\n` +
          `💫 ¡Tu granja ahora es más productiva!\n` +
          `🎯 Sigue mejorando para maximizar ganancias.\n` +
          `⚡ Las ganancias suben cada 10 segundos!`
  });
}

async function venderGranja(sock, from, sender, db, args) {
  if (!args[0]) {
    await sock.sendMessage(from, {
      text: '❌ Especifica el número de la granja a vender.\n\n💡 Usa: .granja vender <número>\n💡 Ve tus granjas: .granja info'
    });
    return;
  }

  const granjaIndex = parseInt(args[0]) - 1;
  
  if (!db.granjas.usuarios[sender] || !db.granjas.usuarios[sender][granjaIndex]) {
    await sock.sendMessage(from, {
      text: `❌ No tienes una granja en el slot ${granjaIndex + 1}.\n\n💡 Ve tus granjas: .granja info`
    });
    return;
  }

  const granja = db.granjas.usuarios[sender][granjaIndex];
  const tipo = tiposGranjas[granja.tipo];
  
  const reembolsoBase = Math.floor(tipo.costo * 0.5);
  const bonificacionNivel = Math.floor(reembolsoBase * 0.1 * ((granja.nivel || 1) - 1));
  const acumuladoGranja = Math.floor(granja.acumulado || 0);
  const reembolsoTotal = reembolsoBase + bonificacionNivel + acumuladoGranja;

  if (!db.users) db.users = {};
  if (!db.users[sender]) {
    db.users[sender] = { pandacoins: 0 };
  }

  const user = db.users[sender];

  user.pandacoins += reembolsoTotal;
  db.granjas.usuarios[sender].splice(granjaIndex, 1);

  if (db.granjas.usuarios[sender].length === 0) {
    delete db.granjas.usuarios[sender];
  }

  guardarDatabase(db);

  await sock.sendMessage(from, {
    text: `🏷️ *¡GRANJA VENDIDA!* 💰\n\n` +
          `🏭 *Granja:* ${tipo.nombre} (Nivel ${granja.nivel || 1})\n` +
          `💰 Reembolso base: ${reembolsoBase.toLocaleString()} 🐼\n` +
          `⭐ Bonificación nivel: ${bonificacionNivel.toLocaleString()} 🐼\n` +
          `📈 Acumulado incluido: ${acumuladoGranja.toLocaleString()} 🐼\n` +
          `💳 Total recibido: ${reembolsoTotal.toLocaleString()} 🐼\n` +
          `📊 Nuevo saldo: ${user.pandacoins.toLocaleString()} 🐼\n\n` +
          `💫 ¡Puedes comprar una granja mejor con tus ganancias!\n` +
          `🛒 Ve la tienda: .granja tienda`
  });
}

function generarBarraProgreso(porcentaje) {
  const barrasTotal = 10;
  const barrasLlenas = Math.round((porcentaje / 100) * barrasTotal);
  const barrasVacias = barrasTotal - barrasLlenas;
  
  return '█'.repeat(barrasLlenas) + '░'.repeat(barrasVacias);
}

function actualizarProduccionUsuario(usuarioId, db) {
  if (!db.granjas || !db.granjas.usuarios || !db.granjas.usuarios[usuarioId]) {
    return;
  }

  const ahora = Date.now();
  const usuarioGranjas = db.granjas.usuarios[usuarioId];

  usuarioGranjas.forEach(granja => {
    let produccionPorSegundo = granja.produccionPorSegundo || tiposGranjas[granja.tipo]?.produccionPorSegundo || 0;
    
    if (activacionesGlobales.gananciaX2.activo) {
      produccionPorSegundo *= 2;
    }
    
    let capacidad = granja.capacidad || tiposGranjas[granja.tipo]?.capacidad || 10000000;
    
    if (activacionesGlobales.capacidad_x2.activo) {
      capacidad = capacidad * 2;
    }
    
    const ultimaActualizacion = granja.ultimaActualizacion || ahora;
    
    const segundosTranscurridos = (ahora - ultimaActualizacion) / 1000;
    
    if (segundosTranscurridos > 0) {
      const produccion = segundosTranscurridos * produccionPorSegundo;
      granja.acumulado = Math.min((granja.acumulado || 0) + produccion, capacidad);
      granja.ultimaActualizacion = ahora;
    }
  });

  guardarDatabase(db);
}

export function actualizarProduccionGlobalGranjas() {
  const db = cargarDatabase();
  
  if (!db.granjas || !db.granjas.usuarios) return;

  const ahora = Date.now();
  let totalUsuariosActualizados = 0;

  Object.keys(db.granjas.usuarios).forEach(usuarioId => {
    const usuarioGranjas = db.granjas.usuarios[usuarioId];
    let usuarioActualizado = false;

    usuarioGranjas.forEach(granja => {
      let produccionPorSegundo = granja.produccionPorSegundo || tiposGranjas[granja.tipo]?.produccionPorSegundo || 0;
      
      if (activacionesGlobales.gananciaX2.activo) {
        produccionPorSegundo *= 2;
      }
      
      let capacidad = granja.capacidad || tiposGranjas[granja.tipo]?.capacidad || 10000000;
      
      if (activacionesGlobales.capacidad_x2.activo) {
        capacidad = capacidad * 2;
      }
      
      const ultimaActualizacion = granja.ultimaActualizacion || ahora;
      
      const segundosTranscurridos = (ahora - ultimaActualizacion) / 1000;
      
      if (segundosTranscurridos > 0) {
        const produccion = segundosTranscurridos * produccionPorSegundo;
        granja.acumulado = Math.min((granja.acumulado || 0) + produccion, capacidad);
        granja.ultimaActualizacion = ahora;
        usuarioActualizado = true;
      }
    });

    if (usuarioActualizado) {
      totalUsuariosActualizados++;
    }
  });

  if (totalUsuariosActualizados > 0) {
    guardarDatabase(db);
  }
}

setInterval(verificarActivacionesExpiradas, 60 * 1000);

setInterval(actualizarProduccionGlobalGranjas, 10 * 1000);
