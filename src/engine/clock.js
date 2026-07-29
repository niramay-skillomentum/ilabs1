const { getIo } = require("./socketEngine");

class SimulationClock {
  constructor() {
    this.interval = null;

    // ===== CONFIG =====
    this.realTickMs = 1000;         // 1 sec real
    this.simulatedMsPerTick = 3000; // 3 sec simulated (9h → 3h)
    this.simSpeed = 3;              // 3x simulation speed

    this.sessionStart = null;
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

  setSessionStart(sessionStart) {
    this.sessionStart = new Date(sessionStart);
  }

  start() {
    if (this.interval) return;

    this.interval = setInterval(() => {
      const simTime = this.getTime();

      try {
        const io = getIo();
        const hours = simTime.getHours();
        const minutes = simTime.getMinutes();
        const totalMinutesLeft = (18 * 60) - (hours * 60 + minutes);

        // Build cutoff breach info for frontend
        let cutoffsReached = [];
        try {
          const cutoffEngine = require("./cutoff");
          const statuses = cutoffEngine.getAllCutoffStatuses();
          cutoffsReached = Object.entries(statuses)
            .filter(([, s]) => s.breached)
            .map(([ccy]) => ccy);
        } catch (e) { /* cutoff engine not ready */ }

        io.emit("clock_tick", {
          simTime: this.getFormattedTime(),
          timeLeftMinutes: totalMinutesLeft,
          cutoffsReached
        });
      } catch (err) {
        // Socket.io might not be initialized yet, silently ignore
      }

      // Stop at 6PM
      if (simTime.getHours() >= 18) {
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
    this.sessionStart = new Date();
  }

  getTime() {
    if (!this.sessionStart) {
      return this.getToday9AM();
    }
    const elapsedMs = new Date() - this.sessionStart;
    const currentSimTime = this.getToday9AM();
    currentSimTime.setTime(currentSimTime.getTime() + elapsedMs * this.simSpeed);
    return currentSimTime;
  }

  // ===== HOURS AND MINUTES (for cutoff comparisons) =====
  getSimulatedHoursMinutes() {
    const simTime = this.getTime();
    return {
      hours: simTime.getHours(),
      minutes: simTime.getMinutes()
    };
  }

  // ===== SIMPLE, NO TIMEZONE CONVERSION =====
  getFormattedTime() {
    const pad = (n) => String(n).padStart(2, "0");
    const simTime = this.getTime();

    return `${simTime.getFullYear()}-${pad(simTime.getMonth()+1)}-${pad(simTime.getDate())} ` +
           `${pad(simTime.getHours())}:${pad(simTime.getMinutes())}:${pad(simTime.getSeconds())}`;
  }

  getOperationalTimeET() {
    // For now same as system time (we'll fix ET later properly)
    return this.getFormattedTime();
  }
}

module.exports = new SimulationClock();