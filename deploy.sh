#!/bin/bash
# =============================================================================
#  University_Net — развёртывание на чистом сервере Ubuntu.
#
#  ЧТО ДЕЛАЕТ: ставит Docker, забирает код, создаёт файлы конфигурации,
#  поднимает сайт с автоматическим HTTPS и запускает чат-бота MAX.
#  Запускать один раз, на свежем сервере, от пользователя root.
#
#  ЧТО НУЖНО: заполнить две строки ниже и вставить весь этот текст
#  в консоль сервера (кнопка в панели Timeweb Cloud) или в SSH.
# =============================================================================

# ─── ЗАПОЛНИТЕ ЭТИ ДВЕ СТРОКИ ────────────────────────────────────────────────
TOKEN="ВСТАВЬТЕ_ТОКЕН_БОТА"
BOT_NAME="t401_hakaton_max_bot"
# ─────────────────────────────────────────────────────────────────────────────

REPO="https://github.com/yes0rr/University_Net.git"
APPDIR="/opt/app"

set -e

say() { printf "\n\033[1;32m==> %s\033[0m\n" "$1"; }
warn() { printf "\n\033[1;33m[!] %s\033[0m\n" "$1"; }

# ── Проверки перед началом ───────────────────────────────────────────────────
if [ "$TOKEN" = "ВСТАВЬТЕ_ТОКЕН_БОТА" ] || [ -z "$TOKEN" ]; then
    echo "ОШИБКА: сначала впишите токен в переменную TOKEN в начале этого скрипта."
    exit 1
fi

if [ "$(id -u)" != "0" ]; then
    echo "ОШИБКА: скрипт нужно запускать от пользователя root."
    echo "Выполните: sudo -i   (или войдите как root)"
    exit 1
fi

# ── Шаг 1. Docker ────────────────────────────────────────────────────────────
say "Шаг 1/5. Установка Docker"
if command -v docker >/dev/null 2>&1; then
    echo "Docker уже установлен: $(docker --version)"
else
    curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker >/dev/null 2>&1 || true

# ── Подстраховка: swap ───────────────────────────────────────────────────────
# На тарифе с 1 ГБ памяти сборка образа может упереться в лимит, если рядом
# работают другие процессы. Файл подкачки на 1 ГБ снимает этот риск.
if [ ! -f /swapfile ] && [ "$(free -m | awk '/Swap:/ {print $2}')" -lt 256 ]; then
    say "Создаю файл подкачки на 1 ГБ (страховка для сборки)"
    fallocate -l 1G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=1024 status=none
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Файл подкачки подключён."
fi

# ── Шаг 2. Код проекта ───────────────────────────────────────────────────────
say "Шаг 2/5. Получение кода проекта"
mkdir -p /opt
if [ -d "$APPDIR/.git" ]; then
    cd "$APPDIR" && git pull --ff-only
else
    rm -rf "$APPDIR"
    git clone "$REPO" "$APPDIR"
    cd "$APPDIR"
fi
echo "Папка: $APPDIR"

FILES_OK=1
for f in bot/bot.py bot/requirements.txt bot/certs/russian_trusted_root_ca.crt frontend/index.html data/tomsk.json; do
    [ -f "$f" ] || { echo "   НЕТ: $f"; FILES_OK=0; }
done

if [ "$FILES_OK" != "1" ]; then
    echo
    echo "ОШИБКА: в репозитории нет файлов, перечисленных выше."
    echo "Сервер получил старую версию проекта. Что делать:"
    echo "  1. Залейте обновлённый проект на GitHub"
    echo "  2. Запустите этот скрипт заново"
    exit 1
fi
echo "Все нужные файлы на месте."

# ── Шаг 3. Файлы развёртывания ───────────────────────────────────────────────
say "Шаг 3/5. Создание файлов конфигурации"
mkdir -p deploy

