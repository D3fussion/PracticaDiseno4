export default async function handler(req, res) {
    const { ciudad } = req.query;

    if (!ciudad) {
        return res.status(400).json({ error: "Ciudad no proporcionada" });
    }

    const API_KEY = process.env.WEATHER_API_KEY;
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${ciudad}`;

    try {
        const respuesta = await fetch(url);

        const data = await respuesta.json();

        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=59'); // Cache de Vercel de 1 hora

        return res.status(200).json(data);
    } catch (error) {
        console.error("Error al obtener el clima:", error);
        res.status(500).json({ error: "Error al obtener el clima" });
    }
}