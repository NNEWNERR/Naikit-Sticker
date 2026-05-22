// Home / Dashboard — Kanban (desktop) + List (mobile)

const ProtoKanbanCard = ({ ws, onOpen }) => (
  <div onClick={() => onOpen(ws)}
    style={{ background: '#FFFFFF', border: '2px solid #0A0A0A', borderRadius: 8, padding: 12, marginBottom: 10, boxShadow: '2px 2px 0 #0A0A0A', cursor: 'pointer' }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-1px,-1px)'; e.currentTarget.style.boxShadow = '3px 3px 0 #0A0A0A'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '2px 2px 0 #0A0A0A'; }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: '#737373' }}>{ws.serial_number}</span>
      {ws.is_urgent && <UrgentBadge />}
    </div>
    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 5, lineHeight: 1.3 }}>{ws.customer_name}</div>
    <div style={{ fontSize: 12, color: '#525252', marginBottom: 10 }}>
      {ws.items[0].type} · {ws.items[0].qty.toLocaleString()} ชิ้น
      {ws.items.length > 1 && <span style={{ color: '#A3A3A3' }}> +{ws.items.length - 1}</span>}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px dashed #D4D4D4' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 22, height: 22, borderRadius: 999, background: '#FFD400', border: '1.5px solid #0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{ws.seller_name[0]}</div>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#525252' }}>{ws.seller_name}</span>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>฿{ws.total.toLocaleString()}</span>
    </div>
  </div>
);

const ProtoKanbanColumn = ({ status, items, onOpen }) => {
  const c = STATUS_COLORS[status];
  return (
    <div style={{ width: 240, flexShrink: 0, background: '#FAFAFA', borderRadius: 10, border: '2px solid #0A0A0A', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 285px)' }}>
      <div style={{ padding: '10px 12px', borderBottom: '2px solid #0A0A0A', background: c.bg, borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: c.dot }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: c.fg }}>{status}</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color: c.fg, background: '#FFFFFF', padding: '1px 8px', borderRadius: 999, border: `1.5px solid ${c.fg}` }}>{items.length}</span>
      </div>
      <div style={{ padding: 10, overflowY: 'auto', flex: 1 }}>
        {items.map((ws, i) => <ProtoKanbanCard key={i} ws={ws} onOpen={onOpen} />)}
        {items.length === 0 && <div style={{ padding: '28px 10px', textAlign: 'center', fontSize: 12, color: '#A3A3A3', fontWeight: 500 }}>ไม่มีงาน</div>}
      </div>
    </div>
  );
};

