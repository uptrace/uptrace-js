import { EffectiveReplayConfig } from './types'

type RRWebModule = typeof import('rrweb')
type RecorderStop = () => void

export class SessionReplayRecorder {
  private _stopRecorder?: RecorderStop

  constructor(
    private readonly _effective: EffectiveReplayConfig,
    private readonly _onEvent: (event: unknown) => void,
  ) {}

  async start(): Promise<boolean> {
    if (this._stopRecorder) {
      return true
    }

    const rrweb = await import('rrweb')
    const stopRecorder = this.startRecording(rrweb)
    if (!stopRecorder) {
      return false
    }

    this._stopRecorder = stopRecorder
    rrweb.addCustomEvent('uptrace_url_change', {url: location.href})
    return true
  }

  stop(): void {
    if (!this._stopRecorder) {
      return
    }
    this._stopRecorder()
    this._stopRecorder = undefined
  }

  private startRecording(rrweb: RRWebModule): RecorderStop | undefined {
    return rrweb.record({
      emit: (event: unknown) => {
        this._onEvent(event)
      },
      checkoutEveryNms: 5 * 60 * 1000,
      checkoutEveryNth: 50,
      maskAllInputs: true,
      blockSelector: this._effective.blockSelectors.join(','),
      maskTextSelector: this._effective.maskSelectors.join(','),
      maskTextFn: maskReplayText,
      recordCanvas: false,
      inlineImages: false,
      collectFonts: false,
      plugins: [],
      recordCrossOriginIframes: false,
      keepIframeSrcFn: () => false,
      sampling: samplingOptions(this._effective),
    })
  }
}

function samplingOptions(effective: EffectiveReplayConfig): Record<string, unknown> {
  if (effective.sampling.mousemoveMs === false) {
    return {mousemove: false}
  }
  return {
    mousemove: effective.sampling.mousemoveMs,
    mousemoveCallback: effective.sampling.mousemoveCallbackMs,
  }
}

function maskReplayText(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, maskToken)
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, maskToken)
    .replace(/[^\s]/g, '*')
}

function maskToken(value: string): string {
  return value.replace(/[^\s]/g, '*')
}
