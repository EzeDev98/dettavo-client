// Preview playback across timeline clips (guide 8.7, Build Plan 15). Two media elements: the active one plays the
// current clip while the other has the next clip loaded, paused at its first kept moment. One requestAnimationFrame
// loop reads the active element's time, skips cuts when asked, hands over at each clip join and tells its listeners
// the timeline time. Plain DOM, no React; usePlayback wires it up. Preview jumps can be a frame late; export is exact.

// A cut starting this close ahead is skipped now rather than a frame late (8.7).
const SKIP_LEAD_MS = 30;
// The active clip counts as finished this close to its last kept moment.
const END_SLACK_MS = 15;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export class PlaybackEngine {
  // proxyUrl(clipId): where a clip's playback file is. onView(changes): what the screen shows changed
  // ({ playing, clipId, width, height, skipCuts }).
  constructor({ proxyUrl, onView }) {
    this.proxyUrl = proxyUrl;
    this.onView = onView;
    this.slots = [{ element: null, clipId: null, pendingMs: null }, { element: null, clipId: null, pendingMs: null }];
    this.active = 0;
    this.spanIndex = -1;
    this.timeMs = 0;
    this.playing = false;
    this.skipCuts = true;
    this.frame = null;
    this.listeners = new Set();
    this.spans = [];
    this.clips = new Map();
    this.cutsByClip = new Map();
    this.keepsByClip = new Map();
  }

  // ---- Wiring

  // Called by the video elements' refs, with null when one goes away. Both play the clip's proxy as a CORS request,
  // so seeking works across origins (8.7).
  attach(index, element) {
    const slot = this.slots[index];
    if (slot.element === element) return;
    slot.element = element;
    slot.clipId = null;
    slot.pendingMs = null;
    if (!element) return;
    element.crossOrigin = 'anonymous';
    element.preload = 'auto';
    element.playsInline = true;
    element.dataset.active = String(index === this.active);
    element.addEventListener('loadedmetadata', () => {
      if (slot.pendingMs !== null) {
        element.currentTime = slot.pendingMs / 1000;
        slot.pendingMs = null;
      }
      if (this.slots[this.active] === slot) {
        this.reportClip();
        if (this.playing) element.play().catch(() => {});
      }
    });
    // A new element (the stage appeared, or came back): put both clips in place again.
    if (this.spans.length) this.seek(this.timeMs);
  }

  // spans from timelineSpans, plan from editPlan, clips: the project's clips. Called whenever any of them changes.
  setData({ spans, plan, clips }) {
    const currentClipId = this.spans[this.spanIndex]?.clipId ?? null;
    this.spans = spans;
    this.clips = new Map(clips.map((clip) => [clip.id, clip]));
    this.cutsByClip = new Map();
    this.keepsByClip = new Map();
    plan.cuts.forEach((cut) => this.listFor(this.cutsByClip, cut.clipId).push(cut));
    plan.keepSegments.forEach((segment) => this.listFor(this.keepsByClip, segment.clipId).push(segment));

    // The playing clip may have moved along the timeline, or left it.
    const index = spans.findIndex((span) => span.clipId === currentClipId);
    if (index >= 0) {
      this.spanIndex = index;
      this.timeMs = spans[index].timelineStartMs + this.clipTime();
      this.prepareNext(index);
      this.emit();
    } else {
      this.pause();
      this.seek(this.timeMs);
    }
  }

  setSkipCuts(on) {
    this.skipCuts = on;
    this.prepareNext(this.spanIndex);
    this.onView({ skipCuts: on });
  }

  // listener(timelineMs) runs on every frame while playing and after every seek. Returns the unsubscribe function.
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.timeMs);
    return () => this.listeners.delete(listener);
  }

  get timelineMs() {
    return this.spans.length ? this.spans[this.spans.length - 1].timelineEndMs : 0;
  }

  // ---- Controls

  seek(timelineMs) {
    if (!this.spans.length) {
      this.spanIndex = -1;
      this.timeMs = 0;
      this.onView({ clipId: null, width: 0, height: 0 });
      this.emit();
      return;
    }
    const time = clamp(timelineMs, 0, this.timelineMs);
    let index = this.spans.findIndex((span) => time < span.timelineEndMs);
    if (index < 0) index = this.spans.length - 1;
    const span = this.spans[index];
    let clipMs = time - span.timelineStartMs;
    if (this.skipCuts) {
      const cut = this.cutAt(span.clipId, clipMs, 0);
      if (cut) clipMs = cut.endMs;
    }

    this.spanIndex = index;
    this.timeMs = span.timelineStartMs + clipMs;
    this.load(this.slots[this.active], span.clipId, clipMs);
    if (this.playing) this.slots[this.active].element?.play().catch(() => {});
    this.prepareNext(index);
    this.reportClip();
    this.emit();
  }

  play() {
    if (!this.spans.length || this.playing) return;
    if (this.timeMs >= this.timelineMs - END_SLACK_MS) this.seek(0);
    this.playing = true;
    this.slots[this.active].element?.play().catch(() => {});
    this.onView({ playing: true });
    this.frame = requestAnimationFrame(this.tick);
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    cancelAnimationFrame(this.frame);
    this.slots.forEach((slot) => slot.element?.pause());
    this.onView({ playing: false });
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  // ---- The loop

  tick = () => {
    if (!this.playing) return;
    const span = this.spans[this.spanIndex];
    const slot = this.slots[this.active];
    if (!span || !slot.element) {
      this.finish();
      return;
    }

    let clipMs = this.clipTime();
    const endMs = this.lastKeptEnd(span);
    if (endMs === null || !this.playable(span)) {
      this.handOver();
      return;
    }
    if (this.skipCuts && slot.pendingMs === null) {
      const cut = this.cutAt(span.clipId, clipMs, SKIP_LEAD_MS);
      if (cut && cut.endMs >= endMs) {
        this.handOver();
        return;
      }
      if (cut) {
        slot.element.currentTime = cut.endMs / 1000;
        clipMs = cut.endMs;
      }
    }
    if (slot.element.ended || clipMs >= endMs - END_SLACK_MS) {
      this.handOver();
      return;
    }

    this.timeMs = span.timelineStartMs + clipMs;
    this.emit();
    this.frame = requestAnimationFrame(this.tick);
  };

  // The join: the waiting element takes over, already at the next clip's first kept moment, and the free one loads
  // the clip after that.
  handOver() {
    const next = this.nextPlayable(this.spanIndex);
    if (next === null) {
      this.finish();
      return;
    }
    const span = this.spans[next];
    const outgoing = this.slots[this.active];
    const incomingIndex = 1 - this.active;
    const incoming = this.slots[incomingIndex];
    if (incoming.clipId !== span.clipId) this.load(incoming, span.clipId, this.firstKept(span) ?? 0);

    outgoing.element?.pause();
    this.active = incomingIndex;
    this.slots.forEach((slot, index) => {
      if (slot.element) slot.element.dataset.active = String(index === this.active);
    });
    this.spanIndex = next;
    incoming.element?.play().catch(() => {});
    this.prepareNext(next);
    this.reportClip();
    this.timeMs = span.timelineStartMs + this.clipTime();
    this.emit();
    this.frame = requestAnimationFrame(this.tick);
  }

  // The end of the timeline: playback stops and goes back to the start, as in the prototype.
  finish() {
    this.pause();
    this.seek(0);
  }

  // ---- Helpers

  listFor(map, clipId) {
    if (!map.has(clipId)) map.set(clipId, []);
    return map.get(clipId);
  }

  emit() {
    this.listeners.forEach((listener) => listener(this.timeMs));
  }

  // The active element's time in its clip, or where it is about to be while its file loads.
  clipTime() {
    const slot = this.slots[this.active];
    if (slot.pendingMs !== null) return slot.pendingMs;
    return slot.element ? slot.element.currentTime * 1000 : 0;
  }

  load(slot, clipId, clipMs) {
    const { element } = slot;
    if (!element) return;
    if (slot.clipId !== clipId) {
      slot.clipId = clipId;
      slot.pendingMs = clipMs;
      element.src = this.proxyUrl(clipId);
      element.load();
      return;
    }
    if (element.readyState >= HTMLMediaElement.HAVE_METADATA) {
      element.currentTime = clipMs / 1000;
      slot.pendingMs = null;
    } else {
      slot.pendingMs = clipMs;
    }
  }

  // The other element waits on the next playable clip, paused at its first kept moment.
  prepareNext(index) {
    const next = this.nextPlayable(index);
    if (next === null) return;
    const span = this.spans[next];
    const slot = this.slots[1 - this.active];
    this.load(slot, span.clipId, this.firstKept(span) ?? 0);
    slot.element?.pause();
  }

  // A clip can play once its proxy exists; with Skip cuts on it also needs something kept.
  playable(span) {
    return Boolean(this.clips.get(span.clipId)?.artifacts?.proxy);
  }

  nextPlayable(index) {
    for (let next = index + 1; next < this.spans.length; next += 1) {
      const span = this.spans[next];
      if (this.playable(span) && this.firstKept(span) !== null) return next;
    }
    return null;
  }

  firstKept(span) {
    if (!this.skipCuts) return 0;
    return this.keepsByClip.get(span.clipId)?.[0]?.startMs ?? null;
  }

  lastKeptEnd(span) {
    if (!this.skipCuts) return span.durationMs;
    const keeps = this.keepsByClip.get(span.clipId);
    return keeps?.length ? keeps[keeps.length - 1].endMs : null;
  }

  // The cut of this clip that clipMs is inside, or within leadMs before. Cuts are sorted, so a binary search.
  cutAt(clipId, clipMs, leadMs) {
    const cuts = this.cutsByClip.get(clipId);
    if (!cuts?.length) return null;
    let low = 0;
    let high = cuts.length - 1;
    while (low <= high) {
      const middle = (low + high) >> 1;
      const cut = cuts[middle];
      if (clipMs < cut.startMs - leadMs) high = middle - 1;
      else if (clipMs >= cut.endMs) low = middle + 1;
      else return cut;
    }
    return null;
  }

  reportClip() {
    const slot = this.slots[this.active];
    const span = this.spans[this.spanIndex];
    this.onView({
      clipId: span?.clipId ?? null,
      width: slot.element?.videoWidth ?? 0,
      height: slot.element?.videoHeight ?? 0,
    });
  }
}
