let audioContext;
let source;
let analyser;
let stream;
let isStreaming = false;
let canvasContext;
let spectrogramData = [];
const speedFactor = 1.1; // Factor de velocidad para el desplazamiento

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

    const canvas = document.getElementById('spectrogram');
    canvasContext = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const lowerFrequencyLimit = 149; // Frecuencia mínima en Hz
    const upperFrequencyLimit = 20000; // Frecuencia máxima en Hz

    // Colores según el nivel de volumen
    const colors = {
        low: [0, 102, 204],      // Azul claro
        medium: [255, 255, 0],   // Amarillo
        high: [255, 0, 0],       // Rojo
        threshold: [255, 165, 0] // Naranja
    };

    const threshold = 170; // Umbral de intensidad del sonido

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

                    // Definir colores según intensidad
                    if (dataArray[i] < 100) {
                        column[y * 4] = colors.low[0];      // Azul
                        column[y * 4 + 1] = colors.low[1];  // Verde
                        column[y * 4 + 2] = colors.low[2];  // Cian
                    } else if (dataArray[i] < threshold) {
                        column[y * 4] = colors.medium[0];   // Amarillo
                        column[y * 4 + 1] = colors.medium[1];
                        column[y * 4 + 2] = colors.medium[2];
                    } else {
                        column[y * 4] = colors.high[0];      // Rojo
                        column[y * 4 + 1] = colors.high[1];
                        column[y * 4 + 2] = colors.high[2];
                    }

                    // Añadir opacidad
                    column[y * 4 + 3] = Math.min(255, dataArray[i] * 2);
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

function toggleMicrophone() {
    const buttonIcon = document.getElementById('toggleButton').querySelector('img');

    if (isStreaming) {
        stream.getTracks().forEach(track => track.stop());
        isStreaming = false;
        buttonIcon.src = 'play.png'; // Cambia al ícono de micrófono desactivado
        buttonIcon.alt = 'Activar Micrófono';
    } else {
        setupAudio().then(() => {
            isStreaming = true;
            buttonIcon.src = 'microphone-off.webp'; // Cambia al ícono de micrófono activado
            buttonIcon.alt = 'Desactivar Micrófono';
            startSpectrogram();
        });
    }
}

document.getElementById('toggleButton').addEventListener('click', toggleMicrophone);

// Funcionalidad de los modales
document.addEventListener('DOMContentLoaded', function() {
    const helpModal = document.getElementById('helpModal');
    const conceptModal = document.getElementById('conceptModal');
    const helpButton = document.getElementById('helpButton');
    const conceptButton = document.getElementById('conceptButton');
    const closeButtons = document.querySelectorAll('.close');

    helpButton.addEventListener('click', function() {
        helpModal.style.display = 'block';
    });

    conceptButton.addEventListener('click', function() {
        conceptModal.style.display = 'block';
    });

    closeButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            helpModal.style.display = 'none';
            conceptModal.style.display = 'none';
        });
    });

    window.addEventListener('click', function(event) {
        if (event.target == helpModal) {
            helpModal.style.display = 'none';
        } else if (event.target == conceptModal) {
            conceptModal.style.display = 'none';
        }
    });
});
