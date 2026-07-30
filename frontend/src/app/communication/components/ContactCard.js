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
                <div className="contact-card-name">{profile.name || counterpartyName}</div>
                <div className="contact-card-row">{profile.email}</div>
                <div className="contact-card-divider" />
                <div className="contact-card-row"><strong>Company</strong> {profile.company}</div>
                <div className="contact-card-row"><strong>Department</strong> {profile.department}</div>
                <div className="contact-card-row"><strong>Role</strong> {profile.role}</div>
                <div className="contact-card-row"><strong>Timezone</strong> {profile.timezone}</div>
                <div className="contact-card-divider" />
                <div className="contact-card-row"><strong>Preferred</strong> {profile.preferredCommunication || "Email"}</div>
                {profile.lastInteraction && (
                  <div className="contact-card-row"><strong>Last Interaction</strong> {profile.lastInteraction}</div>
                )}
              </>
            ) : (
              /* ── Internal Contact Card ── */
              <>
                <div className="contact-card-name">
                  <span className="presence-dot">{profile.presence?.dot || "⚫"}</span>
                  {profile.fullName || senderId}
                </div>
                <div className="contact-card-row" style={{ color: profile.presence?.color }}>
                  {profile.presence?.status || "Offline"}
                </div>
                <div className="contact-card-divider" />
                <div className="contact-card-row"><strong>Title</strong> {profile.designation}</div>
                <div className="contact-card-row"><strong>Dept</strong> {profile.department}</div>
                <div className="contact-card-row"><strong>Email</strong> {profile.email}</div>
                <div className="contact-card-row"><strong>Reports To</strong> {profile.reportingManager}</div>
                <div className="contact-card-divider" />
                <div className="contact-card-row"><strong>Office</strong> {profile.officeLocation}</div>
                <div className="contact-card-row"><strong>Extension</strong> {profile.extension}</div>
                {profile.currentDesk && (
                  <div className="contact-card-row"><strong>Currently</strong> {profile.currentDesk} Desk</div>
                )}
                {profile.lastActive && (
                  <div className="contact-card-row"><strong>Last Active</strong> {profile.lastActive}</div>
                )}
              </>
            )
          ) : null}
        </div>
      )}
    </span>
  );
}
