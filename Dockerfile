FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8080

EXPOSE ${PORT}

CMD exec gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT} --timeout 120
