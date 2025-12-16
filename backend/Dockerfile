FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install UV
RUN pip install uv

# Copy UV configuration files
COPY pyproject.toml uv.lock* ./

# Install Python dependencies using UV
RUN uv sync --frozen

# Copy project
COPY . .

# Expose port
EXPOSE 8000