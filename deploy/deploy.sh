#!/usr/bin/env bash
# Выкладывает сайт на сервер по SSH (rsync): код и картинки, без инструментов и листов проверки.
#
#   deploy/deploy.sh user@host https://домен
#
# Папка на сервере — /var/www/animanga (или ANIMANGA_DEST), вход по ключу.
# Раздел private/ уходит на сервер, только если nginx уже закрывает его паролем: и сама страница,
# и картинка внутри должны отвечать 401. Иначе сканы «Перекура» не выкладываются.
set -euo pipefail
cd "$(dirname "$0")/.."

HOST=${1:?'Укажи сервер и адрес сайта: deploy/deploy.sh user@host https://домен'}
URL=${2:?'Укажи адрес сайта: deploy/deploy.sh user@host https://домен'}
URL=${URL%/}
DEST=${ANIMANGA_DEST:-/var/www/animanga}

SKIP=(
  --exclude='.*' --exclude='__pycache__/' --exclude='/tools/' --exclude='/deploy/' --exclude='/README.md'
  --exclude='layers.json' --exclude='living.json' --exclude='panels.json'   # исходники для инструментов
  --exclude='_*.jpg' --exclude='*-preview.jpg'                               # проверочные листы
)

# Публичная часть. private/ здесь исключён, поэтому --delete его на сервере не трогает
rsync -rlptz --delete "${SKIP[@]}" --exclude='/private/' ./ "$HOST:$DEST/"
echo "публичная часть: $URL"

status() { curl -s -o /dev/null -w '%{http_code}' "$1"; }
for path in /private/ /private/perekur/pages/cover.jpg; do
  code=$(status "$URL$path")
  if [ "$code" != 401 ]; then
    echo "! $URL$path отвечает $code, а не 401 — пароль не работает, личный раздел не выкладываю" >&2
    exit 1
  fi
done

rsync -rlptz --delete "${SKIP[@]}" ./private/ "$HOST:$DEST/private/"
echo "личная часть: $URL/private/ (по паролю)"
