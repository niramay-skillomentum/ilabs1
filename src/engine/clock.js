const { getIo } = require("./socketEngine");

class SimulationClock {
  constructor() {
    this.interval = null;

    // ===== CONFIG =====
    this.realTickMs = 1000;         // 1 sec real
    this.simulatedMsPerTick = 3000; // 3 sec simulated (9h → 3h)
    this.simSpeed = 3;              // 3x simulation speed

    this.sessionStart = null;
    this.userSessions = new Map();
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

  setSessionStart(sessionStart, userId = null) {
    if (!sessionStart) return;
    this.sessionStart = new Date(sessionStart);
    if (userId) {
      this.setUserSessionStart(userId, sessionStart);
    }
  }

  setUserSessionStart(userId, sessionStart) {
    if (!userId || !sessionStart) return;
    this.userSessions.set(String(userId), new Date(sessionStart));
  }

  getUserSessionStart(userId) {
    if (!userId) return this.sessionStart;
    return this.userSessions.get(String(userId)) || this.sessionStart;
  }

  start() {
    if (this.interval) return;

    this.interval = setInterval(() => {
      try {
        const io = getIo();
        if (!io) return;

        const cutoffEngine = require("./cutoff");

        // Emit targeted clock_tick to each active user room
        for (const [userId, sessionStart] of this.userSessions.entries()) {
          const simTime = this.getTime(userId);
          const hours = simTime.getHours();
          const minutes = simTime.getMinutes();
          const totalMinutesLeft = Math.max(0, (18 * 60) - (hours * 60 + minutes));

          let cutoffsReached = [];
          try {
            const statuses = cutoffEngine.getAllCutoffStatuses(userId);
            cutoffsReached = Object.entries(statuses)
              .filter(([, s]) => s.breached)
              .map(([ccy]) => ccy);
          } catch (e) {}

          io.to(`user_${userId}`).emit("clock_tick", {
            simTime: this.getFormattedTime(userId),
            timeLeftMinutes: totalMinutesLeft,
            cutoffsReached
          });
        }

        // Global fallback broadcast
        const globalSimTime = this.getTime();
        const gHours = globalSimTime.getHours();
        const gMinutes = globalSimTime.getMinutes();
        const gMinutesLeft = Math.max(0, (18 * 60) - (gHours * 60 + gMinutes));
        let gCutoffsReached = [];
        try {
          const statuses = cutoffEngine.getAllCutoffStatuses();
          gCutoffsReached = Object.entries(statuses)
            .filter(([, s]) => s.breached)
            .map(([ccy]) => ccy);
        } catch (e) {}

        io.emit("clock_tick", {
          simTime: this.getFormattedTime(),
          timeLeftMinutes: gMinutesLeft,
          cutoffsReached: gCutoffsReached
        });

      } catch (err) {
        // Socket.io might not be initialized yet, silently ignore
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

  getTime(userId = null) {
    let start = null;
    if (userId && typeof userId === "object" && userId instanceof Date) {
      start = userId;
    } else if (userId && typeof userId === "string" && !isNaN(Date.parse(userId)) && !this.userSessions.has(String(userId))) {
      start = new Date(userId);
    } else {
      start = this.getUserSessionStart(userId);
    }
    if (!start) {
      return this.getToday9AM();
    }
    const elapsedMs = new Date() - new Date(start);
    const maxSimulatedMs = 9 * 60 * 60 * 1000; // 9 hours (09:00 AM to 18:00 PM)
    const simulatedDelta = Math.min(elapsedMs * this.simSpeed, maxSimulatedMs);
    const currentSimTime = this.getToday9AM();
    currentSimTime.setTime(currentSimTime.getTime() + simulatedDelta);
    return currentSimTime;
  }

  // ===== HOURS AND MINUTES (for cutoff comparisons) =====
  getSimulatedHoursMinutes(userId = null) {
    const simTime = this.getTime(userId);
    return {
      hours: simTime.getHours(),
      minutes: simTime.getMinutes()
    };
  }

  // ===== SIMPLE, NO TIMEZONE CONVERSION =====
  getFormattedTime(userId = null) {
    const pad = (n) => String(n).padStart(2, "0");
    const simTime = this.getTime(userId);

    return `${simTime.getFullYear()}-${pad(simTime.getMonth()+1)}-${pad(simTime.getDate())} ` +
           `${pad(simTime.getHours())}:${pad(simTime.getMinutes())}:${pad(simTime.getSeconds())}`;
  }

  getOperationalTimeET(userId = null) {
    return this.getFormattedTime(userId);
  }
}

module.exports = new SimulationClock();