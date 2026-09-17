from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Поиск ВУЗов - MAX Mini App")

# Раздача статических файлов (CSS, стили, картинки) по адресу /static
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def home():
    # Возвращаем готовую HTML-страницу из файла
    return FileResponse("templates/index.html")