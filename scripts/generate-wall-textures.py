"""
Generates the seamless wall textures the 3D preview mounts the sign on:
public/textures/walls/{plaster,brick,wood,slats,metal}-{color,height}.jpg

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
    """Vertical oak-like cladding boards, ~140 mm wide, running the full tile
    height with two staggered butt joints each. Every board is cut from its own
    log: its own tone, ring spacing, cathedral arcs, pores and the odd knot."""
    r = rng(31)
    boards = 7
    w = N / boards
    yy, xx = np.mgrid[0:N, 0:N].astype(float)
    lx = np.mod(xx, w)
    col_i = np.floor(xx / w).astype(int)
    warp = fbm(32, 3.2, aniso=(1, 8)) - 0.5          # slow sideways wander of the grain
    wobble = fbm(35, 3.6, aniso=(1, 4)) - 0.5        # finer wiggle in the rings
    pores = fbm(33, 0.6, aniso=(1, 60))              # long thin pore streaks
    fleck = fbm(36, 1.0, aniso=(1, 12))
    blotch = fbm(34, 2.8)                            # uneven stain take-up
    light = np.array([0.74, 0.56, 0.37])
    late = np.array([0.47, 0.31, 0.17])
    out = np.zeros((N, N, 3))
    height = np.zeros((N, N))
    joint = np.zeros((N, N), bool)
    for k in range(boards):
        m = col_i == k
        tone = 0.86 + 0.24 * r.random()
        warm = np.array([1.0, 0.97 + 0.05 * r.random(), 0.9 + 0.12 * r.random()])
        spacing = (5.5 + 5.0 * r.random()) * MM
        centre = w * (0.2 + 0.6 * r.random())
        arcs = r.integers(1, 3)
        depth = (40 + 80 * r.random()) * MM
        phase = r.random() * 2 * np.pi
        phase2 = r.random() * 2 * np.pi
        # Two butt joints per board, staggered; the piece between them is cut
        # from elsewhere in the log, so its grain does not run on across.
        jy = r.random() * N
        jlen = N * (0.35 + 0.3 * r.random())
        piece = np.mod(yy - jy, N) < jlen
        shift = np.where(piece, (15 + 30 * r.random()) * MM, 0.0)
        # Distance from the heart of the log: flat-sawn boards show it as
        # rings running along the board that close into cathedral arcs.
        d = np.abs(lx - centre + warp * 60 * MM) \
            + depth * (0.5 + 0.35 * np.cos(2 * np.pi * arcs * yy / N + phase)
                     + 0.15 * np.cos(4 * np.pi * arcs * yy / N + phase2)) + shift \
            + wobble * 3 * MM
        ring = np.mod(d / spacing, 1.0)
        # Early wood fades slowly into a darker late-wood band, then a crisp
        # (but anti-aliased) edge to the next year.
        g = np.clip((ring - 0.45) / 0.45, 0, 1) ** 2.2 * np.clip((1.0 - ring) / 0.06, 0, 1)
        g = ndimage.gaussian_filter(g, 0.8, mode="wrap") * 0.8
        c = light * (1 - g[..., None]) + late * g[..., None]
        c = c * (0.93 + 0.12 * pores[..., None]) * (0.95 + 0.1 * fleck[..., None])
        c = c * (0.92 + 0.14 * blotch[..., None]) * tone * warm
        hgt = 0.75 - 0.12 * g - 0.06 * (1 - pores)
        # A knot or two on some boards (wrapped vertically so the tile repeats):
        # the rings swerve around it, and it is a darker, ringed brown eye.
        for _ in range(r.integers(0, 2)):
            ky = r.random() * N
            kx = w * (0.25 + 0.5 * r.random())
            dy = np.mod(yy - ky + N / 2, N) - N / 2
            kr = (6 + 6 * r.random()) * MM
            rad = np.sqrt((lx - kx) ** 2 + (dy / 1.6) ** 2)
            kn = np.clip(1 - rad / kr, 0, 1)
            halo = np.exp(-(rad / (kr * 2.5)) ** 2)
            kc = np.array([0.36, 0.22, 0.11])
            kring = 0.5 + 0.5 * np.cos(rad / (1.4 * MM))
            a = np.clip(kn * 2.5, 0, 1)[..., None]
            c = c * (1 - 0.25 * halo[..., None])
            c = c * (1 - a) + (kc * (0.8 + 0.3 * kring[..., None])) * a
            hgt = hgt - 0.08 * kn
        out[m] = c[m]
        height[m] = hgt[m]
        for j in (jy, jy + jlen):
            dj = np.abs(np.mod(yy - j + N / 2, N) - N / 2)
            joint |= m & (dj < 0.9 * MM)
            out[m & (dj < 3 * MM)] *= 0.9
    # Gap between boards: a dark shadow line and a soft rounded board edge.
    edge = np.minimum(lx, w - lx)
    gap = edge < 1.8 * MM
    bevel = np.clip(edge / (4 * MM), 0, 1)
    out *= (0.8 + 0.2 * bevel)[..., None]
    height *= 0.55 + 0.45 * bevel
    out[gap | joint] = [0.12, 0.08, 0.05]
    height[gap | joint] = 0.0
    out = out * shade(height, 0.5)[..., None]
    save("wood", out, height)


# ── Slats (drevené lamely): vertical walnut-brown slats on a black backing ──
# The interior look behind many shop signs: 14 slats per tile — 40 mm of wood,
# 30 mm of dark gap — running the full height. Each slat has its own tone and
# a long grain; the sides fall off into shadow so they read as standing out.
def slats():
    r = rng(51)
    count = 14
    p = N / count                     # 70 mm period
    slat = 40 * MM
    yy, xx = np.mgrid[0:N, 0:N].astype(float)
    lx = np.mod(xx, p)
    idx = np.floor(xx / p).astype(int)
    grain = fbm(52, 0.7, aniso=(1, 80))
    streak = fbm(53, 1.6, aniso=(1, 20))
    blotch = fbm(54, 2.8, aniso=(1, 3))
    base = np.array([0.50, 0.29, 0.17])          # walnut / teak brown
    out = np.zeros((N, N, 3))
    height = np.zeros((N, N))
    x0 = (p - slat) / 2
    on = (lx >= x0) & (lx < x0 + slat)
    u = np.clip((lx - x0) / slat, 0, 1)          # 0..1 across the slat face
    # Rounded-off look: lit face, sides turning away into shadow.
    profile = np.clip(np.sin(np.pi * u) ** 0.35, 0, 1)
    for k in range(count):
        m = idx == k
        tone = 0.85 + 0.25 * r.random()
        warm = np.array([1.0, 0.95 + 0.08 * r.random(), 0.9 + 0.15 * r.random()])
        c = base * tone * warm
        c = c * (0.82 + 0.3 * grain[..., None]) * (0.92 + 0.14 * streak[..., None]) * (0.94 + 0.1 * blotch[..., None])
        c = c * (0.55 + 0.45 * profile[..., None])
        out[m] = c[m]
    height = np.where(on, 0.55 + 0.45 * profile + 0.03 * grain, 0.0)
    # The backing between slats: almost black, a touch of warm light near the slats.
    near = np.clip(1 - np.minimum(np.abs(lx - x0), np.abs(lx - x0 - slat)) / (8 * MM), 0, 1)
    backing = np.array([0.05, 0.04, 0.035]) * (1 + 1.5 * near[..., None])
    out = np.where(on[..., None], out, backing)
    out = ndimage.gaussian_filter(out, (0.6, 0.6, 0), mode="wrap")
    save("slats", out, height)


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
    import sys
    only = set(sys.argv[1:])           # e.g. `slats` to make just that one
    for f in (plaster, brick, wood, slats, metal):
        if only and f.__name__ not in only:
            continue
        f()
        print("done", f.__name__)
