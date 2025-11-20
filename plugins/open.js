import fs from 'fs';
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

    // SPOOKY LUCKY BLOCK
    if (luckyBlockType === 'spooky lucky block') {
        if (!user.inventario?.includes("Spooky Lucky Block")) {
            await sock.sendMessage(from, { text: '❌ No tienes Spooky Lucky Blocks para abrir.' });
            return;
        }

        user.inventario.splice(user.inventario.indexOf("Spooky Lucky Block"), 1);

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
        }

        const resultado = elegir();

        let mostrando = await sock.sendMessage(from, { text: `🎁 Abriendo...` });

        const anim = ["🎃","👻","🎃","👻","🎃","👻","💀"];

        for (let i = 0; i < anim.length; i++) {
            await new Promise(r => setTimeout(r, 500));
            await sock.sendMessage(from, { edit: mostrando.key, text: `🎁 Abriendo... ${anim[i]}` });
        }

        user.personajes.push(resultado);
        guardarDatabase(db);

        await sock.sendMessage(from, { edit: mostrando.key, text: `🎉 ¡Has obtenido a *${resultado}*!` });
        return;
    }

    // XMAS LUCKY BLOCK (NUEVO)
    if (luckyBlockType === 'xmas lucky block') {
        if (!user.inventario?.includes("Xmas Lucky Block")) {
            await sock.sendMessage(from, { text: '❌ No tienes Xmas Lucky Blocks para abrir.' });
            return;
        }

        user.inventario.splice(user.inventario.indexOf("Xmas Lucky Block"), 1);

        const posibles = [
            ["Santa PandaBot", 75],
            ["Xmas Zeus", 3],
            ["Xmas Lukas", 3],
            ["Xmas Nyan Cat", 6],
            ["Xmas El Anti-Cristo", 6],
            ["Xmas 67", 5],
            ["Xmas Everything", 1],
            ["Santa Claus Legendario", 0.8],
            ["Rudolph el Reno", 0.2]
        ];

        function elegir() {
            let r = Math.random() * 100;
            for (let [nombre, p] of posibles) {
                if (r < p) return nombre;
                r -= p;
            }
        }

        const resultado = elegir();

        let mostrando = await sock.sendMessage(from, { text: `🎁 Abriendo...` });

        const anim = ["🎄","🎅","❄️","☃️","🌟","🎁","✨"];

        for (let i = 0; i < anim.length; i++) {
            await new Promise(r => setTimeout(r, 500));
            await sock.sendMessage(from, { edit: mostrando.key, text: `🎁 Abriendo... ${anim[i]}` });
        }

        user.personajes.push(resultado);
        guardarDatabase(db);

        await sock.sendMessage(from, { edit: mostrando.key, text: `🎉 ¡Has obtenido a *${resultado}*!` });
        return;
    }

    // Si no especifica qué lucky block abrir
    await sock.sendMessage(from, { 
        text: '❌ Especifica qué Lucky Block quieres abrir:\n• `.open Spooky Lucky Block`\n• `.open Xmas Lucky Block`' 
    });
}
