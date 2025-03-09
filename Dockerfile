FROM node:18

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install --omit=dev

# Copiar código fuente
COPY . .

# Crear directorio para archivos subidos y cache
RUN mkdir -p uploads
RUN mkdir -p ./.cache

# Establecer permisos para el directorio .cache
ENV TRANSFORMERS_CACHE=./.cache
RUN chmod -R 777 ./.cache

# Instalar dependencias adicionales para Hugging Face Transformers
# Utilizando un entorno virtual para evitar el error "externally-managed-environment"
RUN apt-get update && \
	apt-get install -y python3 python3-venv python3-pip && \
	python3 -m venv /opt/venv

# Activar el entorno virtual y luego instalar los paquetes
ENV PATH="/opt/venv/bin:$PATH"
RUN pip3 install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Exponer puerto
EXPOSE 3000

# Iniciar la aplicación
CMD ["node", "server.js"]