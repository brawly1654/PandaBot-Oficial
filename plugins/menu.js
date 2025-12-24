import fs from 'fs';
import { ownerNumber } from '../config.js';
export const command = 'menu';
export const aliases = ['help', 'ayuda'];
export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderNumber = sender.split('@')[0];
  const metadata = await sock.groupMetadata(from);
  const isOwner = ownerNumber.includes(`+${senderNumber}`);

  try {
    const pandaBotPhoto = 'http://localhost:8000/upload/file_0000000034d061f8a7a755cd2eebdbd6.png';
    const pandaChannel = 'https://whatsapp.com/channel/0029Vb6SmfeAojYpZCHYVf0R';

    const menu = `
ㅤׄㅤ⋱  ִㅤֺ    ִ  ⁝  ִㅤֺ    ִ  ⋰ㅤׄ
          *🪪ᩞᩨ 𝐏𝖺𝗇𝖽𝖺*
                          *𝐁𝗈𝗍 🐼ᩞᩨ*
ㅤㅤ         ／      ｜       ＼

  ⏜᷼⌒ׅ 𝗠𝗲꯭𝗻𝘂́ ׅ⌒᷼⏜

🅥⃞𝗲𝗿𝘀𝗶𝗼꯭́𝗻:: 2.85

🅝⃞𝘂́𝗺꯭𝗲𝗿𝗼 𝗗͠𝗲 𝗧𝗲𝗹𝗲꯭́𝗳𝗼𝗻𝗼:: +56 9 3926 9150

🅒⃞𝗮𝗻͠𝗮𝗹 𝗢꯭𝗳𝗶𝗰𝗶𝗮𝗹:: https://whatsapp.com/channel/0029Vb6SmfeAojYpZCHYVf0R

🅞⃞𝘄𝗻꯭𝗲𝗿𝘀/🅟⃞𝗿𝗼𝗽𝗶𝗲͠𝘁𝗮𝗿𝗶𝗼𝘀::

- Lukas (Creador): +56 9 5350 8566
- Miguelito (Owner y desarrollador): +52 55 3883 0665
- Lilan (Owner y creadora de este menú): +52 951 316 4242
- Tom (Owner y playtester): +56 9 3061 7575

🅟⃞𝗲𝗿𝘀𝗼𝗻꯭𝗮𝘀 𝗗𝗲͠𝘀𝘁𝗮𝗰𝗮𝗱꯭𝗮𝘀 𝗘꯭𝗻 𝗣𝗮𝗻𝗱͠𝗮𝗕𝗼𝘁::

- Marco (Playtester)
- Joakinho (Playtester)
- Valen (Playtester)
- Alejo
- Ian
- Thiago 3
- Coco

🅕⃞𝗲𝗰𝗵͠𝗮 𝗗𝗲 𝗖𝗿𝗲𝗮꯭𝗰𝗶𝗼́𝗻:: 14/07/2025

🌻 🅙⃞𝘂𝗲᪲𝗴𝗼𝘀᳟::

- .8ball <pregunta>
> Haces una pregunta al bot y él te responderá con distintas frases.

- .abrazo @usuario
> Abrazas al usuario mencionado.

- .67
> ¡Six seven!

- .adivinabandera
> Juegas a adivinar la bandera que el bot te muestre, simplemente respondes con el nombre de la bandera.

- .ahorcado
> Juegas al ahorcado en el bot, usa .ahorcado iniciar para comenzar una partida, luego .ahorcado <letra> para ir colocando letras en la palabra.

- .cagar
> Defecas.

- .dado:
> Lanzas un dado, PandaBot muestra el resultado.

- .dar <cosa> (citando mensaje)
> Le das lo que quieras al usuario del mensaje citado.😳

- .dildear @usuario
> Dildeas al usuario mencionado.

- .facherometro @usuario
> PandaBot muestra qué tan fachero es el usuario mencionado.

- .gay @usuario
> PandaBot muestra qué tan gay es el usuario mencionado.

- .impostor
> Clásico juego del impostor, pruébalo con más amigos, mientras más usuarios dentro de la partida, más emocionante se vuelve.

- .inteligencia @usuario
> PandaBot muestra qué tan inteligente es el usuario mencionado.

- .luck @usuario
> PandaBot muestra qué tanta suerte tiene el usuario mencionado.

- .manuela
> Te pajeas.

- .moneda
> Lanzas una moneda, puede caer en Cara o en Cruz.

- .otaku @usuario
> PandaBot muestra qué tan otaku es el usuario mencionado.

- .paja @usuario
> Le dedicas una paja al usuario mencionado.

- .pajer@ @usuario
> El bot muestra qué tan pajero es el usuario mencionado.

- .pp
> El bot muestra el tamaño de tu pilin.

- .randomuser
> El bot menciona a un usuario al azar del grupo.

- .simprate @usuario
> PandaBot muestra qué tan SIMP es el usuario mencionado.

- .topahorcados
> Revisas el ranking de usuarios con más victorias en *.ahorcado*.

- .ranking
> Revisas el ranking de usuarios con más victorias en *.adivinabandera*.

- .toplindos
> PandaBot muestra un top 10 de las personas más lindas del grupo.

- .trio @usuario1 @usuario2
> Formas un trío junto a otros 2 usuarios.

- .sexo @usuario
> Tienes sexo con el usuario mencionado.

- .makechiste <chiste>
> Creas un chiste que se mostrará en .chisterandom, tu chiste debe ser aceptado por el creador del bot. No envíes chistes sin sentido o cosas obsenas.

- .chisterandom
> El bot envía un chiste aleatorio de la lista.

🐼 🅡⃞𝗽𝗴::

- .adviento <1-24>
> Reclamas una recompensa del calendario de adviento de PandaBot.

- .minar
> Minas recursos para progresar en el bot, puedes obtener logros usando este comando muchas veces.

- .sell <recurso> <cantidad>
> Vendes recursos de tu inventario, ganas Pandacoins.

- .shop
> Revisas la tienda de recursos, algunos paquetes no están disponibles por el momento.

- .buy
> Compras una herramienta o recurso, sirven para actividades como *.talar* o *.minar*.

- .cazar
> Sales de caza en PandaBot, esto te servirá para conseguir recursos que podrás vender

- .talar
> Talas principalmente madera pero también Obtienes otros recursos, los puedes vender igualmente. Si tienes un hacha, tus probabilidades de obtener mejores recompensas aumentan.

- .pescar
> Pescas para progresar en el bot, si tienes una caña de pescar en tu inventario aumentas tus probabilidades de obtener mejores cosas, las recompensas de este comando se pueden vender.

- .inv
> Revisas tu inventario de herramientas y recursos. (Comando importante)

- .apostar <cantidad> <bajo/medio/alto>
> Apuestas Pandacoins en el bot, si tu apuesta es en *bajo* recibes x1.2 Pandacoins de las que apostaste, si tu apuesta es en *medio* recibes x2 de las Pandacoins que apostaste, y si tu apuesta es en *alto* recibes x3 de las Pandacoins que apostaste.

- .dados <apuesta>
> Juegas a los dados contra la casa, el ganador se lleva las Pandacoins apostadas. Para jugar contra un usuario del grupo, usa *.dados vs @usuario*. Para ver todas las funciones usa *.dados*.

- .ttt
> Juegas al famoso *Tic Tac Toe* en PandaBot. Usa *.ttt help* para más información.

- .daily
> Reclamas tu recompensa diaria en PandaBot.

- .hourly
> Reclamas una recompensa cada hora, según tu racha de horas tendrás mejores recompensas.

- .weekly
> Reclamas tu recompensa semanal.

- .monthly
> Obtienes una recompensa mensual, contiene recursos que puedes vender.

- .aventura
> Te vas de aventura en PandaBot, esto sirve para obtener recursos que podrás vender con *.sell*.

- .cofre
> Abres un cofre en PandaBot, la calidad del cofre puede variar según tu suerte.

- .clan
> ¡Crea tu clan en PandaBot! Los clanes sirven para llevar el recuento de todas las Pandacoins que son recolectadas por usuarios de alguna manera. (Hay comandos que no añaden Pandacoins al clan para recuento)

- .transferir <cantidad> @usuario
> Transfieres Pandacoins de tu inventario al usuario mencionado. A todas las transferencias se les resta un 18% de la cantidad (IVA).

- .trabajar
> Laburas diariamente para conseguir Pandacoins y recursos.

- .robar @usuario
> Robas Pandacoins al usuario mencionado, le puedes quitar hasta el 10% de sus monedas totales. También existe la posibilidad de que te pille la policía y pierdas Pandacoins (hasta el 10%).

- .code <código>
> Canjeas un código, si es válido puedes ganar o perder Pandacoins. Por ejemplo: .code bienvenida (si el código «bienvenida» es válido, obtendrás pandacoins)

- .globalrank
> Revisas el Ranking Global de usuarios con más Pandacoins.

- .granja
> ¡Inicia tu camino como granjero! Las granjas son un sistema de auto-ganancia de Pandacoins, usa .granja help para ver más información.

- .logros
> Revisas tus logros pendientes y completados. (Comando importante)

- .titles
> Sistema de títulos, puedes revisar tu inventario de titulos o la tienda de títulos. Recuerda que los titulos que equipes se mostrarán en tu perfil de PandaBot.

- .shop2:
> Revisas la tienda de títulos.

- .buytitle <título>
> Compras el título insertado con Pandacoins. Para confirmar tu compra debes usar el subcomando que el bot te mostrará.

🛡 🅟⃞𝗲𝗿𝘀𝗼⵿𝗻𝗮𝗷𝗲𝘀::

- .ps
> Obtienes un personaje aleatorio de la lista, totalmente gratis.

- .robarps <lista/@usuario>
> Robas un personaje de la lista o a un usuario en específico.

- .sell2 <personaje>
> Vendes al personaje, obtienes su precio en Pandacoins.

- .misps
> Muestra tu inventario de personajes, también el valor total entre todos ellos.

- .viewps
> Revisas la lista completa de personajes que existen en PandaBot y sus precios.

- .viewstock <personaje>
> Revisas el stock del personaje.

- .toppersonajes
> Revisas el Top 10 usuarios con más personajes.

- .regalarps <nombre> @usuario
> Le regalas el personaje al usuario mencionado.

- .myindex
> Revisas tu índice de personajes, si vendes un personaje se olvida del índice, si completas el índice de personajes envía una prueba al creador de PandaBot, con esto obtendrás VIP permanente.

- .favorito <nombre escrito tal cual aparece en la lista>
> Defines a uno de tus personajes como favorito, esto se mostrará en tu perfil.

- .buy2 <nombre>
> Compras al personaje insertado. No podrás comprar al personaje si no tiene stock disponible. Hay probabilidades de que a tu personaje le caiga algún efecto, eso hará que al venderlo obtengas más dinero del que gastaste al comprarlo, ojo, también hay efectos que reducen el precio de tu personaje.

- .verps <personaje>
> Revisas las estadísticas del personaje.

- .expedicion <nombre>
> Envías a uno de tus personajes a una expedición, según la rareza del personaje la expedición tendrá distinto tiempo de espera. (Contiene recompensas) *Usa .expedicion* para ver más información.

- .checkps <nombre>
> Revisas cuantos usuarios tienen al personaje que insertaste.

🍕 🅟⃞𝗶𝘇𝘇𝗲᤺𝗿𝗶́𝗮::

- .regpizzeria
> ¡Registras tu Pizzería de PandaBot!

- .pzzname <nombre>
> Creas un nombre para tu pizzería.

- .mipizzeria
> Muestra toda la información de tu pizzería.

- .imagenpizzeria (citando a una imagen)
> Añades una imagen a tu pizzería que se mostrará cada vez que uses *.mipizzeria*

- .missv
> Muestra tus servicios contratados para tu pizzería.

- .contratarsv <servicio>
> Contratas un servicio para tu pizzería.

- .comprarasiento
> Compras un asiento para tu pizzería.

- .comprarasientos
> Compras todos los asientos que puedas de golpe, te ahorras el usar *.comprarasiento* varias veces.

- .viewsv
> Revisas todos los servicios disponibles para tu pizzería, estos consumen un porcentaje de tu ganancia.

- .reclamarpzz
> Reclamas las ganancias acumuladas de tu pizzería.

- .lvlpizzeria
> Muestra los requisitos necesarios para subir de nivel tu pizzería.

- .lvlup
> Subes de nivel a tu pizzería.

- .solicitarespejo <ID>
> Solicitas ser cuenta espejo (pizzería) de la ID especificada.

- .revisarpeticiones
> Revisas las peticiones de cuenta espejo de tu pizzería.

- .aceptarpeticion <ID>
> Aceptas la petición de cuenta espejo de tu pizzería.

- .toppizzerias
> Revisas los rankings de las mejores pizzerías del bot.

💸 🅒⃞𝗼𝗶𝗻 🅜⃞𝗮𝘀𝘁𝗲𝗿::

- .tirar
> Haces una tirada donde puedes obtener: Coins CM, Créditos, Escudos o Giros.

- .tirar10
> Haces 10 tiradas de una sola vez, ideal para ahorrar tiempo. Este comando no ayuda a progresar en los logros de Coin Master.

- .tirar20
> Haces 10 tiradas de una sola vez, ideal para ahorrar tiempo. Este comando no ayuda a progresar en los logros de Coin Master.

- .megatirar
> Haces 30 tiradas de una sola vez, ideal para ahorrar tiempo. Este comando no ayuda a progresar en los logros de Coin Master.

- .dailycm
> Reclamas tus 5 giros diarios.

- .walletcm
> Revisas tu inventario y estadísticas del sistema Coin Master.

- .mejorar
> Mejoras tu aldea con coins CM.

- .atacar @usuario
> Atacas la aldea del usuario mencionado, ganarás coins de CM por hacer esto, no hay posibilidad de fallar el ataque.

- .regalartiros <cantidad> @usuario
> Le regalas la cantidad de tiros CM al usuario mencionado.

- .pay <coinsCM> @usuario
> Le regalas coins CM al usuario mencionado. No pide impuestos.

- .robarcm @usuario
> Robas coins CM del usuario mencionado

💱 🅘⃞𝗻𝘃𝗲𝗿꯭𝘀𝗶𝗼𝗻𝗲֟𝘀::

- .invertir <moneda>
> Inviertes Pandacoins en una moneda digital.

- .mercado
> Muestra todos los valores y estados de las diferentes monedas digitales de PandaBot.

- .miinversion
> Muestra tu inversión actual.

- .retirar <cantidad/all> <moneda>
> Retiras la cantidad de Pandacoins que invertiste en la moneda.

- .hackear @usuario
> Hackeas la inversión del usuario mencionado y le quitas un 10% de lo que tenía invertido, si el usuario no tiene inversiones, pierdes el 10% de tus Pandacoins totales.

🗣 🅘⃞𝗱𝗲𝗮֟𝘀 𝗬 🅞⃞𝗽𝗶֔𝗻𝗶𝗼⵿𝗻𝗲᪲𝘀::

- .reporte <tu reporte>
> Reportas algún error del bot. Si tu aporte es bueno serás recompensado.

- .pregunta <pregunta>
> Haces una pregunta sobre PandaBot a los Owners, solo preguntas serias por favor.

- .sugerencia <mensaje>
> Envías una sugerencia del bot a los Owners, si la sugerencia es considerablemente buena, serás recompensado.

📜 🅐⃞𝗻͠𝘂𝗻𝗰𝗶𝗼⵿𝘀 𝗬 🅡⃞𝗲𝗰𝗼꯭𝗺𝗽𝗲𝗻֟𝘀𝗮𝘀::

- .get <recurso>
> Comando para obtener un recurso viendo un anuncio, para reclamar correctamente, debes ver los anuncios hasta que aparezca el código que tendrás que copiar.

- .claimcode <código>
> Reclamas la recompensa de *.get*

- .anunciostotales
> Revisas la cantidad de anuncios totales vistos en el bot.

- .topaportes
> Revisas el ranking de usuarios con más anuncios vistos.

🍀 🅓⃞𝗲𝘀ᮬ᪲𝗰𝗮𝗿𝗴𝗮̫𝘀 𝗬 🅜⃞𝗲̼𝗱𝗶᤺𝗮::

- .play <canción>
> Reproduces la canción que quieras a cambio de 30 créditos, los créditos son conseguibles en *.tirar*.

- .spotify <canción>
> Buscas música en PandaBot, es como .play pero sin mostrar la información de la canción.

- .tiktok <link>
> PandaBot envía el video descargado y sin marca de agua.

- .toimg (respondiendo a un sticker)
> Transformas un sticker a imágen.

- .toaudio (respondiendo a un video)
> Conviertes el video a audio.

- .ytmp4 <link>
> Descargas un video de YouTube, no pidas videos de alta duración.

- .youtube <busqueda>
> Buscas algo en YouTube.

- .waifu
> El Bot envía una Waifu aleatoria.

- .qr <texto>
> Creas un código QR que muestra lo que hayas escrito.

- .imagen <busqueda>
> PandaBot busca una imagen con lo que hayas descrito y la enviará, este comando no es 100% preciso.

- .instagram <link de algún reel>
> Descargas el Reel sin marca de agua.

- .imdb <pelicula/serie>
> PandaBot muestra información sobre lo que hayas buscado.

- .cat
> PandaBot envía una imagen aleatoria de un gatito.

- .dog
> PandaBot envía una foto aleatoria de un perrito.

- .rabbit
> PandaBot envía una imagen aleatoria de un conejo.

⚽️ 🅕⃞𝘂𝘁𝗯꯭𝗼𝗹::

- .formacion
> Defines tu formación de fútbol, este sistema no está al 100% correctamente programado así que se recomienda usar *.formacion 4-3-3*.

- .alinear
> Alineas a uno de tus personajes en tu formación de fútbol.

- .equipo
> Muestra la plantilla de tu equipo de personajes.

- .resetalineacion
> Reseteas tu alineación actual de personajes.

- .remover
> Remueves a un personaje de tu plantilla.

🔥 🅜⃞𝗮꯭𝗻𝗲𝗷𝗼 𝗗︪︩𝗲 🅖⃞𝗿𝘂᪲𝗽⵿𝗼𝘀::

- .antilink on/off
> Activas la función para que el bot elimine a cada usuario que envíe un enlace.

- .modoadmin on/off
> Activas la función para que el bot solo pueda ser usado por los admins.

- .warn @usuario 
> Le colocas una advertencia al usuario mencionado. La advertencia aparecerá en el grupo de advertencias y baneos de la comunidad de PandaBot.

- .advertencias
> Revisas las advertencias de los usuarios de un grupo.

- .unwarn @usuario
> Le quitas una advertencia al usuario mencionado.

- .grupo
> Comando para abrir y cerrar el grupo (.grupo abrir, .grupo cerrar), requiere que PandaBot sea administrador.

- .promote @usuario1 @usuario2 @usuario3...
> Le das admin del grupo a los usuarios que menciones en el comando.

- .demote @usuario
> Quitas de administrador al usuario mencionado.

🔝 🅤⃞𝘁𝗶𝗹⵿𝗶𝗱𝗮𝗱𝗲࣫ᰰ𝘀::

- .addbot <enlace>
> Envías una solicitud a los Owners para que PandaBot se una a tu grupo.

- .acortar <enlace>
> Acortas el enlace insertado.

- .admins:
> El bot menciona a los Administradores del grupo.

- .calc
> Es una calculadora, wow.

- .styletext
> ¡Dale estilo al texto que elijas!

- .setbirthday <DD/MM>
> Registras tu fecha de cumpleaños en el bot, ejemplo: 01/02 (1 de febrero).

- .s (responder a una imagen o video muy corto)
> Transformas la imagen a sticker, en caso de hacer sticker a algún video, se recomienda revisar el peso de este, lo apropiado es de 300kb aprox.

- .stickertovideo (respondiendo a un sticker)
> Transformas el sticker a video, solo funciona en stickers en movimiento, para imagenes usa *.toimg*

- .tiktoksearch <búsqueda>
> Buscas algo en TikTok estando en el bot.

- .tiktokstalk <nombre de la cuenta>
> Revisas la información de una cuenta de tiktok.

- .traducir <idioma> <texto>
> Traduces el texto al idioma que hayas elegido. Ejemplo: .traducir en hola (Traduce *hola* al inglés)

- .tts <idioma> <texto>
> El bot envía un audio diciendo tu texto, en el idioma que hayas puesto.

- .wm <descripcion> (citando al sticker)
> Cambias el paquete del sticker citado. Usa *.wm* para más información.

- .pfp @usuario
> PandaBot envía la foto de perfil del usuario mencionado.

- .mybirthday
> Revisas tu fecha de cumpleaños establecida en PandaBot.

- .morse <codificar/decodificar> <texto>
> Puedes crear frases o palabras en código morse y también decodificar frases o palabras que estén en morse.

- .listbirthdays
> Muestra la lista de todos los cumpleaños de usuarios registrados.

- .invocar <mensaje>
> Invocas a todos los usuarios del grupo con un mensaje que escribas.

- .hidetag <texto>
> El bot envía un mensaje con lo que hayas insertado como texto, este mensaje menciona a todos los usuarios del grupo pero sin mostrarlo públicamente.

- .ban/.kick/.cum
> Cualquiera de estos 3 comandos sirven para expulsar a un miembro del grupo. Recuerda: No puedes expulsar al creador del grupo.

- .groupinfo
> Revisas la información del grupo.

- .github <repositorio>
> PandaBot muestra información del repositorio insertado.

- .pokedex <pokemon>
> Buscas información de un Pokemon en la Pokedex.

- .chatgpt <texto>
> Haces una pregunta o algún comentario a Chat GPT.

- .bot <texto>
> Hablas con PandaBot.

- .rules
> Revisas las reglas principales y más importantes del bot.

💗 🅛⃞𝗼᪲𝘃𝗲ᮬ::

- .marry @usuario
> Envías una solicitud al usuario para casarte con él/ella

- .aceptar
> Aceptas la solicitud de matrimonio (.marry)

- .hermano @usuario
> Envías una solicitud para ser hermano del usuario mencionado.

- .aceptarhermano
> Aceptas la solicitud de hermano.

- .beso @usuario
> Besas al usuario mencionado.

- .divorcio
> Te divorcias de tu pareja.

- .kiss @usuario
> Besas al usuario mencionado y PandaBot envía un GIF.

- .love @usuario
> Medidor de amor entre tú y el usuario mencionado.

- .pareja
> El bot genera a una pareja aleatoria en el grupo.

- .piropo
> PandaBot envía un piropo aleatorio.

- .ship @usuario1 @usuario2
> Shipeas a dos integrantes del grupo.

🛎 🅢⃞𝗶𝘀𝘁𝗲᪲𝗺𝗮᳟::

- .checkowner
> Revisas si eres Owner de PandaBot o no.

- .checkvip
> Revisas si eres VIP o no, si eres VIP el bot te mostrará cuantas horas te quedan.

- .allfunctions
> Revisas la cantidad de comandos del bot.

- .creditos
> Créditos del Bot.

- .getjid @usuario
> Obtienes el JID del usuario mencionado.

- .listavip
> PandaBot muestra los JIDs de todos los usuarios VIP y cuanto tiempo les queda.

- .buyvip
> Revisas los precios del VIP, ya sea por Pandacoins o con dinero real, el pago debes hacerlo al creador del bot. Para comprar un ticket VIP por 24 horas usa *.buyvip ticket*.

- .menu
> Muestra este menú.

- .myid
> Revisas tu ID de usuario.

- .mylid
> Revisas tu LID de usuario.

- .perfil
> Muestra tu perfil completo del bot combinando sistema de logros, personajes, Coin Master y Pizzería PandaBot. También muestra otras estadísticas como tus robos fallidos, tus Pandacoins, tu título equipado, tu pareja, entre otras cosas.

- .ping
> Muestra la latencia en *ms* del bot, también sirve para comprobar si el bot está prendido.

- .uptime
> Muestra cuánto tiempo lleva PandaBot encendido.

👑 🅥⃞𝗶፝֟͠𝗽::

- .autoreclamarpzz (VIP)
> Ahora tus ganancias de Pizzacoins se reclamarán automáticamente, no hay necesidad de usar .reclamarpzz otra vez.

- .dropvip (VIP)
> Reclamas un personaje aleatorio de calidad Ultra-Legendario o mejor.

- .magicbox (VIP)
> Abres una caja que puede contener distintos recursos.

- .afk (VIP)
> Sistema de AFK que te protege de robos pero que también hace que no puedas robar hasta desactivarlo. Usa *.afk help* para más información.

- .qc <frase pequeña> (VIP)
> Creas un sticker que muestra a tu usuario diciendo lo que colocaste como texto.

- .sellall (VIP)
> Vendes todos los personajes de tu inventario.

*Otros beneficios VIP*:

-Prioridad para que se acepte al bot en tu grupo.
-Prioridad en sugerencias y reportes.
-Grupo VIP exclusivo para usuarios.
-70% de probabilidad en robos a usuarios.
 Y más.
`;
    await sock.sendMessage(from, {
      image: { url: pandaBotPhoto },
      caption: menu.trim(),
      footer: '📢 Canal oficial de PandaBot',
      buttons: [
        {
          buttonId: 'canal_oficial',
          buttonText: { displayText: '🌐 Ir al Canal' },
          type: 1
        }
      ],
      headerType: 4,
      externalAdReply: {
        title: 'PandaBot Canal Oficial',
        body: 'Haz clic para unirte al canal',
        mediaType: 1,
        thumbnailUrl: pandaBotPhoto,
        sourceUrl: pandaChannel
      }
    }, { quoted: msg });

  } catch (err) {
    console.error('❌ Error enviando el menú:', err);
    await sock.sendMessage(from, {
      text: '❌ Ocurrió un error al cargar el menú. Intenta más tarde.',
    }, { quoted: msg });
  }
}

