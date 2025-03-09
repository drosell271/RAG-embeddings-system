const fs = require("fs").promises;
const path = require("path");
const pdfParse = require("pdf-parse");
const { v4: uuidv4 } = require("uuid");

const textSplitter = require("../utils/textSplitter");
const huggingfaceService = require("./huggingfaceService");
const qdrantService = require("./qdrantService");

/**
 * Procesa un documento, extrae su texto, lo divide en fragmentos y almacena los embeddings
 * @param {string} filePath - Ruta del archivo a procesar
 * @param {string} documentId - ID único del documento
 * @param {string} title - Título del documento
 * @returns {Promise<object>} Información del documento procesado
 */
async function processDocument(filePath, documentId, title) {
	try {
		// Leer el archivo y extraer el texto según su tipo
		const fileExtension = path.extname(filePath).toLowerCase();
		let documentText = "";

		if (fileExtension === ".pdf") {
			const dataBuffer = await fs.readFile(filePath);
			const pdfData = await pdfParse(dataBuffer);
			documentText = pdfData.text;
		} else if (
			fileExtension === ".txt" ||
			fileExtension === ".md" ||
			fileExtension === ".json"
		) {
			documentText = await fs.readFile(filePath, "utf8");
		} else {
			throw new Error(
				`Formato de archivo no soportado: ${fileExtension}`
			);
		}

		// Dividir el texto en fragmentos
		const chunks = textSplitter.splitTextIntoChunks(documentText);
		console.log(`Documento dividido en ${chunks.length} fragmentos`);

		// Procesar cada fragmento y guardar sus embeddings
		const chunkResults = [];
		for (let i = 0; i < chunks.length; i++) {
			// Generar embedding para el fragmento usando Hugging Face
			const embedding = await huggingfaceService.generateEmbedding(
				chunks[i]
			);

			// Guardar embedding en la base de datos
			const pointId = await qdrantService.insertEmbedding(embedding, {
				document_id: documentId,
				chunk_index: i,
				text: chunks[i],
				title: title,
			});

			chunkResults.push({
				chunkIndex: i,
				pointId: pointId,
				textLength: chunks[i].length,
			});

			// Log de progreso
			if (i % 10 === 0 || i === chunks.length - 1) {
				console.log(`Procesados ${i + 1}/${chunks.length} fragmentos`);
			}
		}

		// Guardar metadatos del documento
		const documentInfo = {
			id: documentId,
			title: title,
			filename: path.basename(filePath),
			totalChunks: chunks.length,
			processedAt: new Date().toISOString(),
		};

		// Almacenar metadata en archivo JSON
		const metadataPath = path.join(
			__dirname,
			"..",
			"uploads",
			`${documentId}_metadata.json`
		);
		await fs.writeFile(metadataPath, JSON.stringify(documentInfo, null, 2));

		return documentInfo;
	} catch (error) {
		console.error("Error al procesar documento:", error);
		throw error;
	}
}

/**
 * Elimina un documento y todos sus embeddings asociados
 * @param {string} documentId - ID del documento a eliminar
 * @returns {Promise<boolean>} Resultado de la operación
 */
async function deleteDocument(documentId) {
	try {
		// Eliminar embeddings de Qdrant
		await qdrantService.deleteDocumentEmbeddings(documentId);

		// Eliminar metadatos del documento
		const metadataPath = path.join(
			__dirname,
			"..",
			"uploads",
			`${documentId}_metadata.json`
		);
		await fs.unlink(metadataPath).catch((err) => {
			if (err.code !== "ENOENT") throw err;
			// Si el archivo no existe, ignorar el error
		});

		return true;
	} catch (error) {
		console.error("Error al eliminar documento:", error);
		throw error;
	}
}

/**
 * Obtiene la lista de documentos procesados
 * @returns {Promise<object[]>} Lista de documentos
 */
async function getDocumentsList() {
	try {
		const uploadsDir = path.join(__dirname, "..", "uploads");
		const files = await fs.readdir(uploadsDir);

		// Filtrar solo archivos de metadatos JSON
		const metadataFiles = files.filter((file) =>
			file.endsWith("_metadata.json")
		);

		// Leer los metadatos de cada documento
		const documentsPromises = metadataFiles.map(async (file) => {
			const filePath = path.join(uploadsDir, file);
			const content = await fs.readFile(filePath, "utf8");
			return JSON.parse(content);
		});

		return await Promise.all(documentsPromises);
	} catch (error) {
		console.error("Error al obtener lista de documentos:", error);
		throw error;
	}
}

module.exports = {
	processDocument,
	deleteDocument,
	getDocumentsList,
};
