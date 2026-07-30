import { useState, useRef, useCallback, useEffect } from "react";
import { getToken } from "../../../lib/auth";

// ── Cache for loaded profiles ──
const profileCache = {};

export default function ContactCard({ children, senderId, counterpartyName, isExternal }) {
  const [visible, setVisible] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const hoverTimer = useRef(null);
  const leaveTimer = useRef(null);
  const cardRef = useRef(null);

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const cacheKey = isExternal ? `ext_${counterpartyName}` : `int_${senderId}`;

  const loadProfile = useCallback(async () => {
    // Check cache first
    if (profileCache[cacheKey]) {
      setProfile(profileCache[cacheKey]);
      return;
    }

    setLoading(true);
    try {
      const endpoint = isExternal
        ? `/api/user-profile/external/${encodeURIComponent(counterpartyName)}`
        : `/api/user-profile/${encodeURIComponent(senderId)}`;

      const res = await fetch(endpoint, {
        headers: { "Authorization": "Bearer " + getToken() }
      });
      const data = await res.json();
      if (data.success && data.profile) {
        profileCache[cacheKey] = data.profile;
        setProfile(data.profile);
      }
    } catch (err) {
      console.warn("ContactCard fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, isExternal, counterpartyName, senderId]);

  const handleMouseEnter = () => {
    clearTimeout(leaveTimer.current);
    hoverTimer.current = setTimeout(() => {
      setVisible(true);
      loadProfile();
    }, 200);
  };

  const handleMouseLeave = () => {
    clearTimeout(hoverTimer.current);
    leaveTimer.current = setTimeout(() => {
      setVisible(false);
    }, 150);
  };

  const handleCardEnter = () => {
    clearTimeout(leaveTimer.current);
  };

  const handleCardLeave = () => {
    leaveTimer.current = setTimeout(() => {
      setVisible(false);
    }, 150);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(hoverTimer.current);
      clearTimeout(leaveTimer.current);
    };
  }, []);

  return (
    <span
      className="contact-card-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {visible && (
        <div
          className="contact-card"
          ref={cardRef}
          onMouseEnter={handleCardEnter}
          onMouseLeave={handleCardLeave}
        >
          {loading && !profile ? (
            <div style={{ color: "#a19f9d", fontSize: 12 }}>Loading...</div>
          ) : profile ? (
            isExternal ? (
              /* ── External Contact Card ── */
              <>
                <div className="cc-header">
                  <div className="cc-avatar external">{getInitials(profile.name || counterpartyName)}</div>
                  <div className="cc-header-info">
                    <div className="contact-card-name">{profile.name || counterpartyName}</div>
                    <div className="cc-title">{profile.role || "External Contact"}</div>
                    <div className="cc-dept">{profile.company}</div>
                  </div>
                </div>
                <div className="contact-card-divider" />
                <div className="contact-card-row">
                  <span className="cc-icon">✉️</span> {profile.email}
                </div>
                <div className="contact-card-row">
                  <span className="cc-icon">🌐</span> <strong>Timezone</strong> {profile.timezone}
                </div>
                <div className="contact-card-divider" />
                <div className="contact-card-row"><strong>Preferred</strong> {profile.preferredCommunication || "Email"}</div>
                {profile.lastInteraction && (
                  <div className="contact-card-row"><strong>Last Interaction</strong> {profile.lastInteraction}</div>
                )}
              </>
            ) : (
              /* ── Internal Contact Card ── */
              <>
                <div className="cc-header">
                  <div className="cc-avatar-wrapper">
                    <div className="cc-avatar">{getInitials(profile.fullName || senderId)}</div>
                    <div className="cc-presence" style={{ background: profile.presence?.color || "#d13438" }} title={profile.presence?.status || "Offline"}></div>
                  </div>
                  <div className="cc-header-info">
                    <div className="contact-card-name">{profile.fullName || senderId}</div>
                    <div className="cc-title">{profile.designation}</div>
                    <div className="cc-dept">{profile.department}</div>
                  </div>
                </div>
                <div className="contact-card-divider" />
                <div className="contact-card-row">
                  <span className="cc-icon">✉️</span> {profile.email}
                </div>
                <div className="contact-card-row">
                  <span className="cc-icon">👤</span> <strong>Reports To</strong> {profile.reportingManager}
                </div>
                <div className="contact-card-divider" />
                <div className="contact-card-row">
                  <span className="cc-icon">🏢</span> <strong>Office</strong> Skillomentum Office
                </div>
                {profile.currentDesk && (
                  <div className="contact-card-row">
                    <span className="cc-icon">💻</span> <strong>Currently</strong> {profile.currentDesk} Desk
                  </div>
                )}
                {profile.lastActive && (
                  <div className="contact-card-row">
                    <span className="cc-icon">🕒</span> <strong>Last Active</strong> {profile.lastActive}
                  </div>
                )}
              </>
            )
          ) : null}
        </div>
      )}
    </span>
  );
}
