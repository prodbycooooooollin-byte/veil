// The backdrop: slow liquid chrome in bone-white light on black, drawn by one fragment shader at reduced
// resolution. It is the app's one ambient motion, and it stops when the window is hidden or motion is reduced.
import { useEffect, useRef } from 'react'

const FRAG = `
precision highp float;
uniform vec2 r; uniform float t; uniform vec2 m; uniform vec3 tint;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float v=0., a=.5; mat2 R=mat2(.8,.6,-.6,.8); for(int i=0;i<5;i++){ v+=a*n(p); p=R*p*2.02; a*=.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / r; vec2 p = (gl_FragCoord.xy - .5*r) / r.y;
  p += (m - .5) * .08;
  float T = t * .035;
  vec2 q = vec2(fbm(p*1.3 + T), fbm(p*1.3 - T + 4.1));
  vec2 w = vec2(fbm(p*1.1 + 2.2*q + vec2(1.7, 9.2) + T*1.4), fbm(p*1.1 + 2.2*q + vec2(8.3, 2.8) - T));
  float f = fbm(p*1.2 + 2.6*w);
  float band = abs(sin(f * 9.0 + T * 3.0));
  float ridge = pow(1. - band, 14.) * smoothstep(.25, .8, f);
  float glow = smoothstep(.45, 1.05, f) * .35;
  vec3 bone = vec3(.93, .89, .83);
  vec3 col = bone * (ridge * .9 + glow * .55);
  col = mix(col, col * tint * 1.6, .35);
  float vig = smoothstep(1.25, .25, length((uv - vec2(.62, .48)) * vec2(1.1, 1.3)));
  col *= vig;
  gl_FragColor = vec4(col, 1.);
}`

export function Liquid({ tint = '#d4a855', dim = 1 }: { tint?: string; dim?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const tintRef = useRef(tint)
  tintRef.current = tint

  useEffect(() => {
    const c = ref.current!
    const gl = c.getContext('webgl', { antialias: false, premultipliedAlpha: false })
    if (!gl) return
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s }
    const prog = gl.createProgram()!
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }'))
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog); gl.useProgram(prog)
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const uR = gl.getUniformLocation(prog, 'r'), uT = gl.getUniformLocation(prog, 't'), uM = gl.getUniformLocation(prog, 'm'), uTint = gl.getUniformLocation(prog, 'tint')
    const scale = 0.5
    const resize = () => { c.width = Math.ceil(innerWidth * scale); c.height = Math.ceil(innerHeight * scale); gl.viewport(0, 0, c.width, c.height) }
    resize(); addEventListener('resize', resize)
    const mouse = [0.5, 0.5], eased = [0.5, 0.5]
    const onMove = (e: PointerEvent) => { mouse[0] = e.clientX / innerWidth; mouse[1] = 1 - e.clientY / innerHeight }
    addEventListener('pointermove', onMove)
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0, t0 = performance.now()
    const hex = (s: string) => { const v = parseInt(s.replace('#', ''), 16); return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255] }
    const frame = (now: number) => {
      eased[0] += (mouse[0] - eased[0]) * 0.04; eased[1] += (mouse[1] - eased[1]) * 0.04
      gl.uniform2f(uR, c.width, c.height)
      gl.uniform1f(uT, reduce ? 40 : (now - t0) / 1000 + 40)
      gl.uniform2f(uM, eased[0], eased[1])
      const [r, g, b] = tintRef.current.startsWith('#') ? hex(tintRef.current) : [0.83, 0.66, 0.33]
      gl.uniform3f(uTint, r, g, b)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (!reduce) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    const vis = () => { cancelAnimationFrame(raf); if (!document.hidden && !reduce) raf = requestAnimationFrame(frame) }
    document.addEventListener('visibilitychange', vis)
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); removeEventListener('pointermove', onMove); document.removeEventListener('visibilitychange', vis) }
  }, [])

  return <canvas ref={ref} className="backdrop" style={{ width: '100%', height: '100%', opacity: 0.85 * dim, transition: 'opacity 1.2s' }} aria-hidden />
}
