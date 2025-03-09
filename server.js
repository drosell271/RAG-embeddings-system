const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");

// Cargar variables de entorno
dotenv.config();

// Importar rutas
const documentsRouter = require("./routes/documents");
const queriesRouter = require("./routes/queries");

// Importar servicios
const qdrantService = require("./services/qdrantService");

// Inicializar la aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Rutas de la API
app.use("/api/documents", documentsRouter);
app.use("/api/queries", queriesRouter);

// Ruta principal para la interfaz de usuario
app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Inicializar la base de datos Qdrant y luego iniciar el servidor
async function startServer() {
	try {
		// Inicializar la colección en Qdrant
		await qdrantService.initializeCollection();
		console.log("Conexión a Qdrant establecida y colección inicializada");

		// Iniciar el servidor
		app.listen(PORT, () => {
			console.log(`Servidor corriendo en http://localhost:${PORT}`);
		});
	} catch (error) {
		console.error("Error al inicializar el servidor:", error);
		process.exit(1);
	}
}

startServer();
