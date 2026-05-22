// Login Screen — responsive & interactive

const ProtoLoginScreen = () => {
  const { navigate } = useNav();
  const isMobile = useIsMobile();
  const [remember, setRemember] = React.useState(true);
  const [showPw, setShowPw] = React.useState(false);

  const DotGrid = () => (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.18, pointerEvents: 'none' }}>
      <defs>
        <pattern id="lgdots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.5" fill="#0A0A0A" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#lgdots)" />
    </svg>
  );

  const FormPanel = () => (
    <div style={{ width: '100%', maxWidth: 380 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 20, height: 3, background: '#FFD400', border: '1px solid #0A0A0A' }} />
        <span style={{ fontSize: 11, fontWeight: 800, color: '#737373', letterSpacing: 1.8 }}>SIGN IN · เข้าสู่ระบบ</span>
      </div>
      <h2 style={{ fontSize: 36, fontWeight: 900, margin: '0 0 6px', letterSpacing: -1, lineHeight: 1 }}>ยินดีต้อนรับ</h2>
      <p style={{ margin: '0 0 32px', fontSize: 14, fontWeight: 500, color: '#737373' }}>เข้าสู่ระบบเพื่อจัดการใบงานของคุณ</p>

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6, letterSpacing: 0.5 }}>USERNAME · ชื่อผู้ใช้</label>
        <div style={{ border: '2.5px solid #0A0A0A', borderRadius: 8, padding: '12px 14px', background: '#FFF', boxShadow: '4px 4px 0 #0A0A0A', display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 600 }}>
          <span style={{ opacity: 0.4 }}>👤</span><span>nadear</span>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6, letterSpacing: 0.5 }}>PASSWORD · รหัสผ่าน</label>
        <div style={{ border: '2.5px solid #0A0A0A', borderRadius: 8, padding: '12px 14px', background: '#FFF', boxShadow: '4px 4px 0 #0A0A0A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 15, fontWeight: 600 }}>
            <span style={{ opacity: 0.4 }}>🔒</span>
            <span style={{ letterSpacing: showPw ? 0 : 5, fontSize: 14 }}>{showPw ? 'naikit2026' : '••••••••'}</span>
          </div>
          <span onClick={() => setShowPw(!showPw)} style={{ fontSize: 11, fontWeight: 800, color: '#737373', letterSpacing: 1, cursor: 'pointer', userSelect: 'none' }}>{showPw ? 'HIDE' : 'SHOW'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <div onClick={() => setRemember(!remember)} style={{ width: 18, height: 18, borderRadius: 4, border: '2px solid #0A0A0A', background: remember ? '#FFD400' : '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, cursor: 'pointer', flexShrink: 0 }}>{remember ? '✓' : ''}</div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#525252' }}>จำฉันไว้ในอุปกรณ์นี้</span>
      </div>

      <button onClick={() => navigate('home')} style={{ width: '100%', padding: '15px 24px', background: '#FFD400', color: '#0A0A0A', border: '2.5px solid #0A0A0A', borderRadius: 8, boxShadow: '5px 5px 0 #0A0A0A', fontSize: 16, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        เข้าสู่ระบบ
        <span style={{ background: '#0A0A0A', color: '#FFD400', fontSize: 14, fontWeight: 900, padding: '2px 10px', borderRadius: 4 }}>→</span>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 16px' }}>
        <div style={{ flex: 1, height: 1.5, background: '#E5E5E5' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#A3A3A3', letterSpacing: 1 }}>ความช่วยเหลือ</span>
        <div style={{ flex: 1, height: 1.5, background: '#E5E5E5' }} />
      </div>

      <div style={{ padding: '12px 14px', border: '2px solid #E5E5E5', borderRadius: 8, background: '#FFF', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 26, height: 26, borderRadius: 6, background: '#FFD400', border: '1.5px solid #0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>💡</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 2 }}>ลืมรหัสผ่าน?</div>
          <div style={{ fontSize: 12, color: '#737373' }}>ติดต่อแอดมินที่ไลน์ <span style={{ fontWeight: 800, color: '#0A0A0A' }}>@naikit-admin</span></div>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div style={{ minHeight: '100dvh', background: '#FAFAFA', display: 'flex', flexDirection: 'column', fontFamily: "'IBM Plex Sans Thai', sans-serif" }}>
        <div style={{ background: '#FFD400', borderBottom: '3px solid #0A0A0A', padding: '28px 22px 22px', position: 'relative', overflow: 'hidden' }}>
          <DotGrid />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#0A0A0A', color: '#FFD400', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, fontFamily: 'JetBrains Mono, monospace', border: '2px solid #0A0A0A', boxShadow: '3px 3px 0 rgba(0,0,0,0.2)', flexShrink: 0 }}>NK</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>Naikit Sticker</div>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.6, letterSpacing: 1.2 }}>WORKSHEET TRACKER</div>
            </div>
            <div style={{ marginLeft: 'auto', background: '#0A0A0A', color: '#FFD400', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace' }}>v2</div>
          </div>
          <div style={{ position: 'relative', zIndex: 1, fontSize: 38, fontWeight: 900, letterSpacing: -1.5, lineHeight: 0.92 }}>
            จบเรื่อง<br />
            <span style={{ background: '#0A0A0A', color: '#FFD400', padding: '0 10px' }}>กระดาษ</span><br />
            ในร้าน
          </div>
          <div style={{ position: 'absolute', bottom: -40, right: -40, width: 160, height: 160, borderRadius: '50%', border: '22px solid #0A0A0A', opacity: 0.07, pointerEvents: 'none' }} />
        </div>
        <div style={{ padding: '28px 22px', flex: 1 }}>
          <FormPanel />
        </div>
        <div style={{ padding: '16px 22px', textAlign: 'center', borderTop: '1px solid #E5E5E5' }}>
          <span style={{ fontSize: 11, color: '#A3A3A3', fontWeight: 500 }}>Naikit Sticker · Worksheet Tracker v2 · © 2026</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', overflow: 'hidden', fontFamily: "'IBM Plex Sans Thai', sans-serif" }}>
      {/* Left brand panel */}
      <div style={{ width: '46%', minWidth: 420, background: '#FFD400', borderRight: '3px solid #0A0A0A', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        <DotGrid />
        <div style={{ padding: '28px 40px', borderBottom: '2px solid rgba(10,10,10,0.15)', display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
          <div style={{ width: 52, height: 52, borderRadius: 10, background: '#0A0A0A', color: '#FFD400', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 22, fontFamily: 'JetBrains Mono, monospace', border: '2px solid #0A0A0A', boxShadow: '3px 3px 0 rgba(0,0,0,0.2)', flexShrink: 0 }}>NK</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>Naikit Sticker</div>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, letterSpacing: 1.5, marginTop: 1 }}>WORKSHEET TRACKER</div>
          </div>
          <div style={{ marginLeft: 'auto', background: '#0A0A0A', color: '#FFD400', fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace' }}>v2.0</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 40px 32px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 32, height: 3, background: '#0A0A0A' }} />
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2 }}>OPERATIONS PLATFORM</span>
          </div>
          <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 0.9, letterSpacing: -2.5 }}>จบเรื่อง</div>
          <div style={{ margin: '6px 0' }}>
            <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 0.9, letterSpacing: -2.5, background: '#0A0A0A', color: '#FFD400', padding: '4px 16px 8px', display: 'inline-block' }}>กระดาษ</div>
          </div>
          <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 0.9, letterSpacing: -2.5 }}>ในร้าน</div>
          <div style={{ marginTop: 28, padding: '14px 18px', background: 'rgba(10,10,10,0.07)', borderLeft: '3px solid #0A0A0A', borderRadius: '0 8px 8px 0', maxWidth: 400 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, lineHeight: 1.65 }}>ติดตามใบงานสติกเกอร์ ไวนิล และงานพิมพ์ ตั้งแต่รับออเดอร์ ออกแบบ ผลิต จนส่งมอบ — <strong>ทุกขั้นตอนในที่เดียว</strong></p>
          </div>
        </div>
        <div style={{ borderTop: '2px solid rgba(10,10,10,0.15)', padding: '18px 40px', display: 'flex', background: 'rgba(10,10,10,0.06)', position: 'relative', zIndex: 1 }}>
          {[{ n: '1,247', l: 'ใบงาน/เดือน' }, { n: '98%', l: 'ส่งตรงเวลา' }, { n: '14', l: 'คนในทีม' }].map((s, i) => (
            <div key={i} style={{ flex: 1, paddingLeft: i > 0 ? 24 : 0, borderLeft: i > 0 ? '1.5px solid rgba(10,10,10,0.2)' : 'none', marginLeft: i > 0 ? 24 : 0 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 26, fontWeight: 800, lineHeight: 1, display: 'block' }}>{s.n}</span>
              <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.65 }}>{s.l}</span>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: -80, right: -80, width: 260, height: 260, borderRadius: '50%', border: '28px solid #0A0A0A', opacity: 0.07, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 120, right: 36, width: 54, height: 54, border: '3px solid #0A0A0A', opacity: 0.12, transform: 'rotate(18deg)', pointerEvents: 'none' }} />
      </div>
      {/* Right form panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 56px', background: '#FAFAFA', overflowY: 'auto' }}>
        <FormPanel />
        <div style={{ marginTop: 32 }}>
          <span style={{ fontSize: 11, color: '#A3A3A3', fontWeight: 500 }}>Naikit Sticker · Worksheet Tracker v2 · © 2026</span>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { ProtoLoginScreen });
