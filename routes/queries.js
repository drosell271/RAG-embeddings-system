const express = require("express");
const queryService = require("../services/queryService");

const router = express.Router();

/**
 * Procesar una consulta
 * POST /api/queries
 */
router.post("/", async (req, res) => {
	try {
		const { query, options } = req.body;

		if (!query || typeof query !== "string" || query.trim() === "") {
			return res
				.status(400)
				.json({ error: "La consulta no puede estar vacía" });
		}

		// Procesar la consulta
		const result = await queryService.processQuery(query, options || {});

		// Guardar la conversación si se solicita
		if (options && options.saveConversation) {
			const conversationId = await queryService.saveConversation({
				query,
				answer: result.answer,
				timestamp: result.timestamp,
			});

			result.conversationId = conversationId;
		}

		res.status(200).json(result);
	} catch (error) {
		console.error("Error al procesar consulta:", error);
		res.status(500).json({
			error: "Error al procesar consulta",
			details: error.message,
		});
	}
});

/**
 * Continuar una conversación existente
 * POST /api/queries/conversation
 */
router.post("/conversation", async (req, res) => {
	try {
		const { query, conversationHistory, options } = req.body;

		if (!query || typeof query !== "string" || query.trim() === "") {
			return res
				.status(400)
				.json({ error: "La consulta no puede estar vacía" });
		}

		if (
			!conversationHistory ||
			!Array.isArray(conversationHistory.messages)
		) {
			return res
				.status(400)
				.json({ error: "El historial de conversación es inválido" });
		}

		// Procesar la consulta con el historial de conversación
		const result = await queryService.processQuery(query, {
			...options,
			conversationHistory,
		});

		res.status(200).json(result);
	} catch (error) {
		console.error("Error al procesar consulta de conversación:", error);
		res.status(500).json({
			error: "Error al procesar consulta de conversación",
			details: error.message,
		});
	}
});

module.exports = router;
