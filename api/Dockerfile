# ---- Build Stage ----
FROM python:3.13-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libc-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ---- Runtime Stage ----
FROM python:3.13-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy project source
COPY . .

# Make entrypoint executable
RUN chmod +x /app/scripts/entry_point.sh

EXPOSE 8000

ENTRYPOINT ["dumb-init", "--", "/app/scripts/entry_point.sh"]