cat > deploy/Caddyfile <<'CADDY_EOF'
{$DOMAIN} {
	root * /srv
	encode gzip
	header -Server
	header X-Content-Type-Options "nosniff"
	@json path *.json
	header @json Cache-Control "no-store"
	file_server
	log {
		output stdout
		format console
	}
}
CADDY_EOF

cat > deploy/Dockerfile.web <<'WEB_EOF'
FROM caddy:2-alpine
COPY frontend/ /srv/
COPY data/ /srv/data/
COPY deploy/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 443
WEB_EOF

cat > deploy/Dockerfile.bot <<'BOT_EOF'
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY bot/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r /app/requirements.txt
COPY bot/ /app/
CMD ["python", "bot.py"]
BOT_EOF

cat > compose.yaml <<'COMPOSE_EOF'
services:
  web:
    build:
      context: .
      dockerfile: deploy/Dockerfile.web
    container_name: university_net_web
    restart: unless-stopped
    environment:
      DOMAIN: ${DOMAIN:?Укажите DOMAIN в файле .env}
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - caddy_data:/data
      - caddy_config:/config
  bot:
    build:
      context: .
      dockerfile: deploy/Dockerfile.bot
    container_name: university_net_bot
    restart: unless-stopped
    env_file:
      - bot/.env
volumes:
  caddy_data:
  caddy_config:
COMPOSE_EOF

cat > .dockerignore <<'IGNORE_EOF'
.env
bot/.env
*.pem
*.key
.git
.gitignore
.venv
venv
__pycache__
**/__pycache__
*.py[cod]
node_modules
package.json
package-lock.json
*.xlsx
~$*
tools/
*.md
start.bat
start.sh
start_bot.bat
tunnel.bat
*.png
*.jpg
IGNORE_EOF

# ── Шаг 4. Адрес и секреты ───────────────────────────────────────────────────
say "Шаг 4/5. Настройка адреса и токена"

IP=$(curl -fsS --max-time 10 https://api.ipify.org || curl -fsS --max-time 10 https://ifconfig.me)
DOMAIN="${IP//./-}.sslip.io"
echo "Публичный IP сервера: $IP"
echo "Адрес мини-приложения: https://$DOMAIN"

cat > .env <<ENV_EOF
DOMAIN=$DOMAIN
ENV_EOF

printf 'MAX_BOT_TOKEN=%s\nMAX_BOT_NAME=%s\n' "$TOKEN" "$BOT_NAME" > bot/.env
chmod 600 bot/.env
echo "Токен записан в bot/.env (права 600, в репозиторий не попадает)"

# ── Шаг 5. Запуск ────────────────────────────────────────────────────────────
say "Шаг 5/5. Сборка и запуск контейнеров"
docker compose up -d --build

echo
echo "Жду, пока Caddy получит сертификат и поднимет HTTPS (до 60 секунд)..."
OK=""
for i in $(seq 1 30); do
    sleep 2
    if curl -fsS --max-time 5 "https://$DOMAIN/" >/dev/null 2>&1; then OK="да"; break; fi
done

echo
echo "═══════════════════════════════════════════════════════════════"
if [ -n "$OK" ]; then
    echo "  ГОТОВО. Мини-приложение доступно по адресу:"
    echo
    echo "      https://$DOMAIN"
    echo
    echo "  Этот адрес укажите в кабинете MAX:"
    echo "  business.max.ru -> Чат-боты -> ваш бот -> Настроить -> URL"
else
    warn "Сайт не ответил за 60 секунд. Посмотрите логи:"
    echo "      docker compose logs web"
    echo
    echo "  Адрес, который нужно указать в кабинете MAX:"
    echo "      https://$DOMAIN"
fi
echo "═══════════════════════════════════════════════════════════════"
echo
echo "Полезные команды:"
echo "  docker compose logs -f          логи всех контейнеров"
echo "  docker compose logs -f bot      только бот"
echo "  docker compose restart          перезапуск"
echo "  docker compose down             остановить всё"
echo "  docker compose up -d --build    обновить после правок кода"
echo
echo "Проверка бота: напишите /start боту https://max.ru/$BOT_NAME"
