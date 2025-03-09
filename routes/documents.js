const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const { v4: uuidv4 } = require("uuid");

const documentService = require("../services/documentService");

const router = express.Router();

// Configurar multer para subir archivos
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, path.join(__dirname, "..", "uploads"));
	},
	filename: (req, file, cb) => {
		const documentId = uuidv4();
		const uniqueFilename = `${documentId}${path.extname(
			file.originalname
		)}`;
		// Guardar el ID del documento en la request para usarlo más tarde
		req.documentId = documentId;
		cb(null, uniqueFilename);
	},
});

// Filtro para tipos de archivos permitidos
const fileFilter = (req, file, cb) => {
	const allowedExtensions = [".pdf", ".txt", ".md", ".json"];
	const ext = path.extname(file.originalname).toLowerCase();

	if (allowedExtensions.includes(ext)) {
		cb(null, true);
	} else {
		cb(
			new Error(
				"Tipo de archivo no permitido. Solo se permiten PDF, TXT, MD y JSON."
			)
		);
	}
};

const upload = multer({
	storage,
	fileFilter,
	limits: { fileSize: 10 * 1024 * 1024 }, // Límite de 10MB
});

/**
 * Subir y procesar un documento
 * POST /api/documents/upload
 */
router.post("/upload", upload.single("file"), async (req, res) => {
	try {
		if (!req.file) {
			return res
				.status(400)
				.json({ error: "No se ha proporcionado ningún archivo" });
		}

		const documentId = req.documentId;
		const filePath = req.file.path;
		const title =
			req.body.title ||
			path.basename(
				req.file.originalname,
				path.extname(req.file.originalname)
			);

		// Procesar el documento (extraer texto, dividir en chunks, generar embeddings)
		const result = await documentService.processDocument(
			filePath,
			documentId,
			title
		);

		res.status(200).json({
			message: "Documento procesado con éxito",
			document: result,
		});
	} catch (error) {
		console.error("Error en la ruta de subida de documentos:", error);

		// Intentar eliminar el archivo si hubo un error
		if (req.file && req.file.path) {
			await fs
				.unlink(req.file.path)
				.catch((err) =>
					console.error("Error al eliminar archivo:", err)
				);
		}

		res.status(500).json({
			error: "Error al procesar el documento",
			details: error.message,
		});
	}
});

/**
 * Obtener lista de documentos
 * GET /api/documents
 */
router.get("/", async (req, res) => {
	try {
		const documents = await documentService.getDocumentsList();
		res.status(200).json(documents);
	} catch (error) {
		console.error("Error al obtener lista de documentos:", error);
		res.status(500).json({
			error: "Error al obtener lista de documentos",
			details: error.message,
		});
	}
});

/**
 * Eliminar un documento
 * DELETE /api/documents/:id
 */
router.delete("/:id", async (req, res) => {
	try {
		const documentId = req.params.id;

		// Eliminar documento y sus embeddings
		await documentService.deleteDocument(documentId);

		res.status(200).json({
			message: "Documento eliminado con éxito",
			documentId,
		});
	} catch (error) {
		console.error("Error al eliminar documento:", error);
		res.status(500).json({
			error: "Error al eliminar documento",
			details: error.message,
		});
	}
});

module.exports = router;
