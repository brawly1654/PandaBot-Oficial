import fs from 'fs';

const MARKET_FILE = './data/cryptomarket.json';

export function actualizarMercado() {
    try {
        const marketData = JSON.parse(fs.readFileSync(MARKET_FILE, 'utf8'));
        const ahora = new Date();
        const ultimaActualizacion = new Date(marketData.ultimaActualizacion);
        
        // Verificar si necesita actualización (cada 15 minutos por defecto)
        const minutosDesdeUltimaActualizacion = (ahora - ultimaActualizacion) / (1000 * 60);
        const intervaloActualizacion = 60 / marketData.actualizacionesPorHora;

        if (minutosDesdeUltimaActualizacion >= intervaloActualizacion) {
            // Actualizar precios de todas las monedas
            Object.values(marketData.monedas).forEach(moneda => {
                moneda.precioAnterior = moneda.precioActual;
                
                // Generar cambio aleatorio basado en volatilidad
                const cambio = (Math.random() - 0.5) * 2 * moneda.volatilidad;
                moneda.precioActual *= (1 + cambio);
                
                // Mantener precio mínimo
                if (moneda.precioActual < 0.1) moneda.precioActual = 0.1;
                
                // Guardar en historial (últimas 24 horas)
                moneda.historial.push({
                    precio: moneda.precioActual,
                    timestamp: ahora.toISOString()
                });
                
                // Mantener solo últimas 24 entradas
                if (moneda.historial.length > 24) {
                    moneda.historial = moneda.historial.slice(-24);
                }
            });

            marketData.ultimaActualizacion = ahora.toISOString();
            fs.writeFileSync(MARKET_FILE, JSON.stringify(marketData, null, 2));
        }

        return true;
    } catch (error) {
        console.error('Error actualizando mercado:', error);
        return false;
    }
}

export function obtenerEstadoMercado() {
    try {
        return JSON.parse(fs.readFileSync(MARKET_FILE, 'utf8'));
    } catch (error) {
        console.error('Error obteniendo estado del mercado:', error);
        return null;
    }
}

export function obtenerPrecioMoneda(monedaId) {
    try {
        const marketData = JSON.parse(fs.readFileSync(MARKET_FILE, 'utf8'));
        return marketData.monedas[monedaId] || null;
    } catch (error) {
        console.error('Error obteniendo precio:', error);
        return null;
    }
}

// Inicializar mercado si no existe
export function inicializarMercado() {
    try {
        JSON.parse(fs.readFileSync(MARKET_FILE, 'utf8'));
    } catch (error) {
        // Crear archivo si no existe
        const mercadoInicial = {
            "monedas": {
                "LILANCOIN": {
                    "nombre": "LilanCoin",
                    "precioActual": 1.0,
                    "precioAnterior": 1.0,
                    "volatilidad": 0.02,
                    "historial": [],
                    "color": "🟡"
                },
                "DRAGONTOKEN": {
                    "nombre": "DragonToken", 
                    "precioActual": 50.0,
                    "precioAnterior": 50.0,
                    "volatilidad": 0.08,
                    "historial": [],
                    "color": "🔴"
                },
                "UNISTAR": {
                    "nombre": "UniStar",
                    "precioActual": 100.0,
                    "precioAnterior": 100.0,
                    "volatilidad": 0.12,
                    "historial": [],
                    "color": "🔵"
                }
            },
            "ultimaActualizacion": new Date().toISOString(),
            "actualizacionesPorHora": 4
        };
        
        fs.writeFileSync(MARKET_FILE, JSON.stringify(mercadoInicial, null, 2));
    }
}

// Inicializar al cargar el módulo
inicializarMercado();
