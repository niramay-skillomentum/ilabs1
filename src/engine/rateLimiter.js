// ======================================
// TOKEN-BUCKET RATE LIMITER
// Replaces the single global 4s LLM gate (which serialized every AI reply
// process-wide) with a bucket sized to the provider quota. This lets up to
// `burst` calls proceed immediately and refills at `ratePerMin`, so N replies
// run concurrently up to the real quota instead of 1-every-4-seconds.
// For real "massive traffic" scale, rotate multiple API keys behind buckets.
// ======================================

class TokenBucket {
  constructor({ ratePerMin, burst }) {
    this.capacity = burst;
    this.tokens = burst;
    this.refillPerMs = ratePerMin / 60000; // tokens added per millisecond
    this.last = Date.now();
  }

  async take() {
    // Loop: refill based on elapsed time, consume a token when available,
    // otherwise sleep just long enough for the next token to arrive.
    for (;;) {
      const now = Date.now();
      this.tokens = Math.min(this.capacity, this.tokens + (now - this.last) * this.refillPerMs);
      this.last = now;
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      const waitMs = Math.ceil((1 - this.tokens) / this.refillPerMs);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }
}

// Gemini free tier ~15 rpm; override via env for paid tiers.
module.exports = new TokenBucket({
  ratePerMin: Number(process.env.GEMINI_RPM || 15),
  burst: Number(process.env.GEMINI_BURST || 5)
});
