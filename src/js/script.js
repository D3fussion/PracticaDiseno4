let currentRequest = {
    controller: null,
    timeoutId: null,
    slowWarningId: null
};

const retryMax = 3;

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

const delay = millis => new Promise((resolve, reject) => {
    setTimeout(_ => resolve(), millis)
});


const sanitizarInput = (texto) => {
    if (!texto) return "";
    return texto
        .trim()
        .replace(/[<>"'/]/g, "") // Evita la inyeccion de codigo
        .slice(0, 50); // Supuestamente es correcto limitarlo para evitar abusos
}

const obtenerDatosClima = async (ciudad) => {

    if (currentRequest.controller) {
        currentRequest.controller.abort('new_search');
        clearTimeout(currentRequest.timeoutId);
        clearTimeout(currentRequest.slowWarningId);
    }

    const controller = new AbortController();

    currentRequest = {
        controller: controller,
        timeoutId: setTimeout(() => {
            controller.abort('timeout');
        }, 10000), // 10s timeout
        slowWarningId: setTimeout(() => {
            actualizarMensaje(2, "La petición está tardando más de lo esperado");
        }, 5000) // 5s warning
    };

    actualizarMensaje(4, "Cargando...");
    actualizarBoton(true);

    try {
        let retryCount = 0;
        let respuesta = null;
        let lastError = null;

        while (retryCount < retryMax) {
            try {
                const ciudadEncoded = encodeURIComponent(ciudad);

                respuesta = await fetch(`/api/clima?ciudad=${ciudadEncoded}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    signal: controller.signal
                });

                if (respuesta.status >= 400 && respuesta.status < 500) {
                    break;
                }

                if (respuesta.ok) {
                    break;
                }

                throw new Error(`Error del servidor: ${respuesta.status}`);

            } catch (fetchError) {
                if (fetchError.name === 'AbortError') throw fetchError;

                lastError = fetchError;
                retryCount++;

                if (retryCount < retryMax) {
                    actualizarMensaje(2, `Reintentando... (${retryCount}/${retryMax})`);
                    await delay(1000);
                }
            }
        }

        if (currentRequest.controller === controller) {
            clearTimeout(currentRequest.timeoutId);
            clearTimeout(currentRequest.slowWarningId);
            currentRequest = { controller: null, timeoutId: null, slowWarningId: null };
        }

        if (!respuesta || !respuesta.ok) {
            const mensaje = respuesta && respuesta.status === 400
                ? "Ciudad no encontrada o inválida"
                : (lastError ? "Fallo de red o servidor" : "No se pudo obtener el clima");
            throw new Error(mensaje);
        }

        const datos = await respuesta.json();

        if (datos.error) {
            throw new Error(datos.error);
        }

        actualizarMensaje(1, "Datos obtenidos correctamente");
        actualizarBoton(false);
        return datos;

    } catch (error) {
        const reason = controller.signal.reason;

        if (reason === 'new_search' || error === 'new_search') {
            return;
        }

        if (currentRequest.controller === controller) {
            clearTimeout(currentRequest.timeoutId);
            clearTimeout(currentRequest.slowWarningId);
            currentRequest = { controller: null, timeoutId: null, slowWarningId: null };
            actualizarBoton(false);
        }

        if (reason === 'timeout' || error === 'timeout') {
            actualizarMensaje(3, "La petición agotó el tiempo de espera (10s)");
        } else {
            actualizarMensaje(3, error.message || "Ocurrió un error inesperado");
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

function actualizarBoton(estado) {
    const boton = document.getElementById("botonSubmit");
    if (estado) {
        boton.classList.add("btn-disabled");
    } else {
        boton.classList.remove("btn-disabled");
    }
}

function primeraBusqueda() {
    fetch('https://ipapi.co/json/')
        .then(response => response.json())
        .then(data => {

            gestionarBusqueda(data.city);

        })
        .catch(error => {
            console.error('Error obteniendo IP:', error);
            actualizarMensaje(3, "No se pudo obtener la geolocalizacion");
        });
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

    primeraBusqueda(); // Evita preguntarle al usuario por su ubicacion en la primera vez

});

