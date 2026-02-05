let currentController = null;

const diccionarioId = {
    ciudad: document.getElementById('ciudad'),
    pais: document.getElementById('pais'),
    act: document.getElementById('actualizacion'),
    temp: document.getElementById('temperatura'),
    sens: document.getElementById('sensacion'),
    max: document.getElementById('maxima'),
    min: document.getElementById('minima'),
    cond: document.getElementById('condicion'),
    hum: document.getElementById('humedad'),
    uv: document.getElementById('uv'),
    viento: document.getElementById('viento'),
    vis: document.getElementById('visibilidad'),
    pres: document.getElementById('presion')
}

const sanitizarInput = (texto) => {
    if (!texto) return "";
    return texto
        .trim()
        .replace(/[<>"'/]/g, "") // Evita la inyeccion de codigo
        .slice(0, 50); // Supuestamente es correcto limitarlo para evitar abusos
}

const obtenerDatosClima = async (ciudad) => {

    if (currentController) {
        currentController.abort();
    }

    currentController = new AbortController();

    actualizarMensaje(4, "Cargando...");

    const timeOutError = setTimeout(() => {
        actualizarMensaje(3, "Error al obtener los datos del clima");
        currentController.abort();
    }, 10000);

    const timeOutLento = setTimeout(() => {
        actualizarMensaje(2, "La petición está tardando más de lo esperado");
    }, 5000);

    try {

        const ciudadEncoded = encodeURIComponent(ciudad);

        const respuesta = await fetch(`/api/clima?ciudad=${ciudadEncoded}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            signal: currentController.signal
        });

        if (!respuesta.ok) {
            throw new Error("No se pudo obtener los datos del clima");
        }

        clearTimeout(timeOutError);
        clearTimeout(timeOutLento);

        const datos = await respuesta.json();

        if (datos.error) {
            throw new Error(datos.error);
        }

        actualizarMensaje(1, "Datos obtenidos correctamente");
        return datos;

    } catch (error) {

        clearTimeout(timeOutError);
        clearTimeout(timeOutLento);

        if (error.name === "AbortError") {
            actualizarMensaje(3, "La petición agoto el tiempo de espera (10s)");
        } else {
            actualizarMensaje(3, "No se encontro la ciudad, o fallo la red");
        }

        return error;
    }
}

function actualizarMensaje(tipo, mensaje) {
    const mensajesPeticion = document.getElementById("mensajesPeticion");

    mensajesPeticion.className = "mt-8 w-[80%] md:1/2 lg:w-1/3 h-fit border-2 shadow-sm p-4";

    switch (tipo) {
        case 1: // Success
            mensajesPeticion.classList.add("bg-green-200", "border-green-500");
            break;
        case 2: // Warning
            mensajesPeticion.classList.add("bg-yellow-200", "border-yellow-500");
            break;
        case 3: // Error
            mensajesPeticion.classList.add("bg-red-200", "border-red-500");
            break;
        default: // Default / Cargando
            mensajesPeticion.classList.add("bg-white", "border-stone-200");
            break;
    }

    mensajesPeticion.textContent = mensaje;
}

function actualizarClima(weatherData) {

    if (weatherData instanceof Error || weatherData == null) {
        return; // Por si acaso pasa el if anterior
    }

    diccionarioId.ciudad.textContent = weatherData.location.name;
    diccionarioId.pais.textContent = weatherData.location.country;

    const horaFull = weatherData.current.last_updated || "";
    diccionarioId.act.textContent = horaFull.split(' ')[1] || horaFull;

    diccionarioId.temp.textContent = weatherData.current.temp_c + "°C";
    diccionarioId.sens.textContent = weatherData.current.feelslike_c + "°C";

    if (weatherData.forecast && weatherData.forecast.forecastday[0]) {
        diccionarioId.max.textContent = weatherData.forecast.forecastday[0].day.maxtemp_c + "°C";
        diccionarioId.min.textContent = weatherData.forecast.forecastday[0].day.mintemp_c + "°C";
    } else {
        diccionarioId.max.textContent = "N/A";
        diccionarioId.min.textContent = "N/A";
    }

    diccionarioId.cond.textContent = weatherData.current.condition.text;

    diccionarioId.hum.textContent = weatherData.current.humidity + "%";
    diccionarioId.uv.textContent = weatherData.current.uv;
    diccionarioId.viento.textContent = weatherData.current.wind_kph + " km/h";
    diccionarioId.vis.textContent = weatherData.current.vis_km + " km";
    diccionarioId.pres.textContent = weatherData.current.pressure_mb + " mb";
}

function gestionarBusqueda(ciudad) {
    obtenerDatosClima(ciudad).then((datos) => {
        if (!(datos instanceof Error) && datos != null) {
            document.getElementById("formPrincipal")["Ciudad"].value = "";
            actualizarClima(datos);
        }
    });
}

function subirFormulario() {
    const formPrincipal = document.getElementById("formPrincipal");
    formPrincipal.addEventListener("submit", (event) => {
        event.preventDefault();
        const inputRaw = formPrincipal["Ciudad"].value;
        const ciudad = sanitizarInput(inputRaw);

        if (ciudad === "") {
            actualizarMensaje(2, "Por favor ingrese un nombre de ciudad valido");
            return;
        }
        gestionarBusqueda(ciudad);
    });
}

function activarGeolocalizacion() {
    const btnGeo = document.getElementById("location-btn");

    if (btnGeo) {
        btnGeo.addEventListener("click", () => {
            geolocalizacion();
        });
    }
}

function geolocalizacion() {
    if (!navigator.geolocation) {
        actualizarMensaje(3, "No se puede obtener la geolocalizacion");
        return;
    }

    actualizarMensaje(4, "Obteniendo ubicacion...");

    navigator.geolocation.getCurrentPosition((position) => {
        const peticion = `${position.coords.latitude},${position.coords.longitude}`;
        gestionarBusqueda(peticion);
    }, (error) => {
        actualizarMensaje(3, "No se pudo obtener la geolocalizacion");
    })
}

document.addEventListener("DOMContentLoaded", () => {

    subirFormulario();
    activarGeolocalizacion();

    gestionarBusqueda("Hermosillo");

});

