// Navigation context + responsive layout for Naikit Prototype

const NavContext = React.createContext(null);
const useNav = () => React.useContext(NavContext);

const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  React.useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
};

const ProtoNavItem = ({ icon, label, screenKey, badge }) => {
  const { screen, navigate } = useNav();
  const active = screen === screenKey;
  return (
    <div onClick={() => navigate(screenKey)} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
      background: active ? '#0A0A0A' : 'transparent',
      color: active ? '#FFD400' : '#0A0A0A',
      fontWeight: active ? 700 : 500, fontSize: 14,
      border: active ? '2px solid #0A0A0A' : '2px solid transparent',
      userSelect: 'none',
    }}>
      <span style={{ fontSize: 18, width: 20, textAlign: 'center' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && (
        <span style={{ background: active ? '#FFD400' : '#0A0A0A', color: active ? '#0A0A0A' : '#FFD400', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999 }}>{badge}</span>
      )}
    </div>
  );
};

const ProtoSidebar = () => {
  const ws = window.MOCK_WORKSHEETS;
  const { navigate } = useNav();
  return (
    <div style={{ width: 240, background: '#FAFAFA', borderRight: '2px solid #0A0A0A', display: 'flex', flexDirection: 'column', padding: 16, flexShrink: 0, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px 20px', borderBottom: '2px solid #0A0A0A', marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#FFD400', border: '2px solid #0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>NK</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.1 }}>Naikit</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#737373', letterSpacing: 0.5 }}>STICKER OPS</div>
        </div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#737373', letterSpacing: 1.2, padding: '0 6px 8px' }}>WORKFLOW</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <ProtoNavItem icon="📋" label="ใบงานวันนี้" screenKey="home" badge={ws.length} />
        <ProtoNavItem icon="➕" label="สร้างใบงาน" screenKey="create" />
        <ProtoNavItem icon="📊" label="รายงาน" screenKey="report" />
        <ProtoNavItem icon="✅" label="สรุปงานคอนเฟิร์ม" screenKey="diary" />
      </div>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#737373', letterSpacing: 1.2, padding: '20px 6px 8px' }}>SYSTEM</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <ProtoNavItem icon="⚙️" label="ตั้งค่า" screenKey="setting" />
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ borderTop: '2px solid #0A0A0A', padding: '12px 6px 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 999, background: '#0A0A0A', color: '#FFD400', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>นด</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.1 }}>นาเดียร์</div>
          <div style={{ fontSize: 11, color: '#737373' }}>ฝ่ายขาย</div>
        </div>
        <span onClick={() => navigate('login')} style={{ fontSize: 14, cursor: 'pointer', color: '#737373' }} title="ออกจากระบบ">↗</span>
      </div>
    </div>
  );
};

const MobileBottomNav = () => {
  const { screen, navigate } = useNav();
  const items = [
    { icon: '📋', label: 'งาน', key: 'home' },
    { icon: '➕', label: '', key: 'create', fab: true },
    { icon: '📊', label: 'รายงาน', key: 'report' },
    { icon: '⚙️', label: 'ตั้งค่า', key: 'setting' },
  ];
  return (
    <div style={{ borderTop: '2px solid #0A0A0A', background: '#FFFFFF', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '6px 0 14px', flexShrink: 0 }}>
      {items.map((n, i) => n.fab ? (
        <button key={i} onClick={() => navigate(n.key)} style={{ width: 48, height: 48, borderRadius: 999, background: '#FFD400', border: '2px solid #0A0A0A', boxShadow: '2px 2px 0 #0A0A0A', fontSize: 20, marginTop: -22, cursor: 'pointer' }}>➕</button>
      ) : (
        <div key={i} onClick={() => navigate(n.key)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: screen === n.key ? '#0A0A0A' : '#A3A3A3', cursor: 'pointer', padding: '4px 20px' }}>
          <span style={{ fontSize: 20 }}>{n.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 700 }}>{n.label}</span>
        </div>
      ))}
    </div>
  );
};

// Main layout wrapper for authenticated screens
const AppLayout = ({ children }) => {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#FAFAFA' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>{children}</div>
        <MobileBottomNav />
      </div>
    );
  }
  return (
    <div style={{ height: '100vh', display: 'flex', overflow: 'hidden', fontFamily: "'IBM Plex Sans Thai', sans-serif" }}>
      <ProtoSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>{children}</div>
    </div>
  );
};

// Reusable top bar (yellow)
const ProtoTopBar = ({ title, subtitle, breadcrumb, right, onBack }) => {
  const { navigate } = useNav();
  const isMobile = useIsMobile();
  return (
    <div style={{ background: '#FFD400', borderBottom: '3px solid #0A0A0A', padding: isMobile ? '12px 16px' : '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0 }}>←</button>
        )}
        <div style={{ minWidth: 0 }}>
          {breadcrumb && !isMobile && <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, letterSpacing: 0.5, marginBottom: 2 }}>{breadcrumb}</div>}
          <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, margin: 0, letterSpacing: -0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
          {subtitle && <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>}
        </div>
      </div>
      {right && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>{right}</div>}
    </div>
  );
};

Object.assign(window, { NavContext, useNav, useIsMobile, AppLayout, ProtoTopBar, ProtoSidebar });
