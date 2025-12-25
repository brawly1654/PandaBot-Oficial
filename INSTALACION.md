# PandaBot - Instalación y Configuración

## Requisitos Previos

- Node.js (versión 16 o superior)
- npm o yarn
- PM2 (Process Manager para Node.js)
- systemd (para ejecutar como servicio en el servidor)

## Instalación de PM2

Si no tienes PM2 instalado, instálalo globalmente:

```bash
npm install -g pm2
```

## Uso del Script run.sh

El script `run.sh` proporciona una interfaz simple para gestionar el bot con PM2:

```bash
# Iniciar el bot
./run.sh start

# Detener el bot
./run.sh stop

# Reiniciar el bot
./run.sh restart

# Ver el estado del bot
./run.sh status

# Ver los logs en tiempo real
./run.sh logs

# Eliminar el bot de PM2
./run.sh delete
```

## Instalación como Servicio Systemd

Para ejecutar PandaBot como un servicio del sistema que se inicia automáticamente al arrancar el servidor:

### 1. Crear un usuario del sistema (opcional pero recomendado)

```bash
sudo useradd -r -s /bin/bash -d /home/pandabot -m pandabot
```

### 2. Copiar el proyecto al directorio del usuario

```bash
sudo cp -r /ruta/al/proyecto /home/pandabot/PandaBot-Oficial
sudo chown -R pandabot:pandabot /home/pandabot/PandaBot-Oficial
```

### 3. Instalar dependencias

```bash
sudo -u pandabot bash -c "cd /home/pandabot/PandaBot-Oficial && npm install"
```

### 4. Instalar PM2 para el usuario (si es necesario)

```bash
sudo npm install -g pm2
```

### 5. Copiar el archivo de servicio

**IMPORTANTE**: Antes de copiar el archivo de servicio, edita `pandabot.service` y ajusta:
- `User=` y `Group=` (tu usuario del sistema)
- `WorkingDirectory=` (ruta absoluta a tu proyecto)
- Rutas en `ExecStart`, `ExecReload` y `ExecStop`

```bash
sudo cp pandabot.service /etc/systemd/system/
```

### 6. Recargar systemd y habilitar el servicio

```bash
sudo systemctl daemon-reload
sudo systemctl enable pandabot.service
```

### 7. Iniciar el servicio

```bash
sudo systemctl start pandabot.service
```

## Comandos Útiles del Servicio Systemd

```bash
# Ver el estado del servicio
sudo systemctl status pandabot

# Iniciar el servicio
sudo systemctl start pandabot

# Detener el servicio
sudo systemctl stop pandabot

# Reiniciar el servicio
sudo systemctl restart pandabot

# Ver los logs del servicio
sudo journalctl -u pandabot -f

# Ver los logs de PM2
pm2 logs bot

# Deshabilitar inicio automático
sudo systemctl disable pandabot
```

## Configuración Personalizada

### Editar el archivo de servicio

Si necesitas personalizar el servicio, edita el archivo en `/etc/systemd/system/pandabot.service`:

```bash
sudo nano /etc/systemd/system/pandabot.service
```

Después de cualquier cambio, recarga systemd:

```bash
sudo systemctl daemon-reload
sudo systemctl restart pandabot
```

### Variables de Entorno

Puedes agregar variables de entorno adicionales en la sección `[Service]` del archivo `.service`:

```ini
Environment="NODE_ENV=production"
Environment="API_KEY=tu_api_key"
Environment="TZ=America/Mexico_City"
```

## Solución de Problemas

### El servicio no inicia

1. Verifica los logs:
```bash
sudo journalctl -u pandabot -n 50
```

2. Verifica que PM2 esté instalado:
```bash
which pm2
```

3. Verifica los permisos del directorio:
```bash
ls -la /home/pandabot/PandaBot-Oficial
```

### El bot se detiene inesperadamente

PM2 reiniciará automáticamente el bot si falla. Revisa los logs:

```bash
pm2 logs bot --lines 100
```

### Cambiar el usuario que ejecuta el servicio

Si quieres ejecutar el servicio con tu usuario actual:

1. Edita el archivo de servicio
2. Cambia `User=` y `Group=` a tu usuario
3. Cambia `WorkingDirectory=` a la ruta donde tienes el proyecto
4. Recarga y reinicia el servicio

## Notas Importantes

- El archivo `ecosystem.config.cjs` contiene la configuración de PM2 para el bot
- El servicio está configurado para reiniciar automáticamente en caso de fallo
- Los logs se guardan en el journal de systemd y también están disponibles a través de PM2
- El servicio se inicia automáticamente al arrancar el sistema si está habilitado

## Diferencias entre start.sh y run.sh

- **start.sh**: Script original diseñado para Termux (Android)
- **run.sh**: Nuevo script diseñado para servidores Linux estándar con funcionalidad completa de gestión
