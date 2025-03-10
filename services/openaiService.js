const { OpenAI } = require("openai");
const dotenv = require("dotenv");

dotenv.config();

// Configuración del cliente de OpenAI
const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
	organization: process.env.OPENAI_ORG_ID,
});

/**
 * Genera una respuesta utilizando ChatGPT con el contexto proporcionado
 * @param {string} question - Pregunta del usuario
 * @param {string[]} relevantChunks - Fragmentos relevantes del documento
 * @param {object} conversationHistory - Historial de conversación opcional
 * @returns {Promise<object>} Respuesta generada y datos de uso de tokens
 */
async function generateChatResponse(
	question,
	relevantChunks,
	conversationHistory = null
) {
	try {
		// Construir el prompt con los fragmentos relevantes
		const contextText = relevantChunks.join("\n\n");

		// Preparar los mensajes
		const messages = [];

		// Añadir historial de conversación si existe
		if (
			conversationHistory &&
			conversationHistory.messages &&
			conversationHistory.messages.length > 0
		) {
			messages.push(...conversationHistory.messages);
		}

		// Añadir el contexto y la pregunta actual
		messages.push({
			role: "user",
			content: `Usando la siguiente información del documento, responde la pregunta del usuario de manera concisa y precisa.
			
Información del documento:
${contextText}

Pregunta: ${question}

Si la información proporcionada no es suficiente para responder la pregunta, indícalo claramente.`,
		});

		// Generar la respuesta
		const response = await openai.chat.completions.create({
			model: process.env.OPENAI_COMPLETION_MODEL || "gpt-4o-mini",
			messages: messages,
			temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
			max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS, 10) || 1000,
		});

		// Extraer información de uso de tokens
		const tokenUsage = {
			prompt_tokens: response.usage.prompt_tokens,
			completion_tokens: response.usage.completion_tokens,
			total_tokens: response.usage.total_tokens,
			estimated_cost: calculateEstimatedCost(
				response.usage.prompt_tokens,
				response.usage.completion_tokens,
				process.env.OPENAI_COMPLETION_MODEL || "gpt-4o-mini"
			),
		};

		return {
			content: response.choices[0].message.content,
			tokenUsage: tokenUsage,
		};
	} catch (error) {
		console.error("Error al generar respuesta de chat:", error);
		throw error;
	}
}

/**
 * Calcula el costo estimado basado en el uso de tokens y modelo
 * @param {number} promptTokens - Tokens del prompt
 * @param {number} completionTokens - Tokens de la respuesta
 * @param {string} model - Modelo utilizado
 * @returns {object} Costo estimado en USD
 */
function calculateEstimatedCost(promptTokens, completionTokens, model) {
	// Precios por 1M tokens según https://openai.com/pricing
	// Nota: Estos precios pueden cambiar, mantener actualizado
	const pricing = {
		"gpt-4o-mini": {
			prompt: 0.15 / 1000000, // $0.15 por 1M tokens de prompt
			completion: 0.6 / 1000000, // $0.60 por 1M tokens de completion
		},
	};

	// Usar gpt-4o-mini como fallback si el modelo no está en la lista
	const modelPricing = pricing[model] || pricing["gpt-4o-mini"];

	// Calcular costo
	const promptCost = promptTokens * modelPricing.prompt;
	const completionCost = completionTokens * modelPricing.completion;
	const totalCost = promptCost + completionCost;

	return {
		usd: totalCost.toFixed(6),
		model: model,
		breakdown: {
			prompt_cost: promptCost.toFixed(6),
			completion_cost: completionCost.toFixed(6),
		},
	};
}

module.exports = {
	generateChatResponse,
};
