import { describe, it, expect } from 'vitest'
import { rdNaarWgs84, isRdCoordinaat } from './rd'

describe('rdNaarWgs84', () => {
  it('geeft de RD-oorsprong (Amersfoort) terug binnen 0,00001 graad', () => {
    const { lat, lng } = rdNaarWgs84(155000, 463000)
    expect(lat).toBeCloseTo(52.155172, 5)
    expect(lng).toBeCloseTo(5.387203, 5)
  })

  // Tweede bekend punt, ver van de oorsprong: Coolsingel/centrum Rotterdam,
  // RD (93425, 439130) — publiek voorbeeldpunt uit een RD→WGS84-converter
  // (glenndehaan/rd-to-wgs84), WGS84-uitkomst geverifieerd tegen het bekende
  // centrum van Rotterdam (± 51,92 N / 4,48 O).
  it('zet een tweede bekend punt (centrum Rotterdam) correct om', () => {
    const { lat, lng } = rdNaarWgs84(93425, 439130)
    expect(lat).toBeCloseTo(51.9372, 3)
    expect(lng).toBeCloseTo(4.4918, 3)
  })
})

describe('isRdCoordinaat', () => {
  it('herkent een coördinaat binnen het NL RD-bereik', () => {
    expect(isRdCoordinaat(155000, 463000)).toBe(true)
    expect(isRdCoordinaat(0, 289000)).toBe(true)
    expect(isRdCoordinaat(300000, 629000)).toBe(true)
  })

  it('verwerpt coördinaten buiten het RD-bereik (bv. WGS84 lat/lng)', () => {
    expect(isRdCoordinaat(52.15, 5.38)).toBe(false)
    expect(isRdCoordinaat(-1, 463000)).toBe(false)
    expect(isRdCoordinaat(155000, 700000)).toBe(false)
  })
})
