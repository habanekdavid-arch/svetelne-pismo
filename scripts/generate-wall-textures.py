"""
Generates the seamless wall textures the 3D preview mounts the sign on:
public/textures/walls/{plaster,brick,wood,metal}-{color,height}.jpg

Every tile covers 980 x 980 mm of wall (TILE_UNITS in
components/three/wallTexture.ts = 14 brick courses of 70 mm), at 1024 px, so
the texture keeps true scale behind a sign of any size. All noise is built in
the frequency domain, which makes it periodic — the tiles repeat without seams.

Run:  python3 scripts/generate-wall-textures.py   (needs numpy, pillow, scipy)
"""
import numpy as np
from PIL import Image
from scipy import ndimage

N = 1024
OUT = "public/textures/walls"
MM = N / 980.0  # pixels per millimetre


def rng(seed):
    return np.random.default_rng(seed)


def fbm(seed, beta=2.0, aniso=(1.0, 1.0), lo=1.0):
    """Periodic 1/f^beta noise in [0,1]; aniso = (sx, sy) stretches features
    that many times longer along x / y."""
    r = rng(seed)
    white = r.standard_normal((N, N))
    fy = np.fft.fftfreq(N)[:, None] * N * aniso[1]
    fx = np.fft.fftfreq(N)[None, :] * N * aniso[0]
    f = np.sqrt(fx * fx + fy * fy)
    f[0, 0] = 1
    amp = 1.0 / np.maximum(f, lo) ** (beta / 2)
    amp[0, 0] = 0
    out = np.real(np.fft.ifft2(np.fft.fft2(white) * amp))
    out -= out.min()
    out /= out.max()
    return out


def save(name, rgb=None, height=None):
    if rgb is not None:
        Image.fromarray(np.clip(rgb * 255, 0, 255).astype(np.uint8), "RGB").save(
            f"{OUT}/{name}-color.jpg", quality=86, optimize=True, progressive=True)
    if height is not None:
        h = (height - height.min()) / (np.ptp(height) + 1e-9)
        Image.fromarray((h * 255).astype(np.uint8), "L").resize((512, 512), Image.LANCZOS).save(
            f"{OUT}/{name}-height.jpg", quality=90, optimize=True)


def shade(height, strength):
    """Bake a soft top-left light into the albedo so relief reads even unlit."""
    gy, gx = np.gradient(height)
    return np.clip(1 + strength * (-gx - gy), 0.7, 1.3)


# ── Plaster (omietka): near-white, tinted in the scene by the chosen colour ──
def plaster():
    big = fbm(11, 2.6)
    mid = fbm(12, 1.6)
    grain = fbm(13, 0.4)
    height = 0.45 * big + 0.35 * mid + 0.2 * grain
    # sand granules: sparse bumps
    r = rng(14)
    pts = np.zeros((N, N))
    idx = r.integers(0, N, size=(26000, 2))
    pts[idx[:, 0], idx[:, 1]] = r.random(26000)
    pts = ndimage.gaussian_filter(pts, 0.9, mode="wrap")
    height += 0.7 * pts / pts.max()
    height = ndimage.gaussian_filter(height, 0.6, mode="wrap")
    tone = 0.93 + 0.04 * (big - 0.5) + 0.025 * (mid - 0.5)
    tone = tone * shade(height, 0.9)
    rgb = np.stack([tone, tone * 0.995, tone * 0.985], -1)
    save("plaster", rgb, height)


