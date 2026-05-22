// Shared building blocks for Naikit Sticker redesign

const STATUS_COLORS = {
  "รอออกแบบ":      { bg: "#FFE9E9", fg: "#B91C1C", dot: "#DC2626" },
  "กำลังออกแบบ":   { bg: "#E0F2FE", fg: "#075985", dot: "#0284C7" },
  "รอคอนเฟิร์มแบบ": { bg: "#FFF7CC", fg: "#854D0E", dot: "#CA8A04" },
  "คอนเฟิร์มแล้ว": { bg: "#DCFCE7", fg: "#166534", dot: "#16A34A" },
  "รอผลิต":        { bg: "#EDE9FE", fg: "#5B21B6", dot: "#7C3AED" },
  "กำลังผลิต":     { bg: "#E0E7FF", fg: "#3730A3", dot: "#4F46E5" },
  "รอส่งมอบ":      { bg: "#FFEDD5", fg: "#9A3412", dot: "#EA580C" },
  "ส่งมอบแล้ว":    { bg: "#CCFBF1", fg: "#115E59", dot: "#0D9488" },
};

const StatusPill = ({ status, size = "md" }) => {
  const c = STATUS_COLORS[status] || { bg: "#E5E5E5", fg: "#525252", dot: "#737373" };
  const padding = size === "sm" ? "2px 8px" : "4px 12px";
  const fontSize = size === "sm" ? 11 : 13;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: c.bg, color: c.fg,
      padding, borderRadius: 999, fontSize, fontWeight: 600,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: c.dot }} />
      {status}
    </span>
  );
};

const UrgentBadge = () => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    background: "#0A0A0A", color: "#FFD400",
    padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 800,
    letterSpacing: 0.5,
  }}>
    ⚡ ด่วน
  </span>
);

// Yellow primary button with hard black border (Bold & confident)
const BoldButton = ({ children, variant = "primary", size = "md", onClick, style, icon }) => {
  const sizes = {
    sm: { padding: "6px 12px", fontSize: 13 },
    md: { padding: "10px 18px", fontSize: 14 },
    lg: { padding: "14px 24px", fontSize: 16 },
  };
  const variants = {
    primary: { background: "#FFD400", color: "#0A0A0A", border: "2px solid #0A0A0A", boxShadow: "3px 3px 0 #0A0A0A" },
    dark:    { background: "#0A0A0A", color: "#FFFFFF", border: "2px solid #0A0A0A", boxShadow: "3px 3px 0 #FFD400" },
    ghost:   { background: "#FFFFFF", color: "#0A0A0A", border: "2px solid #0A0A0A", boxShadow: "3px 3px 0 #E5E5E5" },
    danger:  { background: "#E63946", color: "#FFFFFF", border: "2px solid #0A0A0A", boxShadow: "3px 3px 0 #0A0A0A" },
  };
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      fontWeight: 700, borderRadius: 8, cursor: "pointer",
      fontFamily: "inherit",
      ...sizes[size], ...variants[variant], ...style,
    }}>
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};

// Top app bar — yellow header with thick black bottom border
const TopBar = ({ title, subtitle, breadcrumb, right }) => (
  <div style={{
    background: "#FFD400",
    borderBottom: "3px solid #0A0A0A",
    padding: "16px 28px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  }}>
    <div>
      {breadcrumb && (
        <div style={{ fontSize: 12, fontWeight: 600, color: "#0A0A0A", opacity: 0.7, letterSpacing: 0.5, marginBottom: 4 }}>
          {breadcrumb}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0A0A0A", margin: 0, letterSpacing: -0.3 }}>
          {title}
        </h1>
        {subtitle && (
          <span style={{ fontSize: 13, color: "#0A0A0A", opacity: 0.65, fontWeight: 500 }}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
    {right}
  </div>
);

// Sidebar nav item
const NavItem = ({ icon, label, active, badge }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 14px", borderRadius: 8, cursor: "pointer",
    background: active ? "#0A0A0A" : "transparent",
    color: active ? "#FFD400" : "#0A0A0A",
    fontWeight: active ? 700 : 500,
    fontSize: 14,
    border: active ? "2px solid #0A0A0A" : "2px solid transparent",
  }}>
    <span style={{ fontSize: 18, width: 20, textAlign: "center" }}>{icon}</span>
    <span style={{ flex: 1 }}>{label}</span>
    {badge && (
      <span style={{
        background: active ? "#FFD400" : "#0A0A0A",
        color: active ? "#0A0A0A" : "#FFD400",
        fontSize: 11, fontWeight: 800,
        padding: "2px 8px", borderRadius: 999, minWidth: 22, textAlign: "center",
      }}>{badge}</span>
    )}
  </div>
);

const Sidebar = ({ active }) => (
  <div style={{
    width: 240, background: "#FAFAFA",
    borderRight: "2px solid #0A0A0A",
    display: "flex", flexDirection: "column",
    padding: 16,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px 20px", borderBottom: "2px solid #0A0A0A", marginBottom: 16 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: "#FFD400", border: "2px solid #0A0A0A",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 900, fontSize: 18, color: "#0A0A0A",
      }}>NK</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#0A0A0A", lineHeight: 1.1 }}>Naikit</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#737373", letterSpacing: 0.5 }}>STICKER OPS</div>
      </div>
    </div>
    <div style={{ fontSize: 10, fontWeight: 800, color: "#737373", letterSpacing: 1.2, padding: "0 6px 8px" }}>WORKFLOW</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <NavItem icon="📋" label="ใบงานวันนี้" active={active === "home"} badge="8" />
      <NavItem icon="➕" label="สร้างใบงาน" active={active === "create"} />
      <NavItem icon="📊" label="รายงาน" active={active === "report"} />
      <NavItem icon="✅" label="สรุปงานคอนเฟิร์ม" active={active === "diary"} />
    </div>
    <div style={{ fontSize: 10, fontWeight: 800, color: "#737373", letterSpacing: 1.2, padding: "20px 6px 8px" }}>SYSTEM</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <NavItem icon="⚙️" label="ตั้งค่า" active={active === "setting"} />
    </div>
    <div style={{ flex: 1 }} />
    <div style={{
      borderTop: "2px solid #0A0A0A", padding: "12px 6px 4px",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 999,
        background: "#0A0A0A", color: "#FFD400",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: 13,
      }}>นด</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0A0A0A", lineHeight: 1.1 }}>นาเดียร์</div>
        <div style={{ fontSize: 11, color: "#737373", fontWeight: 500 }}>ฝ่ายขาย</div>
      </div>
      <span style={{ fontSize: 16, cursor: "pointer", color: "#737373" }}>↗</span>
    </div>
  </div>
);

// Image placeholder with diagonal stripes
const ImgPlaceholder = ({ w = 160, h = 160, label = "Worksheet" }) => (
  <div style={{
    width: w, height: h, borderRadius: 8, border: "2px solid #0A0A0A",
    background: "repeating-linear-gradient(135deg, #FAFAFA 0 8px, #F0F0F0 8px 16px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: 600, color: "#737373",
    fontFamily: "JetBrains Mono, monospace",
    letterSpacing: 0.5,
  }}>
    [{label.toUpperCase()}]
  </div>
);

// expose
Object.assign(window, { STATUS_COLORS, StatusPill, UrgentBadge, BoldButton, TopBar, NavItem, Sidebar, ImgPlaceholder });
