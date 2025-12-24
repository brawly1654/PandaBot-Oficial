import { cargarDatabase, guardarDatabase } from '../data/database.js';

export const command = 'open';

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const db = cargarDatabase();
    db.users = db.users || {};
    const user = db.users[sender];

    const luckyBlockType = args.join(' ').toLowerCase();

    if (!user) {
        await sock.sendMessage(from, { text: '❌ No estás registrado. Usa `.registrar` para empezar.' });
        return;
    }

    // AÑADIDO: Inicializar inventario si no existe
    if (!user.inventario) {
        user.inventario = [];
    }

    // SPOOKY LUCKY BLOCK
    if (luckyBlockType === 'spooky lucky block') {
        // AÑADIDO: Verificar que sea array y contenga el item
        if (!Array.isArray(user.inventario) || !user.inventario.includes("Spooky Lucky Block")) {
            await sock.sendMessage(from, { text: '❌ No tienes Spooky Lucky Blocks para abrir.' });
            return;
        }

        const index = user.inventario.indexOf("Spooky Lucky Block");
        if (index !== -1) {
            user.inventario.splice(index, 1);
        }

        const posibles = [
            ["The Spooky PandaBot", 80],
            ["Spooky Zeus", 2.5],
            ["Spooky Lukas", 2.5],
            ["Spooky Nyan Cat", 5],
            ["Spooky El Anti-Cristo", 5],
            ["Spooky 67", 4.5],
            ["Spooky Everything", 0.5]
        ];

        function elegir() {
            let r = Math.random() * 100;
            for (let [nombre, p] of posibles) {
                if (r < p) return nombre;
                r -= p;
            }
            // Fallback si algo sale mal
            return posibles[0][0];
        }

        const resultado = elegir();

        let mostrando = await sock.sendMessage(from, { text: `🎁 Abriendo Spooky Lucky Block...` });

        const anim = ["🎃","👻","🎃","👻","🎃","👻","💀"];

        for (let i = 0; i < anim.length; i++) {
            await new Promise(r => setTimeout(r, 500));
            try {
                await sock.sendMessage(from, { edit: mostrando.key, text: `🎁 Abriendo... ${anim[i]}` });
            } catch (e) {
                // Si falla la edición, continuar
                console.log('Error editando mensaje:', e.message);
            }
        }

        // AÑADIDO: Inicializar personajes si no existe
        if (!user.personajes) {
            user.personajes = [];
        }

        user.personajes.push(resultado);
        guardarDatabase(db);

        await sock.sendMessage(from, { 
            edit: mostrando.key, 
            text: `🎉 ¡Has obtenido a *${resultado}*!\n\n📦 Lucky Blocks restantes: ${user.inventario.filter(item => item === "Spooky Lucky Block").length}` 
        });
        return;
    }

    // XMAS LUCKY BLOCK
    if (luckyBlockType === 'xmas lucky block') {
        // AÑADIDO: Verificar que sea array y contenga el item
        if (!Array.isArray(user.inventario) || !user.inventario.includes("Xmas Lucky Block")) {
            await sock.sendMessage(from, { text: '❌ No tienes Xmas Lucky Blocks para abrir.' });
            return;
        }

        const index = user.inventario.indexOf("Xmas Lucky Block");
        if (index !== -1) {
            user.inventario.splice(index, 1);
        }

        const posibles = [
            ["Santa PandaBot", 75],
            ["Cirilo Navideño", 3],
            ["Xmas Lukas", 3],
            ["Xmas Nyan Cat", 6],
            ["Rodolfo el Reno", 6],
            ["Xmas Lilan", 5],
            ["Xmas Everything", 1],
            ["Santa Claus Legendario", 0.8],
            ["Jesucristo", 0.1]
        ];

        function elegir() {
            let r = Math.random() * 100;
            for (let [nombre, p] of posibles) {
                if (r < p) return nombre;
                r -= p;
            }
            // Fallback si algo sale mal
            return posibles[0][0];
        }

        const resultado = elegir();

        let mostrando = await sock.sendMessage(from, { text: `🎁 Abriendo Xmas Lucky Block...` });

        const anim = ["🎄","🎅"];

        for (let i = 0; i < anim.length; i++) {
            await new Promise(r => setTimeout(r, 500));
            try {
                await sock.sendMessage(from, { edit: mostrando.key, text: `🎁 Abriendo... ${anim[i]}` });
            } catch (e) {
                console.log('Error editando mensaje:', e.message);
            }
        }

        // AÑADIDO: Inicializar personajes si no existe
        if (!user.personajes) {
            user.personajes = [];
        }

        user.personajes.push(resultado);
        guardarDatabase(db);

        await sock.sendMessage(from, { 
            edit: mostrando.key, 
            text: `🎉 ¡Has obtenido a *${resultado}*!\n\n📦 Lucky Blocks restantes: ${user.inventario.filter(item => item === "Xmas Lucky Block").length}` 
        });
        return;
    }

    // Si no especifica qué lucky block abrir
    await sock.sendMessage(from, { 
        text: '❌ Especifica qué Lucky Block quieres abrir:\n\n• `.open Spooky Lucky Block`\n• `.open Xmas Lucky Block`\n\n📦 Usa `.inventario` para ver cuántos tienes.' 
    });
}