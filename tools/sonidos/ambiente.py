"""
Ambiente de público de la 2D (spec 012, ronda 4) con grabaciones CC0 de Freesound; sustituye al sintetizado de la
ronda 3. Procedencia de cada fichero: apps/web/public/sonidos/LICENCIA.

Uso: python tools/sonidos/ambiente.py <carpeta con las descargas> [ruta de ffmpeg]   (necesita numpy y ffmpeg)

La carpeta tiene las vistas previas HQ de Freesound con su id como nombre (829454, 500250, 588617, 733614, 157746 y
557276, en .mp3). Tratamiento: mono a 22.050 Hz, paso bajo a 8 kHz, fundidos, sonoridad igualada por RMS (el fondo
a −24 dBFS y los momentos a −20) con el pico por debajo de −1 dBFS, y MP3 CBR a 48 kbps.
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
    pcm = subprocess.run(
        [FFMPEG, '-v', 'quiet', '-i', str(ORIGEN / f'{freesound_id}.mp3'), '-ss', str(desde), '-t', str(hasta - desde),
         '-af', 'lowpass=f=8000', '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(pcm, dtype=np.int16).astype(float) / 32768


def fundidos(x, entrada, salida):
    x = x.copy()
    a, b = int(SR * entrada), int(SR * salida)
    x[:a] *= np.linspace(0, 1, a)
    x[len(x) - b:] *= np.linspace(1, 0, b)
    return x


def bucle(x, cruce):
    """Bucle sin costura: la cola (los últimos `cruce` s) se funde con el principio."""
    f = int(SR * cruce)
    cuerpo, cola = x[:-f].copy(), x[-f:]
    rampa = np.linspace(0, 1, f)
    cuerpo[:f] = cuerpo[:f] * np.sqrt(rampa) + cola * np.sqrt(1 - rampa)
    return cuerpo


def guardar(nombre, x, rms_db):
    x = x * 10 ** (rms_db / 20) / np.sqrt(np.mean(x ** 2))
    pico = np.max(np.abs(x))
    if pico > 10 ** (-1 / 20):
        x = x / pico * 10 ** (-1 / 20)
    subprocess.run(
        [FFMPEG, '-v', 'quiet', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-codec:a', 'libmp3lame', '-b:a', '48k',
         str(DESTINO / f'{nombre}.mp3')],
        input=(x * 32767).astype('<i2').tobytes(), check=True,
    )
    print(f'{nombre}: {len(x) / SR:.1f} s')


# Fondo: rumor de la grada del Millerntor (itmightgetloud, #829454), 44 s en bucle.
guardar('ambienteGrada', bucle(leer(829454, 0, 46), 2), -24)
# Bombo y cántico de una hinchada chilena (felix.blume, #500250): dos tomas.
guardar('ambienteBombo1', fundidos(leer(500250, 150, 166), 1.2, 2.5), -20)
guardar('ambienteBombo2', fundidos(leer(500250, 32, 46), 1.2, 2.5), -20)
# Cánticos: aficionados en Brighton (Urkki69, #588617) y un estadio cantando (AxelTheCocker02, #733614).
guardar('ambienteCantico1', fundidos(leer(588617, 0, 13.4), 0.8, 2.5), -20)
guardar('ambienteCantico2', fundidos(leer(733614, 0, 18), 1.0, 2.5), -20)
# Vuvuzelas (Audioflow, #157746; nomerodin1, #557276).
guardar('ambienteVuvuzela1', fundidos(leer(157746, 0, 4.4), 0.05, 0.6), -20)
guardar('ambienteVuvuzela2', fundidos(leer(557276, 0, 1.5), 0.03, 0.4), -20)
