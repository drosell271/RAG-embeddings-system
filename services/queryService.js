const openaiService = require("./openaiService");
const huggingfaceService = require("./huggingfaceService");
const qdrantService = require("./qdrantService");

/**
 * Procesa una consulta del usuario y genera una respuesta basada en los documentos
 * @param {string} query - Consulta del usuario
 * @param {object} options - Opciones adicionales (historial, número de resultados, etc.)
 * @returns {Promise<object>} Respuesta generada y fragmentos relevantes
 */
async function processQuery(query, options = {}) {
	try {
		const limit = options.limit || 5; // Número de fragmentos a recuperar
		const conversationHistory = options.conversationHistory || null;

		// Generar embedding para la consulta usando Hugging Face
		const queryEmbedding = await huggingfaceService.generateEmbedding(
			query
		);

		// Buscar fragmentos relevantes
		const relevantResults = await qdrantService.searchSimilarChunks(
			queryEmbedding,
			limit
		);

		// Extraer solo el texto de los fragmentos para enviar a la API de ChatGPT
		const relevantChunks = relevantResults.map((result) => result.text);

		// Generar respuesta utilizando GPT
		const generatedResponse = await openaiService.generateChatResponse(
			query,
			relevantChunks,
			conversationHistory
		);

		// Devolver tanto la respuesta como los fragmentos relevantes para referencia
		return {
			query: query,
			answer: generatedResponse.content,
			relevantChunks: relevantResults,
			tokenUsage: generatedResponse.tokenUsage,
			timestamp: new Date().toISOString(),
		};
	} catch (error) {
		console.error("Error al procesar consulta:", error);
		throw error;
	}
}

/**
 * Guarda un historial de conversación para futuras consultas
 * @param {object} conversation - Objeto con la conversación (pregunta, respuesta, etc.)
 * @returns {Promise<string>} ID de la conversación guardada
 */
async function saveConversation(conversation) {
	// Esta función podría implementarse para guardar el historial en una base de datos
	// Por ahora, simplemente devolvemos el objeto con un ID
	const conversationId = `conv_${Date.now()}`;

	// Aquí se podría guardar en una base de datos o archivo
	console.log(`Conversación guardada con ID: ${conversationId}`);

	return conversationId;
}

module.exports = {
	processQuery,
	saveConversation,
};
