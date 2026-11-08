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


# ---------- Spec 012: partido, draft, interfaz y tienda ----------
# Los sonidos de público (gol, murmullo, «oooh») y la caja registradora son síntesis provisionales: sustituir por
# grabaciones CC0 cuando las haya (docs/juego/sonidos.md).
azar = np.random.default_rng(12)


def filtrar(x, bajo, alto):
    """Paso banda ideal por FFT."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < bajo) | (f > alto)] = 0
    return np.fft.irfft(X, len(x))


def formantes(x, *picos):
    """Da a un ruido o un coro el color de una vocal: campanas de Gauss sobre el espectro en (frecuencia, ancho, peso)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= sum(p * np.exp(-0.5 * ((f - c) / a) ** 2) for c, a, p in picos)
    return np.fft.irfft(X, len(x))


def silbato(seg, f=2900, trino=26, vol=1.0):
    """Silbato de árbitro: tono agudo con el trino de la bolita (modulación rápida) y algo de soplido."""
    t = tiempo(seg)
    mod = 0.5 + 0.5 * np.sin(2 * np.pi * trino * t)
    fase = 2 * np.pi * np.cumsum(f * (1 + 0.012 * np.sin(2 * np.pi * trino * t))) / SR
    tono = np.sin(fase) + 0.25 * np.sin(2 * fase)
    soplido = filtrar(azar.standard_normal(len(t)), 2000, 5000) * 0.25
    env = np.minimum(1, t / 0.015) * np.minimum(1, (seg - t) / 0.03)
    return vol * (tono * (0.6 + 0.4 * mod) + soplido) * env


def coro(seg, f0, f1, voces=36, vocal=((550, 120, 1.0), (900, 150, 0.6), (2400, 300, 0.15))):
    """Muchas voces desafinadas que van de f0 a f1 Hz con la vocal dada: el público."""
    t = tiempo(seg)
    out = np.zeros(len(t))
    for _ in range(voces):
        d = azar.uniform(0.85, 1.18)
        vib = 1 + 0.02 * np.sin(2 * np.pi * azar.uniform(4, 7) * t + azar.uniform(0, 6))
        f = (f0 + (f1 - f0) * t / seg) * d * vib
        fase = 2 * np.pi * np.cumsum(f) / SR + azar.uniform(0, 6)
        out += sum(np.sin(k * fase) / k for k in range(1, 8)) * np.minimum(1, t / azar.uniform(0.05, 0.4))
    return formantes(out, *vocal)


def rumor(seg, bajo=200, alto=2500):
    """Ruido de grada: banda de ruido con ondulación lenta."""
    t = tiempo(seg)
    return filtrar(azar.standard_normal(len(t)), bajo, alto) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.7 * t))


def norm(x):
    return x / np.max(np.abs(x))


# Pitidos: inicio de cada parte (uno corto), descanso (dos) y final (tres, el último largo).
guardar('pitidoInicio', silbato(0.45))
guardar('pitidoDescanso', mezclar(1.0, (0, silbato(0.32), 1.0), (0.48, silbato(0.4), 1.0)))
guardar('pitidoFinal', mezclar(2.0, (0, silbato(0.25), 1.0), (0.38, silbato(0.25), 1.0), (0.78, silbato(1.1), 1.0)))

# Gol propio: el público estalla y canta «¡gooool!» (crece, se sostiene y se apaga en ≈ 3 s).
t = tiempo(3.2)
canto = norm(coro(3.2, 230, 200, vocal=((500, 110, 1.0), (850, 140, 0.7), (2500, 300, 0.12))))
grada = norm(rumor(3.2, 250, 4000))
env = np.minimum(1, t / 0.25) * np.exp(-np.maximum(0, t - 2.0) / 0.45)
guardar('golPropio', (0.75 * canto + 0.55 * grada) * env)

# Gol del rival: murmullo grave y apagado.
t = tiempo(2.2)
guardar('golRival', norm(rumor(2.2, 120, 900)) * np.minimum(1, t / 0.4) * np.exp(-np.maximum(0, t - 1.0) / 0.5))


def oooh(seg, f0, f1):
    """El «oooh» del público: coro con vocal o cerrada que baja de tono."""
    t = tiempo(seg)
    v = norm(coro(seg, f0, f1, voces=28, vocal=((420, 90, 1.0), (750, 120, 0.45), (2300, 250, 0.06))))
    return v * np.minimum(1, t / 0.18) * np.exp(-np.maximum(0, t - seg * 0.45) / (seg * 0.25))


# Tarjetas: silbato y «oooh»; la roja, con dos pitidos fuertes y un «oooh» más largo y más alto.
guardar('tarjetaAmarilla', mezclar(1.8, (0, silbato(0.35), 0.8), (0.3, oooh(1.4, 260, 200), 0.6)))
guardar('tarjetaRoja', mezclar(2.4, (0, silbato(0.3), 1.0), (0.42, silbato(0.5), 1.0), (0.55, oooh(1.8, 300, 190), 0.9)))

# Confirmar la elección en el draft: un golpe suave y grave con un acorde corto (distinto de seleccionCarta).
madera = ((1, 1.0), (2, 0.3), (3, 0.08))
guardar('confirmarEleccion', mezclar(0.45, (0, nota(392.0, 0.4, caida=0.09, armonicos=madera), 0.7), (0, nota(587.33, 0.4, caida=0.1, armonicos=madera), 0.45)))

# Latido de los últimos 5 s del turno: «pum-pum» que se acelera (70 → 150 por minuto) y crece.
latidos = []
p = 0.0
while p < 4.9:
    avance = p / 5
    ritmo = 70 + 80 * avance**1.4
    vol = 0.35 + 0.65 * avance
    golpe_grave = np.sin(2 * np.pi * 52 * tiempo(0.18)) * envolvente(tiempo(0.18), 0.004, 0.05)
    latidos += [(p, golpe_grave, vol), (p + 0.16 * 70 / ritmo, golpe_grave, 0.7 * vol)]
    p += 60 / ritmo
guardar('latido', mezclar(5.0, *latidos))

# Clic del botón principal: un «tic» corto, suave y grave.
guardar('clicPrincipal', nota(660.0, 0.05, ataque=0.002, caida=0.01, armonicos=((1, 1.0), (2, 0.2))))

# Caja registradora: traqueteo metálico del cajón y dos campanillas («¡clin-clin!»).
t = tiempo(0.25)
traqueteo = filtrar(azar.standard_normal(len(t)), 1500, 7000) * np.exp(-t / 0.05) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 38 * t)))
campanilla = ((1, 1.0), (2.76, 0.35), (5.4, 0.12))
guardar('cajaRegistradora', mezclar(1.2, (0, traqueteo, 0.5), (0.12, nota(2093.0, 1.0, caida=0.3, armonicos=campanilla), 0.8), (0.24, nota(2637.0, 1.0, caida=0.35, armonicos=campanilla), 0.8)))
