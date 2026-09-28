# Чат-бот для мессенджера MAX

Компонент проекта `University_Net`: бот, через который пользователь попадает
в мини-приложение с подбором вузов Томска.

## Что делает

| Действие пользователя | Ответ бота |
|---|---|
| `/start` | приветствие + кнопка «Подобрать вуз» |
| `/help` | список команд |
| любой текст | подсказка с кнопкой |
| нажатие «Подобрать вуз» | открывает мини-приложение в чате (тип кнопки `open_app`) |
| нажатие «Что умеет бот» | короткая справка о решении |

## Запуск

### Windows — одной кнопкой

Двойной клик по `start_bot.bat` в корне проекта. Скрипт сам создаст окружение,
установит зависимости и, если нужно, откроет блокнот для ввода токена.

### Вручную

```powershell
cd C:\Users\пк\Desktop\University_Net
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r bot\requirements.txt
python bot\bot.py
```

## Токен

Лежит в файле `bot/.env`, который не коммитится в репозиторий:

```
MAX_BOT_TOKEN=ваш_токен
MAX_BOT_NAME=t401_hakaton_max_bot
```

Где взять токен: `business.max.ru` → «Чат-боты» → бот → «⋮» → Настройки.

При старте бот проверяет токен запросом `GET /me` и печатает имя бота.
Если токен неверный — выходит с понятным сообщением, а не молча падает.

## Про сертификат Минцифры

Домен `platform-api2.max.ru` защищён сертификатом `Russian Trusted Root CA`,
которого нет в стандартном наборе Python. Без него соединение падает с
`SSLError: unable to get local issuer certificate` — даже если сертификат
установлен в Windows, потому что библиотека `requests` использует собственный
набор (`certifi`), а не системный.

Поэтому сертификат лежит в `bot/certs/russian_trusted_root_ca.crt` и на старте
подмешивается к набору `certifi`. Доустанавливать ничего в систему не нужно —
работает одинаково на Windows, Linux и в Docker.

Актуальную версию сертификата можно скачать:
<https://gu-st.ru/content/lending/russian_trusted_root_ca_pem.crt>

## Файлы

```
bot/
├── bot.py                                 точка входа
├── .env.example                           шаблон настроек (копируется в .env)
├── requirements.txt                       requests, certifi, python-dotenv
└── certs/
    └── russian_trusted_root_ca.crt        корневой сертификат Минцифры
```

## Ограничения

- Используется **Long Polling** (`GET /updates`). Документация MAX не
  рекомендует его для production — для рабочей версии нужен Webhook, а он
  требует HTTPS и не может работать одновременно с Long Polling.
- Бот должен быть **запущен постоянно**: остановили процесс — бот не отвечает.
- Для работы кнопки «Подобрать вуз» к боту должен быть **привязан HTTPS-адрес
  мини-приложения** в кабинете бизнеса `business.max.ru`.

## Документация

- MAX Bot API: <https://dev.max.ru/docs-api>
- Мини-приложения: <https://dev.max.ru/docs/webapps/introduction>
- MAX Bridge: <https://dev.max.ru/docs/webapps/bridge>
- Схема API: <https://github.com/max-messenger/api-schema>
