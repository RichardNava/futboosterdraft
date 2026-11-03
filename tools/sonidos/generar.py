"""
Genera los efectos sintetizados de apps/web/public/sonidos (WAV mono de 16 bits a 22.050 Hz, pico a -3 dBFS).
Uso: python tools/sonidos/generar.py   (necesita numpy). Son obra propia, CC0 como el resto de la carpeta.
"""
import pathlib
import wave

import numpy as np

SR = 22050
DESTINO = pathlib.Path(__file__).resolve().parents[2] / 'apps/web/public/sonidos'


def tiempo(seg):
    return np.arange(int(SR * seg)) / SR


def envolvente(t, ataque, caida):
    """Ataque lineal y caída exponencial (constante de tiempo `caida`)."""
    return np.minimum(1, t / ataque) * np.exp(-t / caida)


def nota(f, seg, ataque=0.004, caida=0.1, armonicos=((1, 1.0),)):
    t = tiempo(seg)
    onda = sum(a * np.sin(2 * np.pi * f * k * t) for k, a in armonicos)
    return onda * envolvente(t, ataque, caida)


def mezclar(total, *pistas):
    out = np.zeros(int(SR * total))
    for inicio, senal, vol in pistas:
        i = int(SR * inicio)
        n = min(len(senal), len(out) - i)
        out[i : i + n] += vol * senal[:n]
    return out


def guardar(nombre, x):
    fundido = min(len(x), int(SR * 0.01))
    x[-fundido:] *= np.linspace(1, 0, fundido)
    x = x / np.max(np.abs(x)) * 10 ** (-3 / 20)
    with wave.open(str(DESTINO / f'{nombre}.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())


# Pasar el cursor por una carta del draft: un «tip» de madera muy corto y suave.
guardar('hoverCarta', nota(1046.5, 0.09, ataque=0.003, caida=0.018, armonicos=((1, 1.0), (2, 0.15))))

# Elegir una carta del draft: dos notas suaves ascendentes (sol5 → do6), como una campanita.
campana = ((1, 1.0), (2, 0.25), (3, 0.06))
guardar('seleccionCarta', mezclar(0.32, (0, nota(783.99, 0.3, caida=0.07, armonicos=campana), 0.8), (0.07, nota(1046.5, 0.25, caida=0.08, armonicos=campana), 1.0)))

# Revelación de una carta GOAT: golpe grave, arpegio brillante (do mayor) y acorde con brillo que se apaga.
golpe = np.sin(2 * np.pi * 55 * tiempo(0.6) * (1 + 0.6 * np.exp(-tiempo(0.6) / 0.05))) * envolvente(tiempo(0.6), 0.005, 0.18)
arpegio = [(0.08 + 0.07 * i, nota(f, 0.9, caida=0.25, armonicos=campana), 0.45) for i, f in enumerate((523.25, 659.25, 783.99, 1046.5, 1318.5))]
t = tiempo(1.4)
brillo = sum(np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.003 * t) for f in (1046.5, 1318.5, 1568.0, 2093.0))
brillo *= np.minimum(1, t / 0.15) * np.exp(-t / 0.45) * (0.75 + 0.25 * np.sin(2 * np.pi * 9 * t))
guardar('goat', mezclar(1.9, (0, golpe, 0.9), *arpegio, (0.45, brillo, 0.12)))

# Cálculo de un duelo: tics rápidos durante el recuento (600 ms) y, después, la ruleta del estado de forma (800 ms)
# con los mismos 12 saltos que pinta la pantalla (`valorRuleta`: salto k en p = 1 − (1 − k/12)^(1/3)), cada vez más
# despacio y más bajos, y un tic final más grave al pararse. Sin estado de forma, la pantalla lo corta a los 600 ms.
def tic(f=2600, vol=1.0):
    t = tiempo(0.03)
    ruido = np.random.default_rng(int(f)).standard_normal(len(t)) * np.exp(-t / 0.0015)
    return vol * (np.sin(2 * np.pi * f * t) * envolvente(t, 0.0005, 0.004) + 0.35 * ruido)


tics = [(i * 0.04, tic(), 0.55) for i in range(15)]
tics += [(0.6 + 0.8 * (1 - (1 - k / 12) ** (1 / 3)), tic(), 0.75 - 0.03 * k) for k in range(1, 12)]
tics.append((1.4, tic(1700), 0.9))
guardar('calculoDuelo', mezclar(1.5, *tics))
