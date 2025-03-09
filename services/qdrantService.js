const { QdrantClient } = require("@qdrant/js-client-rest");
const dotenv = require("dotenv");
const huggingfaceService = require("./huggingfaceService");

dotenv.config();

// Configuración del cliente Qdrant
const client = new QdrantClient({
	url: process.env.QDRANT_URL || "http://localhost:6333",
});

const COLLECTION_NAME =
	process.env.QDRANT_COLLECTION_NAME || "document_embeddings";
let VECTOR_SIZE = null; // Se determinará dinámicamente

/**
 * Inicializa la colección en Qdrant si no existe
 */
async function initializeCollection() {
	try {
		// Inicializar el modelo de embeddings
		await huggingfaceService.initializeEmbeddingModel();

		// Determinar el tamaño del vector dinámicamente basado en el modelo
		VECTOR_SIZE =
			parseInt(process.env.QDRANT_VECTOR_SIZE) ||
			(await huggingfaceService.getEmbeddingDimension());
		console.log(`Dimensión del vector de embeddings: ${VECTOR_SIZE}`);

		// Verificar si la colección ya existe
		const collections = await client.getCollections();
		const collectionExists = collections.collections.some(
			(collection) => collection.name === COLLECTION_NAME
		);

		if (!collectionExists) {
			// Crear la colección si no existe
			await client.createCollection(COLLECTION_NAME, {
				vectors: {
					size: VECTOR_SIZE,
					distance: "Cosine",
				},
				optimizers_config: {
					default_segment_number: 2,
				},
				on_disk_payload: true,
			});

			console.log(`Colección ${COLLECTION_NAME} creada con éxito`);

			// Crear índice para búsqueda rápida
			await client.createPayloadIndex(COLLECTION_NAME, {
				field_name: "document_id",
				field_schema: "keyword",
				wait: true,
			});

			await client.createPayloadIndex(COLLECTION_NAME, {
				field_name: "chunk_index",
				field_schema: "integer",
				wait: true,
			});
		} else {
			console.log(`Colección ${COLLECTION_NAME} ya existe`);
		}

		return true;
	} catch (error) {
		console.error("Error al inicializar la colección:", error);
		throw error;
	}
}

/**
 * Inserta un vector de embedding en la base de datos
 * @param {number[]} embedding - Vector de embedding
 * @param {object} metadata - Metadatos asociados con el fragmento
 * @returns {Promise<string>} ID del punto insertado
 */
async function insertEmbedding(embedding, metadata) {
	try {
		// Generar un UUID único para este punto
		const { v4: uuidv4 } = require("uuid");
		const pointId = uuidv4();

		await client.upsert(COLLECTION_NAME, {
			wait: true,
			points: [
				{
					id: pointId,
					vector: embedding,
					payload: {
						document_id: metadata.document_id,
						chunk_index: metadata.chunk_index,
						text: metadata.text,
						title: metadata.title || null,
						// Agregamos un campo compuesto para facilitar las búsquedas
						point_reference: `${metadata.document_id}_${metadata.chunk_index}`,
					},
				},
			],
		});

		return pointId;
	} catch (error) {
		console.error("Error al insertar embedding:", error);
		throw error;
	}
}

/**
 * Busca fragmentos similares en la base de datos
 * @param {number[]} queryEmbedding - Vector de embedding de la consulta
 * @param {number} limit - Número máximo de resultados
 * @returns {Promise<object[]>} Fragmentos similares con sus metadatos
 */
async function searchSimilarChunks(queryEmbedding, limit = 5) {
	try {
		const results = await client.search(COLLECTION_NAME, {
			vector: queryEmbedding,
			limit: limit,
			with_payload: true,
			with_vectors: false,
		});

		return results.map((result) => ({
			score: result.score,
			documentId: result.payload.document_id,
			chunkIndex: result.payload.chunk_index,
			text: result.payload.text,
			title: result.payload.title || null,
		}));
	} catch (error) {
		console.error("Error al buscar fragmentos similares:", error);
		throw error;
	}
}

/**
 * Elimina todos los embeddings asociados a un documento
 * @param {string} documentId - ID del documento a eliminar
 * @returns {Promise<boolean>} Resultado de la operación
 */
async function deleteDocumentEmbeddings(documentId) {
	try {
		// Ahora la búsqueda se realiza por el campo document_id en el payload
		await client.delete(COLLECTION_NAME, {
			filter: {
				must: [
					{
						key: "document_id",
						match: {
							value: documentId,
						},
					},
				],
			},
			wait: true,
		});

		return true;
	} catch (error) {
		console.error("Error al eliminar embeddings del documento:", error);
		throw error;
	}
}

module.exports = {
	initializeCollection,
	insertEmbedding,
	searchSimilarChunks,
	deleteDocumentEmbeddings,
};
