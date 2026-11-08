"""
Monta los efectos del partido y de la tienda con grabaciones CC0 de Freesound (spec 012, ronda 2). Sustituyen a los
sintetizados provisionales de `generar.py`. Procedencia de cada fichero: apps/web/public/sonidos/LICENCIA.

Uso: python tools/sonidos/grabaciones.py <carpeta con las descargas> [ruta de ffmpeg]   (necesita numpy y ffmpeg)

La carpeta tiene las vistas previas HQ de Freesound con su id como nombre (829455.mp3, 829452.mp3, 538422.mp3,
218318.mp3, 209578.mp3). Tratamiento común (el de las demás grabaciones): mono a 22.050 Hz, paso bajo a 6 kHz,
fundidos, pico a −3 dBFS y MP3 CBR a 48 kbps.
"""
import pathlib
import subprocess
import sys

import numpy as np

SR = 22050
ORIGEN = pathlib.Path(sys.argv[1])
FFMPEG = sys.argv[2] if len(sys.argv) > 2 else 'ffmpeg'
DESTINO = pathlib.Path(__file__).resolve().parents[2] / 'apps/web/public/sonidos'


def leer(freesound_id, desde, hasta):
    """Recorte [desde, hasta) en segundos, mono a 22.050 Hz y con paso bajo a 6 kHz."""
    pcm = subprocess.run(
        [FFMPEG, '-v', 'quiet', '-i', str(ORIGEN / f'{freesound_id}.mp3'), '-ss', str(desde), '-t', str(hasta - desde),
         '-af', 'lowpass=f=6000', '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(pcm, dtype=np.int16).astype(float) / 32768


def fundidos(x, entrada=0.01, salida=0.01):
    x = x.copy()
    a, b = int(SR * entrada), int(SR * salida)
    x[:a] *= np.linspace(0, 1, a)
    x[len(x) - b:] *= np.linspace(1, 0, b)
    return x


def mezclar(total, *pistas):
    out = np.zeros(int(SR * total))
    for inicio, senal, vol in pistas:
        i = int(SR * inicio)
        n = min(len(senal), len(out) - i)
        out[i:i + n] += vol * senal[:n]
    return out


def guardar(nombre, x):
    x = fundidos(x)
    x = x / np.max(np.abs(x)) * 10 ** (-3 / 20)
    subprocess.run(
        [FFMPEG, '-v', 'quiet', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-codec:a', 'libmp3lame', '-b:a', '48k',
         str(DESTINO / f'{nombre}.mp3')],
        input=(x * 32767).astype('<i2').tobytes(), check=True,
    )


# Silbato de árbitro (Rosa-Orenes256, #538422): un pitido corto; el largo del final, del silbato de gimnasio (#218318).
pitido = fundidos(leer(538422, 0, 0.42), salida=0.08)
pitido_corto = fundidos(leer(538422, 0, 0.3), salida=0.06)
pitido_largo = fundidos(leer(218318, 0, 1.1), salida=0.35)
guardar('pitidoInicio', pitido)
guardar('pitidoDescanso', mezclar(0.9, (0, pitido_corto, 1.0), (0.45, pitido_corto, 1.0)))
guardar('pitidoFinal', mezclar(2.0, (0, pitido_corto, 1.0), (0.4, pitido_corto, 1.0), (0.85, pitido_largo, 1.0)))

# Gol propio: la grada del Millerntor canta un gol (itmightgetloud, #829455).
guardar('golPropio', fundidos(leer(829455, 0.4, 4.6), entrada=0.15, salida=1.4))
# Gol del rival: lamento de la grada tras una ocasión fallada (#829452, primera toma).
guardar('golRival', fundidos(leer(829452, 0.5, 3.3), entrada=0.2, salida=1.0))

# Tarjetas: pitido y «oooh» de la grada (#829452, segunda toma); la roja, dos pitidos y un «oooh» más largo.
oooh = fundidos(leer(829452, 13.6, 15.4), entrada=0.15, salida=0.6)
oooh_largo = fundidos(leer(829452, 13.6, 16.2), entrada=0.15, salida=0.9)
guardar('tarjetaAmarilla', mezclar(2.1, (0, pitido, 0.9), (0.3, oooh, 0.8)))
guardar('tarjetaRoja', mezclar(3.2, (0, pitido_corto, 1.0), (0.4, pitido_corto, 1.0), (0.6, oooh_largo, 1.0)))

# Compra: caja registradora (Zott820, «Cash Register Purchase», #209578).
guardar('cajaRegistradora', fundidos(leer(209578, 0, 1.5), salida=0.4))
