document.addEventListener("DOMContentLoaded", function () {
	// Variables para el estado de la aplicación
	let conversationHistory = {
		messages: [],
	};

	// Referencias a elementos del DOM
	const uploadBtn = document.getElementById("uploadBtn");
	const uploadForm = document.getElementById("uploadForm");
	const cancelUpload = document.getElementById("cancelUpload");
	const documentForm = document.getElementById("documentForm");
	const documentsList = document.getElementById("documentsList");
	const processing = document.getElementById("processing");
	const queryForm = document.getElementById("queryForm");
	const conversation = document.getElementById("conversation");
	const clearConversationBtn = document.getElementById("clearConversation");

	// Manejadores de eventos
	uploadBtn.addEventListener("click", () => {
		uploadForm.style.display = "block";
	});

	cancelUpload.addEventListener("click", () => {
		uploadForm.style.display = "none";
		documentForm.reset();
	});

	documentForm.addEventListener("submit", handleDocumentUpload);
	queryForm.addEventListener("submit", handleQuerySubmit);
	clearConversationBtn.addEventListener("click", clearConversation);

	// Cargar documentos al iniciar
	loadDocuments();

	/**
	 * Maneja la subida de documentos
	 * @param {Event} e - Evento de submit
	 */
	async function handleDocumentUpload(e) {
		e.preventDefault();

		const formData = new FormData(documentForm);

		try {
			uploadForm.style.display = "none";
			processing.style.display = "flex";

			const response = await fetch("/api/documents/upload", {
				method: "POST",
				body: formData,
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "Error al subir el documento");
			}

			// Mostrar notificación de éxito
			showNotification("Documento procesado con éxito", "success");

			// Recargar la lista de documentos
			loadDocuments();

			// Limpiar el formulario
			documentForm.reset();
		} catch (error) {
			console.error("Error:", error);
			showNotification(error.message, "error");
		} finally {
			processing.style.display = "none";
		}
	}

	/**
	 * Carga la lista de documentos desde la API
	 */
	async function loadDocuments() {
		try {
			const response = await fetch("/api/documents");
			const documents = await response.json();

			if (documents.length === 0) {
				documentsList.innerHTML =
					'<p class="empty-state">No hay documentos procesados. Sube un documento para comenzar.</p>';
				return;
			}

			// Limpiar lista actual
			documentsList.innerHTML = "";

			// Añadir cada documento a la lista
			documents.forEach((doc) => {
				const docElement = document.createElement("div");
				docElement.className = "document-item";
				docElement.innerHTML = `
					<div class="document-info">
						<h3>${escapeHTML(doc.title)}</h3>
						<p>Fragmentos: ${doc.totalChunks} | Fecha: ${formatDate(doc.processedAt)}</p>
					</div>
					<button class="btn delete" data-id="${doc.id}" title="Eliminar documento">
						<i class="fas fa-trash"></i>
					</button>
				`;

				// Añadir evento para eliminar documento
				const deleteBtn = docElement.querySelector(".delete");
				deleteBtn.addEventListener("click", () =>
					deleteDocument(doc.id)
				);

				documentsList.appendChild(docElement);
			});
		} catch (error) {
			console.error("Error al cargar documentos:", error);
			showNotification("Error al cargar la lista de documentos", "error");
		}
	}

	/**
	 * Elimina un documento
	 * @param {string} documentId - ID del documento a eliminar
	 */
	async function deleteDocument(documentId) {
		if (!confirm("¿Estás seguro de que deseas eliminar este documento?")) {
			return;
		}

		try {
			const response = await fetch(`/api/documents/${documentId}`, {
				method: "DELETE",
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(
					result.error || "Error al eliminar el documento"
				);
			}

			// Mostrar notificación de éxito
			showNotification("Documento eliminado con éxito", "success");

			// Recargar la lista de documentos
			loadDocuments();
		} catch (error) {
			console.error("Error:", error);
			showNotification(error.message, "error");
		}
	}

	/**
	 * Maneja el envío de consultas
	 * @param {Event} e - Evento de submit
	 */
	async function handleQuerySubmit(e) {
		e.preventDefault();

		const queryInput = document.getElementById("query");
		const query = queryInput.value.trim();

		if (!query) {
			showNotification("La consulta no puede estar vacía", "error");
			return;
		}

		// Añadir la consulta al historial de conversación
		appendUserMessage(query);

		// Mostrar indicador de carga
		appendLoadingMessage();

		try {
			let endpoint = "/api/queries";
			let requestBody = { query };

			// Si hay historial de conversación, usar el endpoint de conversación
			if (conversationHistory.messages.length > 0) {
				endpoint = "/api/queries/conversation";
				requestBody.conversationHistory = conversationHistory;
			}

			const response = await fetch(endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestBody),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(
					result.error || "Error al procesar la consulta"
				);
			}

			// Eliminar el mensaje de carga
			removeLoadingMessage();

			// Añadir la respuesta a la conversación, incluyendo información de tokens
			appendAssistantMessage(
				result.answer,
				result.relevantChunks,
				result.tokenUsage
			);

			// Actualizar el historial de conversación para futuras consultas
			updateConversationHistory(query, result.answer);

			// Limpiar el campo de consulta
			queryInput.value = "";
		} catch (error) {
			console.error("Error:", error);

			// Eliminar el mensaje de carga
			removeLoadingMessage();

			// Mostrar el error en la conversación
			appendErrorMessage(error.message);
		}
	}

	/**
	 * Añade un mensaje del usuario a la conversación
	 * @param {string} message - Mensaje del usuario
	 */
	function appendUserMessage(message) {
		// Si es el primer mensaje, limpiar el estado vacío
		if (conversation.querySelector(".empty-state")) {
			conversation.innerHTML = "";
		}

		const messageElement = document.createElement("div");
		messageElement.className = "message user-message";
		messageElement.innerHTML = `
			<div class="message-content">
				<p>${escapeHTML(message)}</p>
			</div>
		`;

		conversation.appendChild(messageElement);
		conversation.scrollTop = conversation.scrollHeight;
	}

	/**
	 * Añade un mensaje del asistente a la conversación
	 * @param {string} message - Mensaje del asistente
	 * @param {object[]} relevantChunks - Fragmentos relevantes (opcional)
	 * @param {object} tokenUsage - Información de uso de tokens (opcional)
	 */
	function appendAssistantMessage(
		message,
		relevantChunks = [],
		tokenUsage = null
	) {
		const messageElement = document.createElement("div");
		messageElement.className = "message assistant-message";

		// Formatear el mensaje con markdown simple
		const formattedMessage = formatMessage(message);

		// Información de tokens (si está disponible)
		let tokenInfoHTML = "";
		if (tokenUsage) {
			tokenInfoHTML = `
				<div class="token-info">
					<button class="toggle-tokens">Ver uso de tokens</button>
					<div class="tokens-details" style="display: none;">
						<h4>Uso de tokens:</h4>
						<ul>
							<li>Prompt: ${tokenUsage.prompt_tokens} tokens</li>
							<li>Respuesta: ${tokenUsage.completion_tokens} tokens</li>
							<li>Total: ${tokenUsage.total_tokens} tokens</li>
							<li>Costo estimado: $${tokenUsage.estimated_cost.usd} USD (${tokenUsage.estimated_cost.model})</li>
						</ul>
					</div>
				</div>
			`;
		}

		// Información de fuentes
		let chunksHTML = "";
		if (relevantChunks && relevantChunks.length > 0) {
			chunksHTML = `
				<div class="sources-toggle">
					<button class="toggle-sources">Ver fuentes (${relevantChunks.length})</button>
					<div class="sources-list" style="display: none;">
						<h4>Fragmentos relevantes:</h4>
						<ul>
							${relevantChunks
								.map(
									(chunk, index) => `
								<li>
									<div class="source-item">
										<span class="source-title">${escapeHTML(
											chunk.title || "Documento"
										)} - Fragmento ${
										chunk.chunkIndex + 1
									}</span>
										<span class="source-score">Relevancia: ${(chunk.score * 100).toFixed(1)}%</span>
										<p>${escapeHTML(truncateText(chunk.text, 150))}</p>
									</div>
								</li>
							`
								)
								.join("")}
						</ul>
					</div>
				</div>
			`;
		}

		messageElement.innerHTML = `
			<div class="message-content">
				${formattedMessage}
				${tokenInfoHTML}
				${chunksHTML}
			</div>
		`;

		conversation.appendChild(messageElement);
		conversation.scrollTop = conversation.scrollHeight;

		// Añadir evento para mostrar/ocultar fuentes
		const toggleSourcesBtn =
			messageElement.querySelector(".toggle-sources");
		if (toggleSourcesBtn) {
			toggleSourcesBtn.addEventListener("click", function () {
				const sourcesList = this.nextElementSibling;
				if (sourcesList.style.display === "none") {
					sourcesList.style.display = "block";
					this.textContent = `Ocultar fuentes (${relevantChunks.length})`;
				} else {
					sourcesList.style.display = "none";
					this.textContent = `Ver fuentes (${relevantChunks.length})`;
				}
			});
		}

		// Añadir evento para mostrar/ocultar información de tokens
		const toggleTokensBtn = messageElement.querySelector(".toggle-tokens");
		if (toggleTokensBtn) {
			toggleTokensBtn.addEventListener("click", function () {
				const tokensDetails = this.nextElementSibling;
				if (tokensDetails.style.display === "none") {
					tokensDetails.style.display = "block";
					this.textContent = "Ocultar uso de tokens";
				} else {
					tokensDetails.style.display = "none";
					this.textContent = "Ver uso de tokens";
				}
			});
		}
	}

	/**
	 * Añade un mensaje de error a la conversación
	 * @param {string} errorMessage - Mensaje de error
	 */
	function appendErrorMessage(errorMessage) {
		const messageElement = document.createElement("div");
		messageElement.className = "message error-message";
		messageElement.innerHTML = `
			<div class="message-content">
				<p><i class="fas fa-exclamation-circle"></i> Error: ${escapeHTML(
					errorMessage
				)}</p>
			</div>
		`;

		conversation.appendChild(messageElement);
		conversation.scrollTop = conversation.scrollHeight;
	}

	/**
	 * Añade un mensaje de carga a la conversación
	 */
	function appendLoadingMessage() {
		const messageElement = document.createElement("div");
		messageElement.className = "message assistant-message loading";
		messageElement.innerHTML = `
			<div class="message-content">
				<p><i class="fas fa-spinner fa-spin"></i> Procesando consulta...</p>
			</div>
		`;

		conversation.appendChild(messageElement);
		conversation.scrollTop = conversation.scrollHeight;
	}

	/**
	 * Elimina el mensaje de carga de la conversación
	 */
	function removeLoadingMessage() {
		const loadingMessage = conversation.querySelector(".loading");
		if (loadingMessage) {
			conversation.removeChild(loadingMessage);
		}
	}

	/**
	 * Actualiza el historial de conversación para futuras consultas
	 * @param {string} query - Consulta del usuario
	 * @param {string} answer - Respuesta del asistente
	 */
	function updateConversationHistory(query, answer) {
		// Añadir mensajes al historial
		conversationHistory.messages.push({ role: "user", content: query });
		conversationHistory.messages.push({
			role: "assistant",
			content: answer,
		});

		// Mantener solo los últimos 10 mensajes para evitar contextos muy largos
		if (conversationHistory.messages.length > 10) {
			conversationHistory.messages =
				conversationHistory.messages.slice(-10);
		}
	}

	/**
	 * Limpia la conversación actual
	 */
	function clearConversation() {
		// Reiniciar el historial
		conversationHistory = { messages: [] };

		// Limpiar la interfaz
		conversation.innerHTML =
			'<p class="empty-state">Haz una pregunta para comenzar la conversación.</p>';

		// Limpiar el campo de consulta
		document.getElementById("query").value = "";
	}

	/**
	 * Muestra una notificación
	 * @param {string} message - Mensaje de la notificación
	 * @param {string} type - Tipo de notificación (success, error)
	 */
	function showNotification(message, type = "info") {
		// Crear elemento de notificación
		const notification = document.createElement("div");
		notification.className = `notification ${type}`;
		notification.innerHTML = `
			<p>${escapeHTML(message)}</p>
			<button class="close-notification"><i class="fas fa-times"></i></button>
		`;

		// Añadir a la página
		document.body.appendChild(notification);

		// Mostrar con animación
		setTimeout(() => {
			notification.classList.add("show");
		}, 10);

		// Configurar botón de cierre
		const closeBtn = notification.querySelector(".close-notification");
		closeBtn.addEventListener("click", () => {
			notification.classList.remove("show");
			setTimeout(() => {
				document.body.removeChild(notification);
			}, 300);
		});

		// Auto-cerrar después de 5 segundos
		setTimeout(() => {
			if (document.body.contains(notification)) {
				notification.classList.remove("show");
				setTimeout(() => {
					if (document.body.contains(notification)) {
						document.body.removeChild(notification);
					}
				}, 300);
			}
		}, 5000);
	}

	// Funciones de utilidad

	/**
	 * Formatea un mensaje con markdown simple
	 * @param {string} message - Mensaje a formatear
	 * @returns {string} Mensaje formateado en HTML
	 */
	function formatMessage(message) {
		// Convertir saltos de línea
		message = message.replace(/\n/g, "<br>");

		// Formatear negrita
		message = message.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

		// Formatear cursiva
		message = message.replace(/\*(.*?)\*/g, "<em>$1</em>");

		// Formatear código
		message = message.replace(/`(.*?)`/g, "<code>$1</code>");

		return message;
	}

	/**
	 * Formatea una fecha ISO a un formato legible
	 * @param {string} isoDate - Fecha en formato ISO
	 * @returns {string} Fecha formateada
	 */
	function formatDate(isoDate) {
		const date = new Date(isoDate);
		return date.toLocaleDateString() + " " + date.toLocaleTimeString();
	}

	/**
	 * Trunca un texto a una longitud máxima
	 * @param {string} text - Texto a truncar
	 * @param {number} maxLength - Longitud máxima
	 * @returns {string} Texto truncado
	 */
	function truncateText(text, maxLength) {
		if (text.length <= maxLength) return text;
		return text.substring(0, maxLength) + "...";
	}

	/**
	 * Escapa caracteres HTML para prevenir inyección de código
	 * @param {string} text - Texto a escapar
	 * @returns {string} Texto escapado
	 */
	function escapeHTML(text) {
		const div = document.createElement("div");
		div.textContent = text;
		return div.innerHTML;
	}
});
