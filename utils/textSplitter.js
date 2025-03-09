const dotenv = require("dotenv");

dotenv.config();

// Configuración para el splitter
const DEFAULT_CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || "512");
const DEFAULT_CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP || "50");

/**
 * Divide un texto en fragmentos más pequeños para procesar
 * @param {string} text - Texto a dividir
 * @param {number} chunkSize - Tamaño aproximado de cada fragmento
 * @param {number} overlap - Solapamiento entre fragmentos consecutivos
 * @returns {string[]} Lista de fragmentos de texto
 */
function splitTextIntoChunks(
	text,
	chunkSize = DEFAULT_CHUNK_SIZE,
	overlap = DEFAULT_CHUNK_OVERLAP
) {
	// Eliminar espacios en blanco extra y normalizar saltos de línea
	const cleanedText = text.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();

	// Si el texto es más corto que el tamaño de chunk, devolverlo completo
	if (cleanedText.length <= chunkSize) {
		return [cleanedText];
	}

	const chunks = [];

	// Dividir primero por párrafos para intentar mantener la coherencia
	const paragraphs = cleanedText.split(/\n\s*\n/);
	let currentChunk = "";

	for (const paragraph of paragraphs) {
		// Si el párrafo es muy grande, dividirlo en oraciones
		if (paragraph.length > chunkSize) {
			const sentences = splitIntoSentences(paragraph);

			for (const sentence of sentences) {
				// Si una oración es demasiado larga, dividirla por palabras
				if (sentence.length > chunkSize) {
					const sentenceChunks = splitLongSentence(
						sentence,
						chunkSize,
						overlap
					);

					for (const sentenceChunk of sentenceChunks) {
						if (
							currentChunk.length + sentenceChunk.length + 1 >
							chunkSize
						) {
							chunks.push(currentChunk.trim());
							currentChunk = sentenceChunk;
						} else {
							currentChunk += " " + sentenceChunk;
						}
					}
				} else {
					// Para oraciones de tamaño normal
					if (currentChunk.length + sentence.length + 1 > chunkSize) {
						chunks.push(currentChunk.trim());
						currentChunk = sentence;
					} else {
						currentChunk += (currentChunk ? " " : "") + sentence;
					}
				}
			}
		} else {
			// Para párrafos de tamaño normal
			if (currentChunk.length + paragraph.length + 2 > chunkSize) {
				chunks.push(currentChunk.trim());
				currentChunk = paragraph;
			} else {
				if (currentChunk) {
					currentChunk += "\n\n" + paragraph;
				} else {
					currentChunk = paragraph;
				}
			}
		}
	}

	// Añadir el último chunk si no está vacío
	if (currentChunk.trim()) {
		chunks.push(currentChunk.trim());
	}

	// Añadir solapamiento entre chunks para mejor contexto
	if (overlap > 0 && chunks.length > 1) {
		return createOverlappingChunks(chunks, overlap);
	}

	return chunks;
}

/**
 * Divide un texto en oraciones
 * @param {string} text - Texto a dividir
 * @returns {string[]} Lista de oraciones
 */
function splitIntoSentences(text) {
	// Regex simple que detecta finales de oración
	// No es perfecto pero funciona para la mayoría de los casos
	return text.split(/(?<=[.!?])\s+/);
}

/**
 * Divide una oración muy larga en fragmentos más pequeños
 * @param {string} sentence - Oración a dividir
 * @param {number} chunkSize - Tamaño máximo de cada fragmento
 * @param {number} overlap - Solapamiento entre fragmentos
 * @returns {string[]} Lista de fragmentos
 */
function splitLongSentence(sentence, chunkSize, overlap) {
	const words = sentence.split(/\s+/);
	const chunks = [];
	let currentChunk = "";

	for (const word of words) {
		if (currentChunk.length + word.length + 1 > chunkSize) {
			chunks.push(currentChunk.trim());
			currentChunk = word;
		} else {
			currentChunk += (currentChunk ? " " : "") + word;
		}
	}

	if (currentChunk.trim()) {
		chunks.push(currentChunk.trim());
	}

	// Añadir solapamiento si es necesario
	if (overlap > 0 && chunks.length > 1) {
		return createOverlappingChunks(chunks, overlap);
	}

	return chunks;
}

/**
 * Crea chunks con solapamiento a partir de chunks sin solapamiento
 * @param {string[]} chunks - Lista de fragmentos sin solapamiento
 * @param {number} overlap - Cantidad aproximada de caracteres a solapar
 * @returns {string[]} Lista de fragmentos con solapamiento
 */
function createOverlappingChunks(chunks, overlap) {
	// Si solo hay un chunk o ninguno, no hay nada que solapar
	if (chunks.length <= 1) return chunks;

	const result = [chunks[0]]; // El primer chunk se mantiene igual

	for (let i = 1; i < chunks.length; i++) {
		const prevChunk = chunks[i - 1];
		const currentChunk = chunks[i];

		// Tomar las últimas palabras del chunk anterior
		const overlapWords = getLastWords(prevChunk, overlap);

		// Añadir al inicio del chunk actual
		result.push(overlapWords + " " + currentChunk);
	}

	return result;
}

/**
 * Obtiene las últimas palabras de un texto hasta aproximadamente un número de caracteres
 * @param {string} text - Texto de donde obtener las palabras
 * @param {number} charCount - Número aproximado de caracteres a obtener
 * @returns {string} Últimas palabras del texto
 */
function getLastWords(text, charCount) {
	const words = text.split(/\s+/);
	let result = "";

	for (let i = words.length - 1; i >= 0; i--) {
		if (result.length + words[i].length + 1 > charCount) {
			break;
		}
		result = words[i] + (result ? " " + result : "");
	}

	return result;
}

module.exports = {
	splitTextIntoChunks,
};
