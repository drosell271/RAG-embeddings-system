// No podemos usar require con ES Modules
// const { pipeline } = require('@xenova/transformers');
const dotenv = require("dotenv");

dotenv.config();

// Referencia para almacenar el pipeline una vez importado
let pipelineModule;

/**
 * Importa dinámicamente las dependencias de @xenova/transformers
 * @returns {Promise<void>}
 */
async function importDependencies() {
	if (!pipelineModule) {
		try {
			// Importación dinámica (ESM compatible)
			const { pipeline } = await import("@xenova/transformers");
			pipelineModule = pipeline;
			console.log("Módulo @xenova/transformers importado con éxito");
		} catch (error) {
			console.error("Error al importar @xenova/transformers:", error);
			throw error;
		}
	}
	return pipelineModule;
}

// Cache para el modelo de embeddings
let embeddingModel = null;

/**
 * Inicializa el modelo de embeddings
 * @returns {Promise<void>}
 */
async function initializeEmbeddingModel() {
	try {
		console.log("Inicializando modelo de embeddings de Hugging Face...");

		// Asegurarse de que el módulo pipeline está disponible
		const pipeline = await importDependencies();

		// Obtener el nombre del modelo desde variables de entorno o usar uno por defecto
		const modelName =
			process.env.HUGGINGFACE_EMBEDDING_MODEL ||
			"Xenova/all-MiniLM-L6-v2";

		// Cargar el modelo usando la biblioteca @xenova/transformers
		embeddingModel = await pipeline("feature-extraction", modelName, {
			quantized: false, // Usar versión no cuantizada para mejor calidad
		});

		console.log(`Modelo de embeddings "${modelName}" cargado con éxito`);
	} catch (error) {
		console.error("Error al inicializar el modelo de embeddings:", error);
		throw error;
	}
}

/**
 * Genera embeddings para un texto utilizando modelos de Hugging Face
 * @param {string} text - Texto para el cual generar el embedding
 * @returns {Promise<number[]>} Vector de embedding
 */
async function generateEmbedding(text) {
	try {
		// Inicializar el modelo si aún no se ha hecho
		if (!embeddingModel) {
			await initializeEmbeddingModel();
		}

		// Generar el embedding
		const result = await embeddingModel(text, {
			pooling: "mean",
			normalize: true,
		});

		// Extraer el vector de embedding
		const embedding = Array.from(result.data);

		return embedding;
	} catch (error) {
		console.error("Error al generar embedding con Hugging Face:", error);
		throw error;
	}
}

/**
 * Obtiene la dimensión del vector de embedding del modelo usado
 * @returns {Promise<number>} Dimensión del vector de embedding
 */
async function getEmbeddingDimension() {
	try {
		// Generar un embedding de ejemplo para obtener la dimensión
		const sampleText =
			"Texto de ejemplo para obtener la dimensión del embedding";
		const embedding = await generateEmbedding(sampleText);

		return embedding.length;
	} catch (error) {
		console.error("Error al obtener dimensión del embedding:", error);
		throw error;
	}
}

module.exports = {
	initializeEmbeddingModel,
	generateEmbedding,
	getEmbeddingDimension,
	importDependencies,
};
