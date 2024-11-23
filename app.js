let audioContext;
let source;
let analyser;
let stream;
let isStreaming = false;
let canvasContext;
let spectrogramData = [];
const speedFactor = 1.1; // Factor de velocidad para el desplazamiento

let frequencies = []; // Array para almacenar frecuencias
let amplitudes = [];  // Array para almacenar amplitudes

async function setupAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        console.log('Audio context and source set up successfully.');
    } catch (error) {
        console.error('Error accessing audio stream:', error);
        alert('No se pudo acceder al micrófono. Por favor, revisa los permisos.');
    }
}

function startSpectrogram() {
    if (!analyser) return;

    frequencies = [];
    amplitudes = [];

    const canvas = document.getElementById('spectrogram');
    canvasContext = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const lowerFrequencyLimit = 149; // Frecuencia mínima en Hz
    const upperFrequencyLimit = 20000; // Frecuencia máxima en Hz

    const colors = {
        low: [0, 102, 204],
        medium: [255, 255, 0],
        high: [255, 0, 0],
        threshold: [255, 165, 0]
    };

    const threshold = 170;

    function draw() {
        if (!isStreaming) return;
        requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        for (let j = 0; j < speedFactor; j++) {
            const column = new Uint8ClampedArray(canvasHeight * 4);
            for (let i = 0; i < bufferLength; i++) {
                const frequency = (i * audioContext.sampleRate) / (2 * bufferLength);
                if (frequency >= lowerFrequencyLimit && frequency <= upperFrequencyLimit) {
                    const logFrequency = 1 - Math.log10(frequency / lowerFrequencyLimit) / Math.log10(upperFrequencyLimit / lowerFrequencyLimit);
                    const y = Math.floor(logFrequency * canvasHeight);

                    if (dataArray[i] < 100) {
                        column[y * 4] = colors.low[0];
                        column[y * 4 + 1] = colors.low[1];
                        column[y * 4 + 2] = colors.low[2];
                    } else if (dataArray[i] < threshold) {
                        column[y * 4] = colors.medium[0];
                        column[y * 4 + 1] = colors.medium[1];
                        column[y * 4 + 2] = colors.medium[2];
                    } else {
                        column[y * 4] = colors.high[0];
                        column[y * 4 + 1] = colors.high[1];
                        column[y * 4 + 2] = colors.high[2];
                    }

                    column[y * 4 + 3] = Math.min(255, dataArray[i] * 2);

                    if (dataArray[i] > 0) {
                        frequencies.push(frequency);
                        amplitudes.push(dataArray[i]);
                    }
                }
            }
            spectrogramData.unshift(column);
            if (spectrogramData.length > canvasWidth) {
                spectrogramData.pop();
            }
        }

        canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
        for (let x = 0; x < spectrogramData.length; x++) {
            const imageData = new ImageData(spectrogramData[x], 1, canvasHeight);
            canvasContext.putImageData(imageData, canvasWidth - x - 1, 0);
        }
    }

    draw();
}

function saveDynamicStatsToLocalStorage() { 
    if (!frequencies || frequencies.length === 0 || !amplitudes || amplitudes.length === 0) {
        console.warn("No hay datos suficientes para guardar en LocalStorage.");
        return;
    }

    // Cálculos de estadísticas
    const maxFreq = Math.max(...frequencies); // Frecuencia máxima
    const minFreq = Math.min(...frequencies); // Frecuencia mínima
    const midFreq = frequencies.length > 0
        ? frequencies.reduce((a, b) => a + b, 0) / frequencies.length
        : "No disponible"; // Media de frecuencias
    const rangeFreq = maxFreq - minFreq; // Rango de frecuencias
    const avgAmplitude = amplitudes.length > 0 
        ? amplitudes.reduce((a, b) => a + b, 0) / amplitudes.length 
        : "No disponible"; // Amplitud promedio

    // Formatear datos para guardar
    const datosEspectrograma = {
        frecuenciaAlta: maxFreq.toFixed(2),
        frecuenciaBaja: minFreq.toFixed(2),
        frecuenciaMedia: typeof midFreq === "number" ? midFreq.toFixed(2) : midFreq,
        rangoFrecuencias: rangeFreq.toFixed(2),
        amplitudPromedio: avgAmplitude !== "No disponible" ? avgAmplitude.toFixed(2) : avgAmplitude
    };

    // Guardar en LocalStorage
    localStorage.setItem("datosEspectrograma", JSON.stringify(datosEspectrograma));
    console.log("Datos guardados en LocalStorage:", datosEspectrograma);
}

function toggleMicrophone() {
    const buttonIcon = document.getElementById('toggleButton').querySelector('img');

    if (isStreaming) {
        // Detener el espectrograma
        isStreaming = false;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        // Guardar estadísticas en LocalStorage
        saveDynamicStatsToLocalStorage();

        // Cambiar el icono del botón
        buttonIcon.src = 'play.png';
        buttonIcon.alt = 'Activar Micrófono';

        console.log("Espectrograma pausado.");
    } else {
        // Iniciar el espectrograma
        setupAudio()
            .then(() => {
                isStreaming = true;

                // Cambiar el icono del botón
                buttonIcon.src = 'microphone-off.webp';
                buttonIcon.alt = 'Desactivar Micrófono';

                // Iniciar espectrograma
                startSpectrogram();
                console.log("Espectrograma iniciado.");
            })
            .catch(error => {
                console.error('Error al iniciar el espectrograma:', error);
                alert('No se pudo acceder al micrófono. Revisa los permisos.');
            });
    }
}

const toggleButton = document.getElementById('toggleButton');
if (toggleButton) {
    toggleButton.addEventListener('click', toggleMicrophone);
}

// Selección de los elementos del DOM
const helpButton = document.getElementById('helpButton'); // Botón de ayuda
const helpModal = document.getElementById('helpModal');   // Modal de ayuda
const conceptButton = document.getElementById('conceptButton'); // Botón de información
const conceptModal = document.getElementById('conceptModal');   // Modal de información
const closeButtons = document.querySelectorAll('.close'); // Botones de cierre

// Función para mostrar un modal
function showModal(modal) {
  modal.style.display = 'block';
}

// Función para ocultar un modal
function hideModal(modal) {
  modal.style.display = 'none';
}

// Mostrar el modal de ayuda
if (helpButton) {
  helpButton.addEventListener('click', () => {
    showModal(helpModal);
  });
}

// Mostrar el modal de información
if (conceptButton) {
  conceptButton.addEventListener('click', () => {
    showModal(conceptModal);
  });
}

// Cerrar los modales al hacer clic en el botón de cierre
closeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const modal = button.closest('.modal');
    hideModal(modal);
  });
});

// Cerrar el modal al hacer clic fuera del contenido
window.addEventListener('click', (event) => {
  if (event.target === helpModal) {
    hideModal(helpModal);
  } else if (event.target === conceptModal) {
    hideModal(conceptModal);
  }
});
