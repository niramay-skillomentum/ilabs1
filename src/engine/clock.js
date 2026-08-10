const { getIo } = require("./socketEngine");

class SimulationClock {
  constructor() {
    this.interval = null;

    // ===== CONFIG =====
    this.realTickMs = 1000;         // 1 sec real
    this.simulatedMsPerTick = 3000; // 3 sec simulated (9h → 3h)

    this.simulatedTime = this.getToday9AM();
  }

  // ===== LOCAL TODAY 9AM =====
  getToday9AM() {
    const now = new Date();

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      9, 0, 0
    );
  }

  start() {
    if (this.interval) return;

    this.interval = setInterval(() => {
      this.simulatedTime = new Date(
        this.simulatedTime.getTime() + this.simulatedMsPerTick
      );

      // Broadcast the clock via websockets
      try {
        const io = getIo();
        const hours = this.simulatedTime.getHours();
        const minutes = this.simulatedTime.getMinutes();
        const totalMinutesLeft = (18 * 60) - (hours * 60 + minutes);

        io.emit("clock_tick", {
          simTime: this.getFormattedTime(),
          timeLeftMinutes: totalMinutesLeft
        });
      } catch (err) {
        // Socket.io might not be initialized yet, silently ignore
      }

      // Stop at 6PM
      if (this.simulatedTime.getHours() >= 18) {
        this.stop();
      }

    }, this.realTickMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  reset() {
    this.stop();
    this.simulatedTime = this.getToday9AM();
  }

  getTime() {
    return this.simulatedTime;
  }

  // ===== SIMPLE, NO TIMEZONE CONVERSION =====
  getFormattedTime() {
    const pad = (n) => String(n).padStart(2, "0");

    return `${this.simulatedTime.getFullYear()}-${pad(this.simulatedTime.getMonth()+1)}-${pad(this.simulatedTime.getDate())} ` +
           `${pad(this.simulatedTime.getHours())}:${pad(this.simulatedTime.getMinutes())}:${pad(this.simulatedTime.getSeconds())}`;
  }

  getOperationalTimeET() {
    // For now same as system time (we'll fix ET later properly)
    return this.getFormattedTime();
  }
}

module.exports = new SimulationClock();