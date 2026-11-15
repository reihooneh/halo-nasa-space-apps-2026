"""Make a looping test video of 'skin' whose colour pulses at a known heart rate, for Chrome's fake camera.
Usage: python3 make_pulse_video.py <bpm> <out.y4m>   (10 s loop; bpm must be a multiple of 6 so the loop is seamless)"""
import subprocess, sys
import numpy as np
bpm, out = float(sys.argv[1]), sys.argv[2]
W, H, FPS, SECS = 320, 240, 30, 10
rng = np.random.default_rng(int(bpm))
ff = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
yy, xx = np.mgrid[0:H, 0:W]
shade = 1 - 0.12 * ((xx - W / 2) / W) ** 2 - 0.1 * ((yy - H / 2) / H) ** 2      # uneven lighting across the face
base = np.array([200.0, 150.0, 120.0])                                             # skin tone
pbv = np.array([0.33, 0.77, 0.53])                                                 # blood-volume pulse colour signature
for i in range(FPS * SECS):
    t = i / FPS
    pulse = np.sin(2 * np.pi * bpm / 60 * t) + 0.3 * np.sin(4 * np.pi * bpm / 60 * t)
    light = 1 + 0.02 * np.sin(2 * np.pi * 0.1 * t) + 0.004 * np.sin(2 * np.pi * 0.7 * t)   # slow light drift + small sway
    frame = shade[..., None] * base * light * (1 + 0.0065 * pbv * pulse) + rng.normal(0, 3.0, (H, W, 3))
    ff.stdin.write(np.clip(frame, 0, 255).astype(np.uint8).tobytes())
ff.stdin.close(); ff.wait()
