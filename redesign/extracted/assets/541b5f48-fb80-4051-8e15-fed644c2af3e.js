// Worksheet Info, Report, Diary screens

// ── Worksheet Info ───────────────────────────────────────────
const ProtoInfoScreen = () => {
  const { navigate, selectedWs } = useNav();
  const isMobile = useIsMobile();
  const ws = selectedWs || window.MOCK_WORKSHEETS[2];
  const [wsStatus, setWsStatus] = React.useState(ws.status);
  const [mobilePanel, setMobilePanel] = React.useState('sales');

  const confirmNext = () => {
    const list = window.STATUS_LIST;
    const idx = list.findIndex(s => s.key === wsStatus);
    if (idx < list.length - 1) setWsStatus(list[idx + 1].key);
  };

  // Status Timeline
  const Timeline = () => {
    const list = window.STATUS_LIST;
    const idx = list.findIndex(s => s.key === wsStatus);
    return (
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', background: '#FFFFFF', borderBottom: '2px solid #0A0A0A', overflowX: 'auto', flexShrink: 0, gap: 0 }}>
        {list.map((s, i) => {
          const done = i < idx, active = i === idx;
          return (
            <React.Fragment key={s.key}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 58 }}>
                <div style={{ width: 26, height: 26, borderRadius: 999, border: '2px solid #0A0A0A', background: done ? '#0A0A0A' : active ? '#FFD400' : '#FFFFFF', color: done ? '#FFD400' : '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, boxShadow: active ? '2px 2px 0 #0A0A0A' : 'none' }}>{done ? '✓' : i + 1}</div>
                <span style={{ fontSize: 9, fontWeight: active ? 800 : 600, color: active ? '#0A0A0A' : '#A3A3A3', textAlign: 'center', whiteSpace: 'nowrap' }}>{s.short}</span>
              </div>
              {i < list.length - 1 && <div style={{ flex: 1, height: 2, background: i < idx ? '#0A0A0A' : '#E5E5E5', marginTop: -14, minWidth: 8 }} />}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const Row = ({ label, value, mono, color }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px dashed #E5E5E5', fontSize: 13 }}>
      <span style={{ color: '#737373', fontWeight: 600 }}>{label}</span>
      <span style={{ color: color || '#0A0A0A', fontWeight: 700, fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit' }}>{value}</span>
    </div>
  );

  const Panel = ({ title, icon, accent, status, children }) => (
    <div style={{ background: '#FFFFFF', border: '2px solid #0A0A0A', borderRadius: 10, boxShadow: '3px 3px 0 #0A0A0A', overflow: 'hidden' }}>
      <div style={{ background: accent || '#FFD400', borderBottom: '2px solid #0A0A0A', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.65, letterSpacing: 1 }}>DEPARTMENT</div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{title}</div>
        </div>
        {status}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );

  const salesContent = (
    <Panel title="ฝ่ายขาย" icon="💼" accent="#FFD400" status={<StatusPill status={wsStatus} size="sm" />}>
      <Row label="ผู้ขาย" value={ws.seller_name} />
      <Row label="ช่องทาง" value={ws.contact} />
      <Row label="เบอร์โทร" value={ws.phone || '—'} mono />
      <Row label="วันสั่งงาน" value={ws.created_at.slice(0, 10)} mono />
      <Row label="วันรับงาน" value={ws.date_of_acceptance} mono color="#DC2626" />
      <div style={{ marginTop: 12, padding: 12, background: '#FFFEF0', border: '1.5px solid #0A0A0A', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span style={{ color: '#737373' }}>ยอดรวม</span><span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>฿{ws.total.toLocaleString()}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}><span style={{ color: '#737373' }}>มัดจำ</span><span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>฿{ws.deposit.toLocaleString()}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid #D4D4D4' }}>
          <span style={{ fontWeight: 700 }}>คงเหลือ</span>
          <span style={{ fontSize: 18, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace' }}>฿{(ws.total - ws.deposit).toLocaleString()}</span>
        </div>
      </div>
    </Panel>
  );

  const graphicContent = (
    <Panel title="ฝ่ายกราฟิก" icon="🎨" accent="#E0F2FE">
      <Row label="ผู้ออกแบบ" value={ws.design_by !== '-' ? ws.design_by : 'ยังไม่มอบหมาย'} color={ws.design_by === '-' ? '#A3A3A3' : undefined} />
      <Row label="แก้ไขแล้ว" value="2 ครั้ง" mono color="#CA8A04" />
      <Row label="ส่งแบบล่าสุด" value="25 เม.ย. 11:30" mono />
      <div style={{ marginTop: 12, padding: 12, background: '#FFFEF0', border: '2px dashed #CA8A04', borderRadius: 8, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>⏳ รอลูกค้าคอนเฟิร์ม</div>
        <div style={{ fontSize: 12, color: '#525252', marginBottom: 10 }}>ส่งแบบให้ลูกค้าตรวจ · 4 ชั่วโมงที่แล้ว</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={confirmNext} style={{ padding: '8px 14px', background: '#FFD400', border: '2px solid #0A0A0A', borderRadius: 6, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '2px 2px 0 #0A0A0A' }}>✓ คอนเฟิร์ม</button>
          <button style={{ padding: '8px 14px', background: '#FFFFFF', border: '2px solid #0A0A0A', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>ส่งแก้ไข</button>
        </div>
      </div>
      <ImgPlaceholder w="100%" h={110} label="Design V3" />
    </Panel>
  );

  const productionContent = (
    <Panel title="ฝ่ายผลิต" icon="📦" accent="#EDE9FE">
      <Row label="ผู้พิมพ์งาน" value="—" color="#A3A3A3" />
      <Row label="วันส่งมอบ" value={ws.date_of_acceptance} mono />
      <div style={{ marginTop: 12, padding: 12, background: '#F4F4F4', borderRadius: 8, fontSize: 12, color: '#737373', textAlign: 'center', fontWeight: 600 }}>รอเริ่มหลังคอนเฟิร์มแบบ</div>
    </Panel>
  );

  const panels = { sales: salesContent, graphic: graphicContent, production: productionContent };
  const panelTabs = [{ k: 'sales', l: '💼 ขาย' }, { k: 'graphic', l: '🎨 กราฟิก' }, { k: 'production', l: '📦 ผลิต' }];

  return (
    <AppLayout>
      <ProtoTopBar
        breadcrumb={`HOME · ${ws.serial_number}`}
        title={ws.serial_number}
        subtitle={ws.customer_name}
        onBack={() => navigate('home')}
        right={
          <>
            {!isMobile && <button style={{ padding: '8px 12px', background: '#FFFFFF', border: '2px solid #0A0A0A', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '2px 2px 0 #0A0A0A' }}>📄 PDF</button>}
            <button style={{ padding: '8px 12px', background: '#FFD400', border: '2px solid #0A0A0A', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '3px 3px 0 #0A0A0A' }}>✏️ {!isMobile && 'แก้ไข'}</button>
          </>
        }
      />
      <Timeline />
      {isMobile && (
        <div style={{ display: 'flex', borderBottom: '2px solid #0A0A0A', background: '#FFFFFF', flexShrink: 0 }}>
          {panelTabs.map(t => (
            <button key={t.k} onClick={() => setMobilePanel(t.k)} style={{ flex: 1, padding: '10px 4px', background: mobilePanel === t.k ? '#FFD400' : '#FFFFFF', border: 'none', borderBottom: mobilePanel === t.k ? '3px solid #0A0A0A' : '3px solid transparent', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t.l}</button>
          ))}
        </div>
      )}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {isMobile ? panels[mobilePanel] : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {salesContent}
            {graphicContent}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {productionContent}
              <div style={{ background: '#FFFFFF', border: '2px solid #0A0A0A', borderRadius: 10, boxShadow: '3px 3px 0 #0A0A0A', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>📝 หมายเหตุ · 3</span>
                  <button style={{ padding: '4px 10px', background: '#0A0A0A', color: '#FFD400', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+ เพิ่ม</button>
                </div>
                {[{ u: 'ไนซ์', d: '11:30', t: 'ส่งแบบ V3 ให้ลูกค้าแล้ว', c: '#E0F2FE' }, { u: 'นาเดียร์', d: '10:15', t: 'ลูกค้าขอเปลี่ยนสีพื้นเป็นดำ', c: '#FFE9E9' }, { u: 'ไนซ์', d: 'เมื่อวาน', t: 'เริ่มออกแบบ V1', c: '#DCFCE7' }].map((cm, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, paddingBottom: 10, borderBottom: i < 2 ? '1px dashed #E5E5E5' : 'none' }}>
                    <div style={{ width: 26, height: 26, borderRadius: 999, background: cm.c, border: '1.5px solid #0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{cm.u[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{cm.u}</span>
                        <span style={{ fontSize: 11, color: '#A3A3A3' }}>{cm.d}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#525252', marginTop: 2 }}>{cm.t}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

// ── Report ───────────────────────────────────────────────────
const ProtoReportScreen = () => {
  const { navigate } = useNav();
  const isMobile = useIsMobile();
  const ws = window.MOCK_WORKSHEETS;
  const [statusFilter, setStatusFilter] = React.useState(null);
  const filtered = statusFilter ? ws.filter(w => w.status === statusFilter) : ws;

  return (
    <AppLayout>
      <ProtoTopBar breadcrumb="REPORT · รายงาน" title="รายงาน" subtitle={`${filtered.length} รายการ`}
        right={<button style={{ padding: '8px 14px', background: '#0A0A0A', color: '#FFD400', border: '2px solid #0A0A0A', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>📥 Export</button>} />

      <div style={{ padding: '18px 20px', flex: 1, overflow: 'auto' }}>
        {/* Status breakdown */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#737373', letterSpacing: 1.2, marginBottom: 8 }}>STATUS BREAKDOWN · กดเพื่อกรอง</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : 'repeat(8, 1fr)', gap: 8 }}>
            {window.STATUS_LIST.map(s => {
              const count = ws.filter(w => w.status === s.key).length;
              const c = STATUS_COLORS[s.key];
              const active = statusFilter === s.key;
              return (
                <div key={s.key} onClick={() => setStatusFilter(active ? null : s.key)} style={{ background: active ? c.bg : '#FFFFFF', border: active ? `2px solid ${c.dot}` : '2px solid #0A0A0A', borderRadius: 8, padding: '10px 10px', boxShadow: active ? `2px 2px 0 ${c.dot}` : '2px 2px 0 #0A0A0A', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: c.dot, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: c.fg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.short}</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{count}</div>
                </div>
              );
            })}
          </div>
          {statusFilter && <button onClick={() => setStatusFilter(null)} style={{ marginTop: 8, fontSize: 11, background: '#0A0A0A', color: '#FFD400', border: 'none', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>✕ ล้างตัวกรอง: {statusFilter}</button>}
        </div>
        {/* Table */}
        <div style={{ background: '#FFFFFF', border: '2px solid #0A0A0A', borderRadius: 10, overflow: isMobile ? 'auto' : 'hidden', boxShadow: '3px 3px 0 #0A0A0A' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '120px 120px 1fr 80px' : '130px 130px 1.5fr 100px 100px 100px 100px 90px 80px', background: '#0A0A0A', color: '#FFD400', fontSize: 11, fontWeight: 800, minWidth: isMobile ? 440 : 'auto' }}>
            {(isMobile ? ['สถานะ', 'เลขใบงาน', 'ลูกค้า', 'ยอด'] : ['สถานะ', 'เลขใบงาน', 'ลูกค้า', 'ผู้ขาย', 'ออกแบบ', 'วันสั่ง', 'นัดรับ', 'ยอดรวม', '']).map((h, i) => (
              <div key={i} style={{ padding: '11px 12px' }}>{h}</div>
            ))}
          </div>
          {filtered.map((w, i) => (
            <div key={i} onClick={() => navigate('info', { ws: w })}
              style={{ display: 'grid', gridTemplateColumns: isMobile ? '120px 120px 1fr 80px' : '130px 130px 1.5fr 100px 100px 100px 100px 90px 80px', borderTop: '1px solid #E5E5E5', alignItems: 'center', cursor: 'pointer', minWidth: isMobile ? 440 : 'auto', background: i % 2 ? '#FAFAFA' : '#FFFFFF' }}
              onMouseEnter={e => e.currentTarget.style.background = '#FFFEF0'}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 ? '#FAFAFA' : '#FFFFFF'}
            >
              <div style={{ padding: 11 }}><StatusPill status={w.status} size="sm" /></div>
              <div style={{ padding: 11, fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{w.serial_number}{w.is_urgent && ' ⚡'}</div>
              <div style={{ padding: 11, fontSize: 13, fontWeight: 600 }}>{w.customer_name}<div style={{ fontSize: 11, color: '#A3A3A3' }}>{w.items[0].type}</div></div>
              {!isMobile && <div style={{ padding: 11, fontSize: 13 }}>{w.seller_name}</div>}
              {!isMobile && <div style={{ padding: 11, fontSize: 13, color: w.design_by === '-' ? '#A3A3A3' : '#0A0A0A' }}>{w.design_by}</div>}
              {!isMobile && <div style={{ padding: 11, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#737373' }}>{w.created_at.slice(5, 10)}</div>}
              {!isMobile && <div style={{ padding: 11, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: w.is_urgent ? '#DC2626' : '#737373', fontWeight: w.is_urgent ? 700 : 500 }}>{w.date_of_acceptance}</div>}
              <div style={{ padding: 11, fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>฿{w.total.toLocaleString()}</div>
              {!isMobile && <div style={{ padding: 11, fontSize: 13, fontWeight: 700, color: '#0A0A0A', textDecoration: 'underline' }}>เปิด</div>}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

// ── Diary ────────────────────────────────────────────────────
const ProtoDiaryScreen = () => {
  const { navigate } = useNav();
  const isMobile = useIsMobile();
  const allWs = window.MOCK_WORKSHEETS;
  const confirmedStatuses = ['คอนเฟิร์มแล้ว', 'รอผลิต', 'กำลังผลิต', 'รอส่งมอบ', 'ส่งมอบแล้ว'];
  const ws = allWs.filter(w => confirmedStatuses.includes(w.status));
  const [filter, setFilter] = React.useState('all');
  const filtered = filter === 'all' ? ws : ws.filter(w => w.status === filter);
  const total = ws.reduce((s, w) => s + w.total, 0);

  return (
    <AppLayout>
      <ProtoTopBar breadcrumb="DIARY · สรุปงานคอนเฟิร์ม" title="สรุปงานคอนเฟิร์ม" subtitle="งานพร้อมผลิต"
        right={<button style={{ padding: '8px 14px', background: '#0A0A0A', color: '#FFD400', border: '2px solid #0A0A0A', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>📊 Export</button>} />

      <div style={{ padding: '18px 20px', flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1.5fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ background: '#0A0A0A', color: '#FFFFFF', borderRadius: 10, border: '2px solid #0A0A0A', padding: 20, boxShadow: '3px 3px 0 #FFD400' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#FFD400', letterSpacing: 1.5, marginBottom: 4 }}>SUMMARY · พ.ค. 2026</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: 44, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: '#FFD400', lineHeight: 1 }}>{ws.length}</span>
              <span style={{ fontSize: 13, color: '#A3A3A3' }}>งานคอนเฟิร์ม</span>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #525252', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#A3A3A3' }}>มูลค่ารวม</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#FFD400', fontFamily: 'JetBrains Mono, monospace' }}>฿{total.toLocaleString()}</span>
            </div>
          </div>
          <div style={{ background: '#FFFFFF', border: '2px solid #0A0A0A', borderRadius: 10, padding: 16, boxShadow: '3px 3px 0 #0A0A0A' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#737373', marginBottom: 8 }}>งานด่วน ⚡</div>
            <div style={{ fontSize: 30, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace' }}>{ws.filter(w => w.is_urgent).length}</div>
          </div>
          <div style={{ background: '#FFFFFF', border: '2px solid #0A0A0A', borderRadius: 10, padding: 16, boxShadow: '3px 3px 0 #0A0A0A' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#737373', marginBottom: 8 }}>ส่งแล้ว</div>
            <div style={{ fontSize: 30, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace' }}>{ws.filter(w => w.status === 'ส่งมอบแล้ว').length}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {[{ k: 'all', l: `ทั้งหมด (${ws.length})` }, ...confirmedStatuses.map(s => {
            const sl = window.STATUS_LIST.find(x => x.key === s);
            const c = ws.filter(w => w.status === s).length;
            return c > 0 ? { k: s, l: `${sl?.short} (${c})` } : null;
          }).filter(Boolean)].map(t => (
            <button key={t.k} onClick={() => setFilter(t.k)} style={{ padding: '6px 14px', borderRadius: 999, border: '2px solid #0A0A0A', background: filter === t.k ? '#0A0A0A' : '#FFFFFF', color: filter === t.k ? '#FFD400' : '#0A0A0A', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t.l}</button>
          ))}
        </div>

        <div style={{ background: '#FFFFFF', border: '2px solid #0A0A0A', borderRadius: 10, overflow: isMobile ? 'auto' : 'hidden', boxShadow: '3px 3px 0 #0A0A0A' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '120px 1fr 80px' : '130px 1.5fr 130px 110px 110px 100px 70px', background: '#0A0A0A', color: '#FFD400', fontSize: 11, fontWeight: 800, minWidth: isMobile ? 340 : 'auto' }}>
            {(isMobile ? ['เลขใบงาน', 'ลูกค้า', 'ยอด'] : ['เลขใบงาน', 'ลูกค้า', 'สถานะ', 'ผู้ขาย', 'ออกแบบโดย', 'ยอดรวม', '']).map((h, i) => <div key={i} style={{ padding: '10px 12px' }}>{h}</div>)}
          </div>
          {filtered.map((w, i) => (
            <div key={i} onClick={() => navigate('info', { ws: w })}
              style={{ display: 'grid', gridTemplateColumns: isMobile ? '120px 1fr 80px' : '130px 1.5fr 130px 110px 110px 100px 70px', borderTop: '1px solid #E5E5E5', alignItems: 'center', cursor: 'pointer', minWidth: isMobile ? 340 : 'auto', background: i % 2 ? '#FAFAFA' : '#FFFFFF' }}
              onMouseEnter={e => e.currentTarget.style.background = '#FFFEF0'}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 ? '#FAFAFA' : '#FFFFFF'}
            >
              <div style={{ padding: 12, fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{w.serial_number}{w.is_urgent && ' ⚡'}</div>
              <div style={{ padding: 12, fontSize: 13, fontWeight: 600 }}>{w.customer_name}<div style={{ fontSize: 11, color: '#A3A3A3' }}>{w.items[0].type}</div></div>
              {!isMobile && <div style={{ padding: 12 }}><StatusPill status={w.status} size="sm" /></div>}
              {!isMobile && <div style={{ padding: 12, fontSize: 13 }}>{w.seller_name}</div>}
              {!isMobile && <div style={{ padding: 12, fontSize: 13 }}>{w.design_by}</div>}
              <div style={{ padding: 12, fontSize: 13, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>฿{w.total.toLocaleString()}</div>
              {!isMobile && <div style={{ padding: 12, fontSize: 13, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>เปิด</div>}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

Object.assign(window, { ProtoInfoScreen, ProtoReportScreen, ProtoDiaryScreen });
