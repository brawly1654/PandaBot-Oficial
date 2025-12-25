#!/bin/bash

# PandaBot - PM2 Run Script
# Este script gestiona el bot usando PM2 en un servidor Linux

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directorio del proyecto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Función para mostrar mensajes
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Verificar que PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    log_error "PM2 no está instalado. Por favor instálalo con: npm install -g pm2"
    exit 1
fi

# Verificar que Node.js está instalado
if ! command -v node &> /dev/null; then
    log_error "Node.js no está instalado. Por favor instálalo primero."
    exit 1
fi

# Función para iniciar el bot
start_bot() {
    local daemon_mode="${1:-normal}"
    
    log_info "Iniciando PandaBot con PM2..."
    
    # Verificar si el bot ya está corriendo (solo en modo normal)
    if [ "$daemon_mode" = "normal" ]; then
        if pm2 describe bot &>/dev/null && pm2 list | grep -q "│ bot.*│ online"; then
            log_warning "PandaBot ya está corriendo. Usa 'restart' para reiniciar."
            return 0
        fi
    fi
    
    # Iniciar usando el archivo de configuración de PM2
    if [ "$daemon_mode" = "systemd" ]; then
        # Modo para systemd: ejecutar PM2 sin daemon
        exec pm2 start ecosystem.config.cjs --no-daemon
    else
        # Modo normal: PM2 como daemon
        pm2 start ecosystem.config.cjs
        
        # Guardar configuración de PM2
        pm2 save
        
        log_info "✅ PandaBot iniciado correctamente!"
        log_info "Usa 'pm2 logs bot' para ver los logs en tiempo real."
        log_info "Usa 'pm2 monit' para monitorear el bot."
    fi
}

# Función para detener el bot
stop_bot() {
    log_info "Deteniendo PandaBot..."
    pm2 stop bot 2>/dev/null || log_warning "El bot no estaba corriendo."
    log_info "✅ PandaBot detenido."
}

# Función para reiniciar el bot
restart_bot() {
    log_info "Reiniciando PandaBot..."
    pm2 restart bot 2>/dev/null || {
        log_warning "No se pudo reiniciar. Intentando iniciar..."
        start_bot
        return
    }
    log_info "✅ PandaBot reiniciado correctamente!"
}

# Función para ver el estado
status_bot() {
    log_info "Estado de PandaBot:"
    pm2 list | grep "bot" || log_warning "No hay procesos corriendo."
}

# Función para ver los logs
logs_bot() {
    log_info "Mostrando logs de PandaBot (Ctrl+C para salir)..."
    pm2 logs bot
}

# Función para eliminar del PM2
delete_bot() {
    log_info "Eliminando PandaBot de PM2..."
    pm2 delete bot 2>/dev/null || log_warning "El bot no estaba en PM2."
    pm2 save
    log_info "✅ PandaBot eliminado de PM2."
}

# Procesar comandos
case "${1:-start}" in
    start)
        start_bot normal
        ;;
    systemd)
        # Modo especial para systemd
        start_bot systemd
        ;;
    stop)
        stop_bot
        ;;
    restart)
        restart_bot
        ;;
    status)
        status_bot
        ;;
    logs)
        logs_bot
        ;;
    delete)
        delete_bot
        ;;
    *)
        echo "Uso: $0 {start|stop|restart|status|logs|delete}"
        echo ""
        echo "Comandos:"
        echo "  start   - Inicia el bot con PM2"
        echo "  stop    - Detiene el bot"
        echo "  restart - Reinicia el bot"
        echo "  status  - Muestra el estado del bot"
        echo "  logs    - Muestra los logs en tiempo real"
        echo "  delete  - Elimina el bot de PM2"
        exit 1
        ;;
esac

exit 0