const ProtoHomeScreen = () => {
  const { navigate } = useNav();
  const isMobile = useIsMobile();
  const [teamFilter, setTeamFilter] = React.useState('all');
  const [mobileTab, setMobileTab] = React.useState('all');
  const ws = window.MOCK_WORKSHEETS;
  const openWs = (worksheet) => navigate('info', { ws: worksheet });
  const byStatus = (s) => ws.filter(w => w.status === s);

  const mobileTabs = [
    { k: 'all', l: 'ทั้งหมด' },
    { k: 'รอออกแบบ', l: 'รอแบบ' },
    { k: 'กำลังผลิต', l: 'ผลิต' },
    { k: 'รอส่งมอบ', l: 'ส่งมอบ' },
  ];
  const mobileFiltered = mobileTab === 'all' ? ws : ws.filter(w => w.status === mobileTab);

  return (
    <AppLayout>
      <ProtoTopBar
        breadcrumb="DASHBOARD · ใบงานวันนี้"
        title="ใบงานวันนี้"
        subtitle="อาทิตย์ 11 พ.ค. 2026"
        right={
          <>
            {!isMobile && (
              <div style={{ background: '#FFFFFF', border: '2px solid #0A0A0A', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#525252', boxShadow: '2px 2px 0 #0A0A0A', display: 'flex', alignItems: 'center', gap: 8 }}>
                🔍 <span style={{ color: '#A3A3A3' }}>ค้นหา...</span>
                <kbd style={{ fontSize: 11, padding: '1px 6px', border: '1.5px solid #0A0A0A', borderRadius: 4, background: '#F4F4F4' }}>⌘K</kbd>
              </div>
            )}
            <button onClick={() => navigate('create')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: isMobile ? '8px 12px' : '10px 18px', background: '#0A0A0A', color: '#FFD400', border: '2px solid #0A0A0A', borderRadius: 8, boxShadow: '3px 3px 0 #FFD400', fontSize: isMobile ? 13 : 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
              ➕ {!isMobile && 'สร้างใบงาน'}
            </button>
          </>
        }
      />

      {isMobile ? (
        <>
          {/* Mobile stats */}
          <div style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, background: '#FAFAFA' }}>
            {[
              { l: 'ทั้งหมด', v: ws.length, c: '#FFFFFF' },
              { l: 'ด่วน ⚡', v: ws.filter(w => w.is_urgent).length, c: '#FFE9E9' },
              { l: 'ส่งแล้ว', v: ws.filter(w => w.status === 'ส่งมอบแล้ว').length, c: '#DCFCE7' },
            ].map((s, i) => (
              <div key={i} style={{ background: s.c, border: '2px solid #0A0A0A', borderRadius: 8, padding: '10px 8px', boxShadow: '2px 2px 0 #0A0A0A', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#525252', marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
          {/* Mobile filter tabs */}
          <div style={{ padding: '0 14px 10px', display: 'flex', gap: 6, background: '#FAFAFA' }}>
            {mobileTabs.map(t => (
              <button key={t.k} onClick={() => setMobileTab(t.k)} style={{ padding: '6px 12px', borderRadius: 999, border: '2px solid #0A0A0A', background: mobileTab === t.k ? '#0A0A0A' : '#FFFFFF', color: mobileTab === t.k ? '#FFD400' : '#0A0A0A', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{t.l}</button>
            ))}
          </div>
          {/* Mobile list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 14px' }}>
            {mobileFiltered.map((w, i) => (
              <div key={i} onClick={() => openWs(w)} style={{ background: '#FFFFFF', border: '2px solid #0A0A0A', borderRadius: 10, padding: 12, marginBottom: 10, boxShadow: '2px 2px 0 #0A0A0A', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: '#737373' }}>{w.serial_number}</span>
                  {w.is_urgent && <UrgentBadge />}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{w.customer_name}</div>
                <div style={{ fontSize: 12, color: '#525252', marginBottom: 8 }}>{w.items[0].type} · {w.items[0].qty.toLocaleString()} ชิ้น</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px dashed #D4D4D4' }}>
                  <StatusPill status={w.status} size="sm" />
                  <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>฿{w.total.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ padding: '18px 24px', overflow: 'auto', flex: 1 }}>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'ใบงานทั้งหมด', value: ws.length, icon: '📋', delta: '+2 จากเมื่อวาน' },
              { label: 'งานด่วน ⚡', value: ws.filter(w => w.is_urgent).length, icon: '🔥', accent: '#DC2626', delta: 'ต้องเร่ง' },
              { label: 'รอออกแบบ', value: byStatus('รอออกแบบ').length, icon: '🎨' },
              { label: 'กำลังผลิต', value: byStatus('กำลังผลิต').length, icon: '🖨️' },
              { label: 'ยอดรวม', value: `฿${(ws.reduce((s, w) => s + w.total, 0) / 1000).toFixed(1)}K`, icon: '💰', delta: '+18%' },
            ].map((s, i) => (
              <div key={i} style={{ background: '#FFFFFF', border: '2px solid #0A0A0A', borderRadius: 10, padding: 16, boxShadow: '3px 3px 0 #0A0A0A', flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#737373' }}>{s.label}</span>
                  <span style={{ fontSize: 16 }}>{s.icon}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontSize: 32, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{s.value}</div>
                  {s.delta && <div style={{ fontSize: 11, fontWeight: 700, color: s.accent || '#16A34A' }}>{s.delta}</div>}
                </div>
              </div>
            ))}
          </div>
          {/* Team filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#737373', letterSpacing: 1 }}>ทีม:</span>
            {[{ k: 'all', l: 'ทั้งหมด', c: ws.length }, { k: 'seller', l: 'ฝ่ายขาย', c: 8 }, { k: 'graphic', l: 'กราฟิก', c: 6 }, { k: 'production', l: 'ผลิต', c: 4 }].map(t => (
              <button key={t.k} onClick={() => setTeamFilter(t.k)} style={{ padding: '6px 14px', borderRadius: 999, border: '2px solid #0A0A0A', background: teamFilter === t.k ? '#0A0A0A' : '#FFFFFF', color: teamFilter === t.k ? '#FFD400' : '#0A0A0A', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t.l} <span style={{ opacity: 0.6 }}>{t.c}</span>
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button style={{ padding: '6px 14px', borderRadius: 8, border: '2px solid #0A0A0A', background: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>📅 วันนี้ ▾</button>
          </div>
          {/* Kanban */}
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
            {window.STATUS_LIST.map(s => (
              <ProtoKanbanColumn key={s.key} status={s.key} items={byStatus(s.key)} onOpen={openWs} />
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
};

Object.assign(window, { ProtoHomeScreen });
