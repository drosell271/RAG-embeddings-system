# Sistema RAG con Embeddings y Bases Vectoriales

Sistema avanzado de recuperación de información que implementa RAG (Retrieval-Augmented Generation) utilizando embeddings y bases de datos vectoriales para consultas inteligentes sobre documentos.

## 🔍 ¿Qué hace este sistema?

Este proyecto implementa un sistema RAG completo que:

1. **Procesa documentos extensos** (PDF, TXT, MD, JSON)
2. **Genera embeddings vectoriales** de cada fragmento utilizando modelos de Hugging Face
3. **Almacena los vectores** en una base de datos vectorial (Qdrant)
4. **Permite consultas en lenguaje natural** sobre el contenido de los documentos
5. **Genera respuestas precisas** utilizando GPT-4o-mini con contexto relevante
6. **Muestra las fuentes de información** utilizadas en cada respuesta
7. **Registra el uso de tokens y costos** de cada consulta a OpenAI

Para entender en profundidad cómo funciona este sistema, consulta: [Explicación Conceptual: Tecnología RAG](docs/RAG-Concepto-Explicacion.md)

## ✨ Características principales

- ✅ **Procesamiento inteligente de documentos** - División en fragmentos con solapamiento configurable
- ✅ **Generación local de embeddings** - Vectorización con Hugging Face sin dependencias externas
- ✅ **Base de datos vectorial optimizada** - Búsqueda semántica eficiente con Qdrant
- ✅ **Interfaz de usuario intuitiva** - Frontend sencillo para gestionar documentos y consultas
- ✅ **Generación aumentada con GPT** - Respuestas contextualizadas basadas en el contenido recuperado
- ✅ **Trazabilidad completa** - Visualización de las fuentes usadas en cada respuesta
- ✅ **Monitoreo de costos** - Transparencia en el uso de tokens y costos estimados por consulta

## 📋 Requisitos

- Docker y Docker Compose
- Clave API de OpenAI (solo para generación de respuestas)
- Mínimo 4GB de RAM disponible

## 🚀 Instalación

1. **Clonar el repositorio**

```bash
git clone https://github.com/drosell271/rag-embeddings-system.git
cd rag-embeddings-system
```

2. **Configurar variables de entorno**

```bash
cp .env.example .env
```

Edita el archivo `.env` para incluir tu clave API de OpenAI:

```
OPENAI_API_KEY=tu_api_key_aqui
OPENAI_ORG_ID=tu_org_id_aqui
```

3. **Construir y ejecutar los contenedores**

```bash
docker-compose up -d
```

4. **Acceder a la aplicación**

Abre tu navegador y accede a http://localhost:3000

## 🔄 Flujo de trabajo del sistema

El sistema implementa tres fases principales:

### 1. Procesamiento de documentos
```
Documento → Extracción → Fragmentación → Vectorización → Almacenamiento
```

### 2. Consulta de información
```
Pregunta → Vectorización → Búsqueda semántica → Recuperación de fragmentos
```

### 3. Generación de respuestas
```
Fragmentos relevantes + Pregunta → GPT-4o-mini → Respuesta contextualizada + Métricas de uso
```

## 💻 Guía rápida de uso

### Subir documentos

1. Haz clic en "Subir documento"
2. Introduce un título descriptivo
3. Selecciona un archivo (PDF, TXT, MD o JSON)
4. Haz clic en "Procesar documento"

### Consultar información

1. Formula tu pregunta en lenguaje natural
2. Haz clic en "Enviar consulta"
3. Revisa la respuesta, las fuentes utilizadas y el uso de tokens/costos

Para instrucciones detalladas, consulta el [Manual de Usuario](docs/Manual-Usuario.md).

## 📂 Estructura del proyecto

```
rag-embeddings-system/
├── docker-compose.yml     # Configuración de Docker
├── Dockerfile             # Configuración de la imagen
├── .env                   # Variables de entorno
├── server.js              # Punto de entrada del servidor
├── services/              # Servicios principales
│   ├── documentService.js    # Procesamiento de documentos
│   ├── huggingfaceService.js # Generación de embeddings
│   ├── openaiService.js      # Generación de respuestas
│   ├── qdrantService.js      # Base de datos vectorial
│   └── queryService.js       # Procesamiento de consultas
├── routes/                # API endpoints
├── utils/                 # Utilidades del sistema
└── public/                # Interfaz de usuario
```

## 🔧 Configuración avanzada

El sistema es altamente configurable a través del archivo `.env`:

```
# Ajuste de fragmentación de documentos
CHUNK_SIZE=768             # Tamaño de fragmentos (default: 512)
CHUNK_OVERLAP=100          # Solapamiento entre fragmentos (default: 50)

# Modelos disponibles
HUGGINGFACE_EMBEDDING_MODEL=sentence-transformers/all-mpnet-base-v2
OPENAI_COMPLETION_MODEL=gpt-4    # Afecta al costo por token
```

Para detalles técnicos completos, consulta la [Guía Técnica](docs/Guia-Tecnica.md).

## ⚠️ Solución de problemas comunes

### Error "ERR_REQUIRE_ESM"

Ocurre con la biblioteca `@xenova/transformers` porque es un módulo ESM. Solución:

```javascript
// En lugar de:
const { pipeline } = require('@xenova/transformers');

// Usar:
const { pipeline } = await import('@xenova/transformers');
```

### Error de Qdrant sobre IDs inválidos

Qdrant requiere UUIDs válidos o enteros como IDs. Solución:

```javascript
const { v4: uuidv4 } = require('uuid');
const pointId = uuidv4();
```

### Error "externally-managed-environment" en Python

Ocurre en Debian 12 al instalar paquetes con pip. Solución:

```dockerfile
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
```

## 📄 Licencia

Este proyecto está licenciado bajo la licencia MIT - ver el archivo [LICENSE](LICENSE).

---

Desarrollado por [Daniel Rosell](https://github.com/drosell271)