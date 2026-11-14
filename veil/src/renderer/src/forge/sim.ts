// A small fight running on the preview target so bars, damage numbers and the hit marker have something to show.
export type Hit = { id: number; dmg: number; head: boolean; t: number }

export class Sim {
  max = 2340
  hp = 2340
  lag = 2340
  stamina = 3
  debuffs = 1
  total = 0
  ult = 0.4
  lastHit = 0
  lagHold = 0
  hits: Hit[] = []
  private nextHit = 1.2
  private nextStamina = 3
  private nextDebuff = 5
  private regen = false
  private id = 0
  onHit?: (h: Hit) => void

  step(dt: number, now: number, fighting: boolean) {
    if (fighting && !this.regen) {
      this.nextHit -= dt
      if (this.nextHit <= 0) {
        const burst = Math.random() < 0.35
        this.nextHit = burst ? 0.12 : 0.55 + Math.random() * 0.9
        const head = Math.random() < 0.22
        const dmg = Math.round((head ? 1.6 : 1) * (38 + Math.random() * 70))
        this.hp = Math.max(0, this.hp - dmg)
        this.lagHold = 0.45
        if (now - this.lastHit > 1.6) this.total = 0
        this.total += dmg
        this.lastHit = now
        const h = { id: ++this.id, dmg, head, t: now }
        this.hits = [...this.hits.filter((x) => now - x.t < 1.4), h]
        this.onHit?.(h)
        if (this.hp < this.max * 0.22) this.regen = true
      }
    }
    if (this.regen || !fighting) {
      this.hp = Math.min(this.max, this.hp + dt * (this.regen ? 900 : 300))
      if (this.hp >= this.max) this.regen = false
    }
    this.lagHold -= dt
    if (this.lagHold <= 0) this.lag += (this.hp - this.lag) * Math.min(1, dt * 6)
    if (this.lag < this.hp) this.lag = this.hp
    this.nextStamina -= dt
    if (this.nextStamina <= 0) {
      this.nextStamina = 2.4
      this.stamina = Math.random() < 0.4 && this.stamina > 0 ? this.stamina - 1 : Math.min(3, this.stamina + 1)
    }
    // ult charges over ~12 s, stays ready for a while, then is "used"
    this.ult = this.ult >= 1 ? (Math.random() < dt * 0.25 ? 0 : 1) : Math.min(1, this.ult + dt / 12)
    this.nextDebuff -= dt
    if (this.nextDebuff <= 0) { this.nextDebuff = 4 + Math.random() * 4; this.debuffs = Math.floor(Math.random() * 3) }
  }
}
