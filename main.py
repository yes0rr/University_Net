from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI(title="Поиск ВУЗов - MAX Mini App")

# Главный эндпоинт, который возвращает UI нашего Мини-Приложения
@app.get("/", response_class=HTMLResponse)
async def home():
    html_content = """
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Поиск ВУЗов</title>
        <style>
            * {
                box-sizing: border-box;
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: #f4f5f7;
                color: #000000;
                margin: 0;
                padding: 16px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }
            .card {
                background: #ffffff;
                border-radius: 16px;
                padding: 24px;
                width: 100%;
                max-width: 400px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
                text-align: center;
            }
            .icon {
                font-size: 48px;
                margin-bottom: 12px;
            }
            h1 {
                font-size: 22px;
                margin: 0 0 8px 0;
                color: #2c3e50;
            }
            p {
                font-size: 15px;
                color: #7f8c8d;
                margin: 0 0 20px 0;
                line-height: 1.4;
            }
            .btn {
                background-color: #0077ff;
                color: white;
                border: none;
                padding: 12px 20px;
                font-size: 15px;
                font-weight: 600;
                border-radius: 10px;
                cursor: pointer;
                width: 100%;
                transition: background-color 0.2s;
            }
            .btn:active {
                background-color: #0056b3;
            }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="icon">🎓</div>
            <h1>Привет!</h1>
            <p>Добро пожаловать в сервис поиска ВУЗов по городам России.</p>
            <button class="btn" onclick="alert('Скоро здесь появится карта!')">Начать поиск</button>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)