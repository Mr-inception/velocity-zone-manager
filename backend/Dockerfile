FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

# Render injects $PORT (default 10000). Shell form so the env var expands.
CMD gunicorn --bind 0.0.0.0:${PORT:-5000} --timeout 120 app:app