# ── Brick (tehla): 14 courses of 70 mm, 245 mm bricks, running bond ─────────
def brick():
    r = rng(21)
    rows, per = 14, 4
    h, w = N / rows, N / per
    joint = 10 * MM
    yy, xx = np.mgrid[0:N, 0:N].astype(float)
    warp_x = (fbm(22, 2.4) - 0.5) * 5
    warp_y = (fbm(23, 2.4) - 0.5) * 5
    X, Y = xx + warp_x, yy + warp_y
    row = np.floor(Y / h) % rows
    xo = X + np.where(row % 2 == 1, w / 2, 0)
    col = np.floor(xo / w) % per
    ly = np.mod(Y, h)
    lx = np.mod(xo, w)
    edge = np.minimum(np.minimum(ly, h - ly), np.minimum(lx, w - lx))
    mortar = edge < joint / 2
    brick_id = (row * per + col).astype(int)
    palette = np.array([[0.56, 0.27, 0.20], [0.62, 0.31, 0.22], [0.50, 0.24, 0.19],
                        [0.66, 0.36, 0.26], [0.45, 0.22, 0.18], [0.58, 0.33, 0.25]])
    choice = r.integers(0, len(palette), rows * per)
    jitter = 0.9 + 0.2 * r.random(rows * per)
    base = palette[choice][brick_id] * jitter[brick_id][..., None]
    clay = fbm(24, 1.2)
    spots = fbm(25, 0.3)
    base = base * (0.85 + 0.25 * clay[..., None]) * (0.93 + 0.1 * spots[..., None])
    soot = fbm(26, 2.8)
    base *= (0.88 + 0.16 * soot)[..., None]
    mort = 0.72 + 0.1 * fbm(27, 0.8)
    mortar_rgb = np.stack([mort, mort * 0.97, mort * 0.92], -1)
    bevel = np.clip(edge / (joint * 1.1), 0, 1)
    height = np.where(mortar, 0.15 * fbm(28, 0.8), 0.55 + 0.45 * np.sqrt(bevel)) + 0.06 * clay
    rgb = np.where(mortar[..., None], mortar_rgb, base)
    rgb = rgb * shade(height, 1.3)[..., None]
    save("brick", rgb, height)


# ── Wood (drevo): uniform horizontal boards, 140 mm, running the full width ─
# One even oak tone for every board, a quiet grain along them and a clean
# shadow gap between boards — no end joints, no board-to-board colour jumps.
def wood():
    r = rng(31)
    rows = 7
    h = N / rows
    yy, xx = np.mgrid[0:N, 0:N].astype(float)
    ly = np.mod(yy, h)
    row = np.floor(yy / h).astype(int)
    warp = fbm(32, 3.0, aniso=(10, 1)) - 0.5
    streak = fbm(33, 1.2, aniso=(40, 1))
    base = np.array([0.66, 0.49, 0.32])
    dark = np.array([0.55, 0.39, 0.24])
    out = np.zeros((N, N, 3))
    height = np.zeros((N, N))
    for k in range(rows):
        m = row == k
        phase = r.random() * 100
        u = (ly + warp * 40 + phase) / (16 * MM)
        grain = (0.5 + 0.5 * np.sin(2 * np.pi * u)) ** 4
        col = base * (1 - 0.35 * grain[..., None]) + dark * 0.35 * grain[..., None]
        col = col * (0.95 + 0.07 * streak)[..., None]
        out[m] = col[m]
        height[m] = (0.7 + 0.08 * grain + 0.1 * streak)[m]
    # Gap between boards: a thin dark shadow, and a soft rounded board edge.
    edge = np.minimum(ly, h - ly)
    gap = edge < 1.6 * MM
    bevel = np.clip(edge / (5 * MM), 0, 1)
    out *= (0.82 + 0.18 * bevel)[..., None]
    height *= 0.6 + 0.4 * bevel
    out[gap] = [0.16, 0.11, 0.07]
    height[gap] = 0.0
    out = out * shade(height, 0.6)[..., None]
    save("wood", out, height)


# ── Metal (kov): brushed anthracite façade panels, 490 mm, recessed seams ──
def metal():
    brush = fbm(41, 1.0, aniso=(1, 60))
    cloud = fbm(42, 2.6)
    tone = 0.46 + 0.1 * brush + 0.08 * (cloud - 0.5)
    yy, xx = np.mgrid[0:N, 0:N].astype(float)
    p = N / 2
    lx, ly = np.mod(xx, p), np.mod(yy, p)
    seam = (np.minimum(lx, p - lx) < 2.5 * MM) | (np.minimum(ly, p - ly) < 2.5 * MM)
    height = 0.6 + 0.05 * brush
    height = np.where(seam, 0.0, height)
    tone = np.where(seam, 0.12, tone)
    # fixing rivets near panel corners
    for cx in (0, p):
        for cy in (0, p):
            for ox in (22 * MM, p - 22 * MM):
                for oy in (22 * MM, p - 22 * MM):
                    d = np.hypot(((xx - cx - ox + N / 2) % N) - N / 2, ((yy - cy - oy + N / 2) % N) - N / 2)
                    m = d < 4 * MM
                    tone = np.where(m, 0.66 - d / (4 * MM) * 0.2, tone)
                    height = np.where(m, 0.8, height)
    tone = tone * shade(height, 0.8)
    rgb = np.stack([tone * 0.97, tone, tone * 1.03], -1)
    save("metal", rgb, height)


if __name__ == "__main__":
    for f in (plaster, brick, wood, metal):
        f()
        print("done", f.__name__)
