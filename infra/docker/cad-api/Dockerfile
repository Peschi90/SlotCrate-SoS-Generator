FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libxrender1 libxkbcommon0 libsm6 libxi6 libxrandr2 \
 && rm -rf /var/lib/apt/lists/*

COPY services/cad-api/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY services/cad-api /app/services/cad-api
COPY reference /app/reference

ENV PYTHONPATH=/app/services/cad-api
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--app-dir", "services/cad-api", "--host", "0.0.0.0", "--port", "8000"]
