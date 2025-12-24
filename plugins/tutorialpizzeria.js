export const command = 'tutorialpizzeria';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  
  const message = `🍕 *TUTORIAL PIZZERÍA* 🍕
Todo inicia registrando tu pizzeria✅:
.regpizzeria
¡Ya estás listo para hacer tu pizzería!

*Cambiar nombre de tu pizzería 🤔*

Ahora puedes usar .pzzname <nombre> para cambiar el nombre a tu pizzería las veces que quieras, recuerda intercambiar  <nombre> por el nombre que le quieras poner.

*Cambiarle la imagen a tu pizzería*
Envía una imagen al chat con el bot(procura seguir las reglas de tu comunidad) y responde a esa imagen con el comando .imagenpizzeria

*Ver información de mi pizzería 🍕👀*
Usa .mipizzeria para revisar información escencial sobre tu pizzería.🐼

*¿Cómo reclamo ganancias?*
Al crear una cuenta, se te otorgan 100 monedas por hora, en el momento que quieras puedes reclamar tus ganancias usando .reclamarpzz.

*RECLAMAR GANANCIAS AUTOMÁTICAMENTE (SOLO VIP 🪙)*
.autoreclamarpzz

*CALIDAD Y SERVICIOS*

La calidad es un número que tienes, este se consigue contratando servicios. Con la calidad puedes recibir propinas, pero ... Los servicios que contrates también te van a descontar de tus ganancias💰.

-REVISAR QUÉ SERVICIOS HAY DISPONIBLES -

Para revisar qué servicios están ofreciéndose, puedes usar .views\\` y en este aparecerán todos los servicios juntos su descripción.

-CONTRATAR SERVICIO -
Para aumentar tu calidad, vamos a contratar un servicio. Para contratar un servicio usa .contratarsv <Nombre del servicio>
Recordando remplazarlo por el nombre del servicio que quieras contratar. Y así conseguirás la calidad del servicio.

-DESCONTRATAR UN SERVICIO ❌-
Para descontratar un servicio usa .descontratarsv <Nombre del servicio>
Recuerda que al descontratar el servicio perderás su cantidad de calidad.

-¿QUÉ SERVICIOS TENGO?-
Para revisar qué servicios tienes usa .missv✅.

*NIVELES Y ASIENTOS 🪑*
Para revisar la información y los *REQUISITOS MÍNIMOS* para subir al siguiente nivel tu pizzeria usa .lvlpizzeria

-COMPRAR ASIENTO-
Para comprar un asiento usa .comprarasiento, recuerda que puedes comprar hasta el límite de asientos posibles de tu nivel de pizzeria.

-SUBIR DE NIVEL⬆️-
Para subir de nivel la pizzería la pizzería usa .lvlup. Recuerda que antes de subir un nivel deberás cumplir los siguientes requisitos:
•Tener el dinero necesario para subir de nivel.
• Tener todos los asientos máximos que puedas tener en tu nivel.
•Tener el mínimo de calidad necesaria para subir de nivel.

Recordando que puedes revisar los requisitos exactos con .lvlpizzeria

*RANKINGS 🏆*

Para ver los rankings usa:
.toppizzerias

🍕 *TUTORIAL PIZZERÍA*🍕
*PARTE DOS - CUENTAS ESPEJO*

*¿Qué son las cuentas espejo?*
¿Te ha pasado que estás usando el bot en un grupo pero en otro grupo no tienes tu misma cuenta? Bueno, el sistema de pizzería arregla este problema, haciendo que puedas tener la misma pizzería en el lugar que quieras.

*PROCESO DE CUENTAS ESPEJO*
Entonces si no tienes tu cuenta en el otro grupo/chat, entonces lo primero que debes hacer es registrarte denuevo (.regpizzeria). Ahora, desde tu otra cuenta donde tienes todo tu progreso usarás .mipizzeria y te vas a fijar donde dice Numero de pizzeria, acuerdate de ese número.

Ahora desde la cuenta donde acabas de registrar tu pizzeria usa .solicitarespejo  <Número de pizzería que te dió anteriormente>

Ahora, ya enviaste la petición, falta aceptarla desde tu cuenta principal.

Para revisar qué si haya llegado la petición, desde tu cuenta principal usarás:
.revisarpeticiones

Vas a revisar donde dice ID de Petición y te vas a acordar de ese número.

Desde ese mismo chat (tu cuenta principal) vas a escribir:
.aceptarpeticion <ID de la Petición>

Y ya con esto deberías tener la misma cuenta en ambos chats. Puedes verificarlo yendo al otro chat y escribir .mipizzeria, deberás tener la misma información que en el otro chat.`;
  
  await sock.sendMessage(from, { text: message });
}