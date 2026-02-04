# Buscador de Clima

Esta es una página web sencilla que permite consultar el clima actual y el pronóstico del día para una ciudad específica.

## Funcionamiento
La aplicación funciona ingresando el nombre de una ciudad en el buscador. Al enviar el formulario:
1.  Se realiza una petición **fetch** (GET) asíncrona mediante JavaScript.
2.  Se obtienen los datos en formato JSON.
3.  Se procesa la respuesta y se actualiza el DOM para mostrar la información en pantalla (temperatura, humedad, viento, etc.).

## API Utilizada
La aplicación utiliza la API de **WeatherAPI.com** para obtener los datos meteorológicos en tiempo real.
Endpoint: `http://api.weatherapi.com/v1/forecast.json`
