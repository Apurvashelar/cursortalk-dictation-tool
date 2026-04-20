FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV HOST=0.0.0.0
ENV PORT=8080
ENV MODEL_PATH=/models
ENV DICTATION_LOG_DIR=/tmp/dictation-logs

WORKDIR /app

COPY requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir -r /app/requirements.txt

COPY server.py /app/server.py

EXPOSE 8080

CMD ["sh", "-c", "uvicorn server:app --host ${HOST} --port ${PORT}"]
