// lib/cacheManager.js
import fs from 'fs';

let personajesCache = null;
let itemsCache = null;
let lastLoadTime = 0;

export function cargarDatos() {
    const now = Date.now();
    
    if (!personajesCache || !itemsCache || now - lastLoadTime > 300000) {
        try {
            const personajesData = JSON.parse(fs.readFileSync('./data/personajes.json', 'utf8'));
            const itemsData = JSON.parse(fs.readFileSync('./data/items.json', 'utf8'));
            
            personajesCache = personajesData.characters;
            itemsCache = itemsData.items;
            lastLoadTime = now;
            
            console.log('📦 Cache recargada desde archivos');
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            personajesCache = [];
            itemsCache = [];
        }
    }
    
    return { personajes: personajesCache, items: itemsCache };
}

export function limpiarCache() {
    personajesCache = null;
    itemsCache = null;
    lastLoadTime = 0;
    console.log('🔄 Cache limpiada manualmente');
}

export function obtenerPersonajes() {
    return personajesCache;
}

export function obtenerItems() {
    return itemsCache;
}

// Función para agregar personajes con efectos a la caché
export function agregarPersonajeConEfectos(nuevoPersonaje) {
    if (!personajesCache) {
        // Si no hay caché, recargar primero
        cargarDatos();
    }
    
    // Verificar si ya existe
    const existe = personajesCache.find(p => p.nombre === nuevoPersonaje.nombre);
    if (!existe) {
        personajesCache.push(nuevoPersonaje);
        console.log(`✅ Personaje con efectos agregado a caché: ${nuevoPersonaje.nombre}`);
        
        // También guardar en el archivo
        try {
            const data = JSON.parse(fs.readFileSync('./data/personajes.json', 'utf8'));
            data.characters.push(nuevoPersonaje);
            fs.writeFileSync('./data/personajes.json', JSON.stringify(data, null, 2));
            console.log(`💾 Personaje guardado en archivo: ${nuevoPersonaje.nombre}`);
        } catch (error) {
            console.error('❌ Error guardando personaje en archivo:', error);
        }
    }
    
    return !existe; // Devuelve true si se agregó, false si ya existía
}
