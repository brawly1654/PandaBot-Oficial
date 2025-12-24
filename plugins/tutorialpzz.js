export const command = 'tutorialpzz';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;

  const message = `🍕 *TUTORIAL PIZZERÍA* 🍕

Todo inicia registrando tu pizzería ✅:
.regpizzeria
¡Ya estás listo para hacer tu pizzería!

*Cambiar nombre de tu pizzería 🤔*
Ahora puedes usar:
.pzzname <nombre>
para cambiar el nombre de tu pizzería las veces que quieras.

*Cambiarle la imagen a tu pizzería*
Envía una imagen al chat (respetando las reglas del grupo) y responde a esa imagen con:
.imagenpizzeria

*Ver información de mi pizzería 🍕👀*
Usa:
.mipizzeria
para revisar información esencial sobre tu pizzería 🐼

*¿Cómo reclamo ganancias?*
Al crear una cuenta se te otorgan 100 monedas por hora.
Puedes reclamar tus ganancias usando:
.reclamarpzz

*RECLAMAR GANANCIAS AUTOMÁTICAMENTE (SOLO VIP 🪙)*
.autoreclamarpzz

*CALIDAD Y SERVICIOS*
La calidad se obtiene contratando servicios.
Con mayor calidad puedes recibir propinas, pero los servicios también descuentan de tus ganancias 💰

- REVISAR SERVICIOS DISPONIBLES -
.views

- CONTRATAR SERVICIO -
.contratarsv <Nombre del servicio>

- DESCONTRATAR SERVICIO ❌ -
.descontratarsv <Nombre del servicio>

- ¿QUÉ SERVICIOS TENGO? -
.missv ✅

*NIVELES Y ASIENTOS 🪑*
Para ver requisitos y progreso:
.lvlpizzeria

- COMPRAR ASIENTO -
.comprarasiento

- SUBIR DE NIVEL ⬆️ -
.lvlup

Requisitos:
• Tener el dinero necesario  
• Tener todos los asientos máximos del nivel  
• Tener la calidad mínima requerida  

(Revisa los requisitos exactos con .lvlpizzeria)

*RANKINGS 🏆*
.toppizzerias

Disfruta la pizzería 🐼🍕`;

  await sock.sendMessage(from, { text: message });
}