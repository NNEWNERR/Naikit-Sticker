// Settings Screen

const ProtoSettingScreen = () => {
  const isMobile = useIsMobile();
  const [tab, setTab] = React.useState('users');
  const [showAdd, setShowAdd] = React.useState(false);

  const settingTabs = [
    { k: 'users', i: '👤', l: 'ผู้ใช้งาน', c: 6 },
    { k: 'groups', i: '👥', l: 'กลุ่มสิทธิ์', c: 4 },
    { k: 'jobtypes', i: '🏷️', l: 'ประเภทงาน', c: 12 },
    { k: 'site', i: '🏪', l: 'ข้อมูลร้าน', c: null },
  ];

  const users = [
    { n: 'นาเดียร์', u: 'nadear', d: 'ฝ่ายขาย', c: '#FFD400', active: true },
    { n: 'ฟลุ๊ค', u: 'fluke', d: 'กราฟิก', c: '#E0F2FE', active: true },
    { n: 'ไนซ์', u: 'nice', d: 'กราฟิก', c: '#E0F2FE', active: true },
    { n: 'เลย์', u: 'lay', d: 'กราฟิก', c: '#E0F2FE', active: true },
    { n: 'เอก', u: 'ek', d: 'ผลิต', c: '#EDE9FE', active: true },
    { n: 'ดาว', u: 'daw', d: 'ผลิต', c: '#EDE9FE', active: false },
  ];

  const UsersContent = () => (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>ผู้ใช้งานในระบบ</h3>
        <button onClick={() => setShowAdd(!showAdd)} style={{ padding: '8px 16px', background: '#FFD400', border: '2px solid #0A0A0A', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '2px 2px 0 #0A0A0A', display: 'flex', alignItems: 'center', gap: 6 }}>
          ➕ เพิ่มผู้ใช้
        </button>
      </div>

      {showAdd && (
        <div style={{ background: '#FFFEF0', border: '2px solid #0A0A0A', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
            {['ชื่อ-นามสกุล', 'Username', 'แผนก'].map(p => (
              <div key={p}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{p}</label>
                <input style={{ width: '100%', border: '2px solid #0A0A0A', borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', background: '#FFFFFF', outline: 'none', boxSizing: 'border-box' }} placeholder={`กรอก${p}`} />
              </div>
            ))}
            <button onClick={() => setShowAdd(false)} style={{ padding: '10px 14px', background: '#0A0A0A', color: '#FFD400', border: '2px solid #0A0A0A', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>บันทึก ✓</button>
          </div>
        </div>
      )}

      <div style={{ border: '2px solid #0A0A0A', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '44px 1fr 80px 44px' : '44px 1.5fr 1fr 1fr 110px 44px', background: '#0A0A0A', color: '#FFD400', fontSize: 11, fontWeight: 800 }}>
          {(isMobile ? ['', 'ชื่อ', 'แผนก', ''] : ['', 'ชื่อ', 'Username', 'แผนก', 'สถานะ', '']).map((h, i) => (
            <div key={i} style={{ padding: '10px 12px' }}>{h}</div>
          ))}
        </div>
        {users.map((u, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: isMobile ? '44px 1fr 80px 44px' : '44px 1.5fr 1fr 1fr 110px 44px', borderTop: '1px solid #E5E5E5', alignItems: 'center', background: i % 2 ? '#FAFAFA' : '#FFFFFF' }}>
            <div style={{ padding: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 999, background: u.c, border: '2px solid #0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>{u.n[0]}</div>
            </div>
            <div style={{ padding: 12, fontSize: 14, fontWeight: 700 }}>{u.n}</div>
            {!isMobile && <div style={{ padding: 12, fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: '#525252' }}>{u.u}</div>}
            <div style={{ padding: 12, fontSize: 13 }}>{u.d}</div>
            {!isMobile && (
              <div style={{ padding: 12 }}>
                <span style={{ background: u.active ? '#DCFCE7' : '#F4F4F4', color: u.active ? '#166534' : '#737373', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{u.active ? '● Active' : '○ Inactive'}</span>
              </div>
            )}
            <div style={{ padding: 12, fontSize: 18, color: '#A3A3A3', cursor: 'pointer', textAlign: 'center' }}>⋮</div>
          </div>
        ))}
      </div>
    </>
  );

  const PlaceholderContent = ({ t }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, gap: 12, color: '#A3A3A3' }}>
      <div style={{ fontSize: 52 }}>{t.i}</div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{t.l}</div>
      <div style={{ fontSize: 13 }}>ส่วนนี้อยู่ระหว่างพัฒนา</div>
    </div>
  );

  const current = settingTabs.find(t => t.k === tab);

  return (
    <AppLayout>
      <ProtoTopBar breadcrumb="SETTING · ตั้งค่า" title="ตั้งค่า" subtitle="จัดการผู้ใช้, ประเภทงาน, ราคา" />

      {/* Mobile tab bar */}
      {isMobile && (
        <div style={{ display: 'flex', borderBottom: '2px solid #0A0A0A', background: '#FFFFFF', overflowX: 'auto', flexShrink: 0 }}>
          {settingTabs.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{ padding: '10px 14px', background: tab === t.k ? '#FFD400' : '#FFFFFF', border: 'none', borderBottom: tab === t.k ? '3px solid #0A0A0A' : '3px solid transparent', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{t.i} {t.l}</button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '200px 1fr', gap: 20, padding: 24, alignItems: 'start' }}>
        {/* Desktop left nav */}
        {!isMobile && (
          <div style={{ background: '#FFFFFF', border: '2px solid #0A0A0A', borderRadius: 10, padding: 8, boxShadow: '3px 3px 0 #0A0A0A' }}>
            {settingTabs.map((it, i) => (
              <div key={i} onClick={() => setTab(it.k)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 6, background: tab === it.k ? '#FFD400' : 'transparent', border: tab === it.k ? '2px solid #0A0A0A' : '2px solid transparent', marginBottom: 4, cursor: 'pointer', fontWeight: tab === it.k ? 800 : 600, fontSize: 13 }}>
                <span>{it.i}</span>
                <span style={{ flex: 1 }}>{it.l}</span>
                {it.c && <span style={{ fontSize: 11, color: '#737373', fontFamily: 'JetBrains Mono, monospace' }}>{it.c}</span>}
              </div>
            ))}
          </div>
        )}

        <div style={{ background: '#FFFFFF', border: '2px solid #0A0A0A', borderRadius: 10, padding: 22, boxShadow: '3px 3px 0 #0A0A0A' }}>
          {tab === 'users' ? <UsersContent /> : <PlaceholderContent t={current} />}
        </div>
      </div>
    </AppLayout>
  );
};

Object.assign(window, { ProtoSettingScreen });
