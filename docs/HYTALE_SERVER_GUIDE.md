# Guía de Servidores Dedicados de Hytale

Esta guía cubre la configuración, administración y operación de servidores dedicados de Hytale mediante HyCore Agent.

---

## !!! Prerrequisitos - Lo que necesitas ANTES de usar el agente

Antes de poder utilizar HyCore Agent para gestionar servidores Hytale, asegúrate de tener lo siguiente instalado y configurado en tu instancia/máquina:

### Software Requerido

| Software | Versión | Descripción | Enlace |
|----------|---------|-------------|--------|
| **Node.js** | 18+ | Runtime para ejecutar el agente | [nodejs.org](https://nodejs.org/) |
| **Java** | 25 | Runtime para el servidor Hytale | [Adoptium](https://adoptium.net/) |
| **Git** | Cualquiera | Para clonar el repositorio (opcional) | [git-scm.com](https://git-scm.com/) |

### Archivos del Servidor Hytale

Debes obtener estos archivos **antes** de poder iniciar un servidor:

| Archivo | Descripción | Cómo obtenerlo |
|---------|-------------|----------------|
| `HytaleServer.jar` | Ejecutable del servidor | Launcher o hytale-downloader |
| `Assets.zip` | Assets del juego (~3GB) | Launcher o hytale-downloader |
| `HytaleServer.aot` | Cache AOT (opcional) | Incluido con el servidor |

### Cuenta Hytale

- ✅ **Cuenta de Hytale válida** - Necesaria para autenticar el servidor
- ✅ **Licencia del juego** - Límite de 100 servidores por licencia

### Requisitos de Red

| Requisito | Detalles |
|-----------|----------|
| Puerto UDP abierto | 5520 (default) o el que configures |
| Firewall configurado | Permitir tráfico UDP entrante |
| Port forwarding | Si estás detrás de un router/NAT |

### Requisitos de Hardware Mínimos

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| RAM | 4 GB | 8+ GB |
| CPU | 2 cores | 4+ cores |
| Disco | 10 GB libres | 50+ GB SSD |
| Red | 10 Mbps | 100+ Mbps |

### Verificación Rápida de Prerrequisitos

```bash
# 1. Verificar Node.js
node --version
# Esperado: v18.x.x o superior

# 2. Verificar Java 25
java --version
# Esperado: openjdk 25.x.x

# 3. Verificar que tienes los archivos del servidor
ls /ruta/a/tu/servidor/
# Esperado: HytaleServer.jar, Assets.zip (o ruta a assets)

# 4. Verificar conectividad de red (puerto UDP)
sudo netstat -ulnp | grep 5520
# O probar con: nc -vzu localhost 5520
```

### Instalación Rápida de Prerrequisitos

#### Ubuntu/Debian

```bash
# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Java 25 (Adoptium)
wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public | sudo apt-key add -
echo "deb https://packages.adoptium.net/artifactory/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/adoptium.list
sudo apt update
sudo apt install -y temurin-25-jdk

# Git (opcional)
sudo apt install -y git
```

#### CentOS/RHEL/Fedora

```bash
# Node.js 18+
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Java 25 - descargar desde Adoptium manualmente
# https://adoptium.net/temurin/releases/
```

#### Windows

1. Descargar e instalar [Node.js LTS](https://nodejs.org/)
2. Descargar e instalar [Adoptium JDK 25](https://adoptium.net/)
3. Reiniciar terminal/PowerShell después de instalar

#### macOS

```bash
# Con Homebrew
brew install node
brew install --cask temurin@25
```

### Estructura de Directorios Recomendada

```
/opt/hycore/                    # o tu directorio preferido
├── agent/                      # HyCore Agent
│   ├── src/
│   ├── package.json
│   └── .env
├── servers/                    # Servidores Hytale
│   ├── server-1/
│   │   ├── HytaleServer.jar
│   │   ├── HytaleServer.aot
│   │   ├── config.json
│   │   └── universe/
│   └── server-2/
├── assets/                     # Assets compartidos
│   └── Assets.zip
└── backups/                    # Backups de todos los servidores
    ├── server-1/
    └── server-2/
```

### ✅ Lista de Verificación Pre-instalación

- [ ] Node.js 18+ instalado
- [ ] Java 25 instalado
- [ ] Archivos del servidor Hytale descargados (HytaleServer.jar)
- [ ] Assets.zip descargado (~3GB)
- [ ] Cuenta Hytale válida para autenticación
- [ ] Puerto UDP 5520 (o alternativo) disponible
- [ ] Firewall configurado para UDP
- [ ] Mínimo 4GB RAM disponible
- [ ] Espacio en disco suficiente (10GB+)

---

## Índice

- [Requisitos del Sistema](#requisitos-del-sistema)
- [Instalación de Java 25](#instalación-de-java-25)
- [Obtener Archivos del Servidor](#obtener-archivos-del-servidor)
- [Ejecutar un Servidor Hytale](#ejecutar-un-servidor-hytale)
- [Autenticación](#autenticación)
- [Estructura de Archivos](#estructura-de-archivos)
- [Configuración de Red](#configuración-de-red)
- [Gestión de Mods](#gestión-de-mods)
- [Backups](#backups)
- [Optimización y Rendimiento](#optimización-y-rendimiento)
- [Arquitectura Multiservidor](#arquitectura-multiservidor)
- [Solución de Problemas](#solución-de-problemas)

---

## Requisitos del Sistema

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| RAM | 4 GB | 8+ GB |
| CPU | 2 cores | 4+ cores |
| Java | 25 | 25 (Adoptium) |
| Arquitectura | x64 o arm64 | x64 |

### Factores de Consumo de Recursos

| Recurso | Factor Principal |
|---------|------------------|
| CPU | Alto número de jugadores o entidades (NPCs, mobs) |
| RAM | Área de mundo cargada grande (view distance alto, jugadores explorando) |

> **Nota:** Sin herramientas especializadas, es difícil determinar cuánta RAM asignada realmente necesita un proceso Java. Experimenta con diferentes valores del parámetro `-Xmx`. Un síntoma típico de presión de memoria es un aumento en el uso de CPU debido al garbage collection.

---

## Instalación de Java 25

### Linux (Ubuntu/Debian)

```bash
# Agregar repositorio Adoptium
wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public | sudo apt-key add -
echo "deb https://packages.adoptium.net/artifactory/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/adoptium.list

# Instalar
sudo apt update
sudo apt install temurin-25-jdk
```

### Windows

1. Descargar desde [Adoptium](https://adoptium.net/)
2. Ejecutar el instalador
3. Verificar instalación

### Verificar Instalación

```bash
java --version
```

Salida esperada:
```
openjdk 25.0.1 2025-10-21 LTS
OpenJDK Runtime Environment Temurin-25.0.1+8 (build 25.0.1+8-LTS)
OpenJDK 64-Bit Server VM Temurin-25.0.1+8 (build 25.0.1+8-LTS, mixed mode, sharing)
```

### Verificar con HyCore Agent

```bash
curl http://localhost:3000/api/v1/java/verify
```

---

## Obtener Archivos del Servidor

### Opción 1: Copiar desde el Launcher

Ubicaciones según sistema operativo:

| SO | Ruta |
|----|------|
| Windows | `%appdata%\Hytale\install\release\package\game\latest` |
| Linux | `$XDG_DATA_HOME/Hytale/install/release/package/game/latest` |
| MacOS | `~/Application Support/Hytale/install/release/package/game/latest` |

Copia la carpeta `Server` y `Assets.zip` a tu directorio de servidor.

### Opción 2: Hytale Downloader CLI

Herramienta oficial para descargar archivos del servidor con autenticación OAuth2.

```bash
# Descargar última versión
./hytale-downloader

# Ver versión del juego sin descargar
./hytale-downloader -print-version

# Descargar a ruta específica
./hytale-downloader -download-path game.zip

# Descargar desde canal pre-release
./hytale-downloader -patchline pre-release
```

---

## Ejecutar un Servidor Hytale

### Comando Básico

```bash
java -jar HytaleServer.jar --assets PathToAssets.zip
```

### Con HyCore Agent

```bash
curl -X POST http://localhost:3000/api/v1/servers/mi-servidor/start \
  -H "Content-Type: application/json" \
  -d '{
    "serverPath": "/ruta/al/servidor",
    "assetsPath": "/ruta/a/Assets.zip",
    "port": 5520,
    "jvmArgs": ["-Xms2G", "-Xmx4G"],
    "authMode": "authenticated",
    "aotCache": true,
    "disableSentry": false,
    "backup": true,
    "backupFrequency": 30
  }'
```

### Parámetros de Configuración

| Parámetro | Descripción | Default |
|-----------|-------------|---------|
| `serverPath` | Ruta al directorio del servidor | Requerido |
| `assetsPath` | Ruta a Assets.zip | Requerido |
| `port` | Puerto UDP del servidor | 5520 |
| `jvmArgs` | Argumentos JVM | `["-Xms2G", "-Xmx4G"]` |
| `authMode` | Modo de autenticación | `authenticated` |
| `aotCache` | Usar cache AOT para inicio rápido | `true` |
| `disableSentry` | Deshabilitar reportes de crash | `false` |
| `backup` | Habilitar backups automáticos | `false` |
| `backupDir` | Directorio de backups | - |
| `backupFrequency` | Intervalo de backup (minutos) | 30 |

### Argumentos de Línea de Comandos Disponibles

```
--accept-early-plugins    Reconocer que cargar plugins tempranos no está soportado
--allow-op                Permitir operadores
--assets <Path>           Directorio de assets (default: ..\HytaleAssets)
--auth-mode <mode>        Modo de autenticación: authenticated|offline
-b, --bind <address>      Dirección de escucha (default: 0.0.0.0:5520)
--backup                  Habilitar backups automáticos
--backup-dir <Path>       Directorio de backups
--backup-frequency <Int>  Intervalo de backup en minutos (default: 30)
--disable-sentry          Deshabilitar reportes de crash a Sentry
```

---

## Autenticación

Los servidores Hytale requieren autenticación para comunicarse con las APIs de servicio.

### Flujo de Autenticación por Dispositivo

1. Iniciar autenticación:
```bash
curl -X POST http://localhost:3000/api/v1/servers/mi-servidor/auth
```

2. El servidor mostrará en los logs:
```
===================================================================
DEVICE AUTHORIZATION
===================================================================
Visit: https://accounts.hytale.com/device
Enter code: ABCD-1234
Or visit: https://accounts.hytale.com/device?user_code=ABCD-1234
===================================================================
Waiting for authorization (expires in 900 seconds)...
```

3. Visita la URL e ingresa el código
4. Una vez autorizado:
```
Authentication successful! Mode: OAUTH_DEVICE
```

### Límites

- Máximo 100 servidores por licencia de Hytale
- Para más capacidad, compra licencias adicionales o aplica para cuenta de Server Provider

---

## Estructura de Archivos

```
servidor/
├── .cache/              # Cache de archivos optimizados
├── logs/                # Archivos de log
├── mods/                # Mods instalados (.zip o .jar)
├── universe/            # Datos de mundos y jugadores
│   └── worlds/
│       └── default/
│           └── config.json
├── HytaleServer.jar     # Ejecutable del servidor
├── HytaleServer.aot     # Cache AOT (opcional)
├── bans.json            # Jugadores baneados
├── config.json          # Configuración del servidor
├── permissions.json     # Configuración de permisos
└── whitelist.json       # Jugadores en whitelist
```

### Configuración de Mundo (universe/worlds/*/config.json)

```json
{
  "Version": 4,
  "UUID": { "$binary": "...", "$type": "04" },
  "Seed": 1767292261384,
  "WorldGen": { "Type": "Hytale", "Name": "Default" },
  "IsTicking": true,
  "IsBlockTicking": true,
  "IsPvpEnabled": false,
  "IsFallDamageEnabled": true,
  "IsGameTimePaused": false,
  "IsSpawningNPC": true,
  "IsSavingPlayers": true,
  "IsSavingChunks": true,
  "IsUnloadingChunks": true
}
```

---

## Configuración de Red

### Puerto y Protocolo

- **Puerto por defecto:** 5520
- **Protocolo:** QUIC sobre UDP (NO TCP)

### Cambiar Puerto

```bash
# Directo
java -jar HytaleServer.jar --assets PathToAssets.zip --bind 0.0.0.0:25565

# Con HyCore Agent
curl -X POST http://localhost:3000/api/v1/servers/mi-servidor/start \
  -H "Content-Type: application/json" \
  -d '{"serverPath": "...", "assetsPath": "...", "port": 25565}'
```

### Configuración de Firewall

#### Windows (PowerShell)
```powershell
New-NetFirewallRule -DisplayName "Hytale Server" -Direction Inbound -Protocol UDP -LocalPort 5520 -Action Allow
```

#### Linux (iptables)
```bash
sudo iptables -A INPUT -p udp --dport 5520 -j ACCEPT
```

#### Linux (ufw)
```bash
sudo ufw allow 5520/udp
```

### Port Forwarding

Si estás detrás de un router:
1. Accede a la configuración de tu router
2. Configura port forwarding para **UDP** puerto 5520 hacia tu servidor
3. **No se requiere TCP**

### Consideraciones NAT

- QUIC maneja bien NAT traversal en la mayoría de casos
- NAT simétrico puede causar problemas - considera un VPS
- Jugadores detrás de carrier-grade NAT (redes móviles) deberían conectar sin problemas

---

## Gestión de Mods

### Listar Mods Instalados

```bash
curl "http://localhost:3000/api/v1/servers/mi-servidor/mods?serverPath=/ruta/servidor"
```

### Instalar Mod

Descarga mods desde fuentes como CurseForge (archivos `.zip` o `.jar`).

```bash
# Convertir mod a base64 e instalar
MOD_DATA=$(base64 -w0 mi-mod.jar)
curl -X POST http://localhost:3000/api/v1/servers/mi-servidor/mods \
  -H "Content-Type: application/json" \
  -d "{\"serverPath\": \"/ruta/servidor\", \"modName\": \"mi-mod.jar\", \"modData\": \"$MOD_DATA\"}"
```

### Eliminar Mod

```bash
curl -X DELETE "http://localhost:3000/api/v1/servers/mi-servidor/mods/mi-mod.jar?serverPath=/ruta/servidor"
```

### Plugins Recomendados

| Plugin | Descripción |
|--------|-------------|
| Nitrado:WebServer | Plugin base para aplicaciones web y APIs |
| Nitrado:Query | Expone estado del servidor via HTTP |
| Nitrado:PerformanceSaver | Limita view distance dinámicamente |
| ApexHosting:PrometheusExporter | Métricas detalladas del servidor y JVM |

---

## Backups

### Crear Backup Manual

```bash
curl -X POST http://localhost:3000/api/v1/servers/mi-servidor/backups \
  -H "Content-Type: application/json" \
  -d '{"serverPath": "/ruta/servidor", "backupDir": "/ruta/backups"}'
```

### Listar Backups

```bash
curl "http://localhost:3000/api/v1/servers/mi-servidor/backups?backupDir=/ruta/backups"
```

### Eliminar Backup

```bash
curl -X DELETE "http://localhost:3000/api/v1/servers/mi-servidor/backups/backup-2025-01-15T10-30-00.zip?backupDir=/ruta/backups"
```

### Backups Automáticos

Configura al iniciar el servidor:
```json
{
  "backup": true,
  "backupDir": "/ruta/backups",
  "backupFrequency": 30
}
```

---

## Optimización y Rendimiento

### Usar Cache AOT (Ahead-Of-Time)

El servidor incluye un cache AOT pre-entrenado que mejora tiempos de inicio:

```bash
java -XX:AOTCache=HytaleServer.aot -jar HytaleServer.jar --assets PathToAssets.zip
```

Con HyCore Agent, habilitado por defecto con `"aotCache": true`.

### View Distance

El view distance es el principal factor de uso de RAM.

**Recomendación:** Limitar a 12 chunks (384 bloques) para rendimiento y gameplay.

**Comparación con Minecraft:**
- Minecraft default: 10 chunks (160 bloques)
- Hytale default: 384 bloques ≈ 24 chunks de Minecraft
- Espera mayor uso de RAM con configuración default

### Argumentos JVM Recomendados

```json
{
  "jvmArgs": [
    "-Xms4G",
    "-Xmx8G",
    "-XX:+UseG1GC",
    "-XX:+ParallelRefProcEnabled",
    "-XX:MaxGCPauseMillis=200"
  ]
}
```

### Deshabilitar Sentry en Desarrollo

Importante durante desarrollo de plugins:

```bash
java -jar HytaleServer.jar --assets PathToAssets.zip --disable-sentry
```

O con HyCore Agent: `"disableSentry": true`

---

## Arquitectura Multiservidor

Hytale soporta mecanismos nativos para enrutar jugadores entre servidores. No se requiere proxy inverso como BungeeCord.

### Player Referral

Transfiere un jugador conectado a otro servidor:

```java
PlayerRef.referToServer(@Nonnull final String host, final int port, @Nullable byte[] data)
```

> ⚠️ **Seguridad:** El payload se transmite a través del cliente y puede ser manipulado. Firma los payloads criptográficamente (ej. HMAC con secreto compartido).

### Connection Redirect

Durante el handshake, un servidor puede rechazar al jugador y redirigirlo:

```java
PlayerSetupConnectEvent.referToServer(@Nonnull final String host, final int port, @Nullable byte[] data)
```

### Disconnect Fallback

Cuando un jugador se desconecta inesperadamente, el cliente reconecta automáticamente a un servidor de fallback configurado.

### Construir un Proxy

Usa Netty QUIC para construir proxies personalizados. Definiciones de paquetes disponibles en:

```
com.hypixel.hytale.protocol.packets
```

---

## Solución de Problemas

### El servidor no inicia

1. Verificar Java 25:
   ```bash
   curl http://localhost:3000/api/v1/java/verify
   ```

2. Verificar requisitos del sistema:
   ```bash
   curl http://localhost:3000/api/v1/system/requirements
   ```

3. Verificar rutas de archivos:
   ```bash
   curl "http://localhost:3000/api/v1/servers/mi-servidor/structure?serverPath=/ruta/servidor"
   ```

### Jugadores no pueden conectar

1. Verificar que el firewall permite UDP en el puerto
2. Verificar port forwarding (UDP, no TCP)
3. Verificar que el servidor está autenticado
4. Revisar logs del servidor

### Alto uso de CPU

- Posible presión de memoria - reducir `-Xmx`
- Muchas entidades - reducir spawns de NPCs
- Muchos jugadores - escalar horizontalmente

### Alto uso de RAM

- Reducir view distance
- Reducir número de mundos cargados
- Ajustar `-Xmx` apropiadamente

### Ver Logs

```bash
# Logs en tiempo real del proceso
curl http://localhost:3000/api/v1/servers/mi-servidor/logs?limit=200

# Archivos de log
curl "http://localhost:3000/api/v1/servers/mi-servidor/files/logs?serverPath=/ruta/servidor"

# Contenido de un log específico
curl "http://localhost:3000/api/v1/servers/mi-servidor/files/logs/latest.log?serverPath=/ruta/servidor&lines=500"
```

---

## Futuras Adiciones (por Hypixel Studios)

| Característica | Descripción |
|----------------|-------------|
| Server Discovery | Catálogo para que jugadores encuentren servidores |
| Parties | Sistema de grupos para jugar juntos |
| Pagos Integrados | Gateway de pagos en el cliente |
| SRV Records | Conectar con dominio sin especificar puerto |
| API Endpoints | Lookup UUID↔Nombre, perfiles, telemetría, reportes |

---

## Referencias

- [Hytale Server Manual](https://hytale.com/news/2024/12/hytale-server-manual) (Oficial)
- [Adoptium JDK](https://adoptium.net/)
- [Guía de Parámetros JVM](https://www.baeldung.com/jvm-parameters)
