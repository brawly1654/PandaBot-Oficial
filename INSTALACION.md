# PandaBot - Instalación y Configuración

## Requisitos Previos

- Node.js (versión 18 o superior recomendado)
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

### 1. Verificar la ubicación del proyecto

El archivo de servicio está preconfigurado para:
- **Usuario**: `root`
- **Directorio del proyecto**: `/root/PandaBot-Oficial`
- **PM2**: `/root/.nvm/versions/node/v20.19.6/bin/pm2`

Si tu configuración es diferente, edita `pandabot.service` antes de continuar.

### 2. Asegurar que el script run.sh es ejecutable

```bash
chmod +x /root/PandaBot-Oficial/run.sh
```

### 3. Copiar el archivo de servicio

```bash
sudo cp pandabot.service /etc/systemd/system/
```

### 4. Recargar systemd y habilitar el servicio

```bash
sudo systemctl daemon-reload
sudo systemctl enable pandabot.service
```

### 5. Iniciar el servicio

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

### Editar el archivo de servicio para tu entorno

El archivo `pandabot.service` viene preconfigurado para el servidor específico con:
- Usuario: `root`
- Directorio: `/root/PandaBot-Oficial`
- PM2: `/root/.nvm/versions/node/v20.19.6/bin/pm2`

Si tu configuración es diferente, edita `pandabot.service` **antes** de copiarlo:

```bash
nano pandabot.service
```

Ajusta las siguientes líneas según tu entorno:
- `User=` (tu usuario del sistema)
- `WorkingDirectory=` (ruta absoluta a tu proyecto)
- `Environment="PATH=..."` (incluye la ruta a tu PM2)
- `ExecStart=` (ruta al script run.sh)
- `ExecReload=`, `ExecStop=`, `ExecStopPost=` (ruta a tu PM2)

Después de copiar o modificar el archivo en `/etc/systemd/system/`, recarga systemd:

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
- El servicio systemd usa el script `run.sh` con el comando especial `systemd` que ejecuta PM2 en modo no-daemon
- El servicio está configurado para reiniciar automáticamente en caso de fallo
- Los logs se guardan en el journal de systemd y también están disponibles a través de PM2
- El servicio se inicia automáticamente al arrancar el sistema si está habilitado
- El archivo `pandabot.service` está preconfigurado para el servidor en `/root/PandaBot-Oficial` con Node.js v20.19.6

## Diferencias entre start.sh y run.sh

- **start.sh**: Script original diseñado para Termux (Android)
- **run.sh**: Nuevo script diseñado para servidores Linux estándar con funcionalidad completa de gestión
