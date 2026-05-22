// Create Worksheet — Interactive stepper form

const ProtoCreateScreen = () => {
  const { navigate } = useNav();
  const isMobile = useIsMobile();
  const [step, setStep] = React.useState(1);
  const [urgent, setUrgent] = React.useState(false);
  const [contact, setContact] = React.useState('💬 ไลน์');
  const steps = ['ลูกค้า', 'รายการงาน', 'ชำระเงิน', 'ไฟล์แนบ'];

  const StepDot = ({ num, label, status }) => {
    const isDone = status === 'done', isActive = status === 'active';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: 999, border: '2px solid #0A0A0A', background: isActive ? '#FFD400' : isDone ? '#0A0A0A' : '#FFFFFF', color: isDone ? '#FFD400' : '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, boxShadow: isActive ? '2px 2px 0 #0A0A0A' : 'none', flexShrink: 0 }}>
          {isDone ? '✓' : num}
        </div>
        {!isMobile && <span style={{ fontSize: 13, fontWeight: isActive ? 800 : 600, color: isDone ? '#737373' : isActive ? '#0A0A0A' : '#A3A3A3', whiteSpace: 'nowrap' }}>{label}</span>}
      </div>
    );
  };

  const getStatus = (n) => n < step ? 'done' : n === step ? 'active' : 'todo';
  const progress = ((step - 1) / (steps.length - 1)) * 100;

  const UrgencyStrip = () => (
    <div style={{ background: '#0A0A0A', color: '#FFD400', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, letterSpacing: 1 }}>JOB PRIORITY</div>
        <div style={{ fontSize: 15, fontWeight: 800 }}>งานปกติ หรือ งานด่วน?</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setUrgent(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '2px solid #FFD400', background: !urgent ? '#FFD400' : 'transparent', color: !urgent ? '#0A0A0A' : '#FFD400', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>งานปกติ</button>
        <button onClick={() => setUrgent(true)} style={{ padding: '8px 16px', borderRadius: 8, border: '2px solid #E63946', background: urgent ? '#E63946' : 'transparent', color: '#FFD400', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: urgent ? '2px 2px 0 #FFD400' : 'none' }}>⚡ ด่วน</button>
      </div>
    </div>
  );

  const Step1 = () => (
    <div style={{ background: '#FFFFFF', border: '2px solid #0A0A0A', borderRadius: 10, padding: 22, boxShadow: '3px 3px 0 #0A0A0A' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: '#FFD400', border: '2px solid #0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>1</div>
        <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>ข้อมูลลูกค้า · Customer Info</h3>
        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: '#16A34A' }}>✓ ครบถ้วน</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '180px 1fr 1fr', gap: 14, marginBottom: 14 }}>
        {[['เลขใบงาน', 'NK-2604-019', true, true], ['ผู้ขาย *', 'นาเดียร์', false, false], ['วันรับงาน', '📅 29 เม.ย. 2026', false, false]].map(([l, v, disabled, mono]) => (
          <div key={l}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>{l}</label>
            <div style={{ border: '2px solid #0A0A0A', borderRadius: 8, padding: '10px 12px', background: disabled ? '#F4F4F4' : '#FFFFFF', fontSize: 14, fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit', fontWeight: 700, color: disabled ? '#737373' : '#0A0A0A' }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 8 }}>ช่องทางติดต่อ *</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['🏪 หน้าร้าน', '📘 เฟสบุ๊ค', '💬 ไลน์', '📧 อีเมล'].map(c => (
            <button key={c} onClick={() => setContact(c)} style={{ padding: '8px 14px', borderRadius: 8, border: '2px solid #0A0A0A', background: contact === c ? '#FFD400' : '#FFFFFF', color: '#0A0A0A', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: contact === c ? '2px 2px 0 #0A0A0A' : 'none' }}>{c}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 14 }}>
        {[['ชื่อลูกค้า *', 'ร้านกาแฟ Brown Bean'], ['ID ไลน์', '@brownbean'], ['เบอร์โทร', '📞 081-234-5678']].map(([l, v]) => (
          <div key={l}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>{l}</label>
            <div style={{ border: '2px solid #0A0A0A', borderRadius: 8, padding: '10px 12px', background: '#FFFFFF', fontSize: 14, fontWeight: 600 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const Step2 = () => (
    <div style={{ background: '#FFFFFF', border: '2px solid #0A0A0A', borderRadius: 10, padding: 22, boxShadow: '3px 3px 0 #0A0A0A' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: '#FFD400', border: '2px solid #0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>2</div>
        <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>รายการงาน · Work Items</h3>
        <span style={{ background: '#FFFEF0', border: '1.5px solid #0A0A0A', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, marginLeft: 8 }}>2 รายการ</span>
        <button style={{ marginLeft: 'auto', padding: '6px 12px', background: '#0A0A0A', color: '#FFD400', border: '2px solid #0A0A0A', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>➕ เพิ่มรายการ</button>
      </div>
      <div style={{ border: '2px solid #0A0A0A', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 90px' : '36px 2fr 1.2fr 1.2fr 80px 100px 44px', background: '#0A0A0A', color: '#FFD400', fontSize: 11, fontWeight: 800 }}>
          {(isMobile ? ['ประเภท', 'ราคา'] : ['#', 'ประเภท', 'ขนาด', 'ตัวเลือก', 'จำนวน', 'ราคา', '']).map((h, i) => <div key={i} style={{ padding: '10px 12px' }}>{h}</div>)}
        </div>
        {[{ i: 1, type: 'สติกเกอร์ PVC', size: '10×10 ซม.', opt: 'ตัดตามรูป', qty: 500, price: 1500 }, { i: 2, type: 'สติกเกอร์ฉลาก', size: '5×8 ซม.', opt: 'เคลือบเงา', qty: 1000, price: 1800 }].map((row, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 90px' : '36px 2fr 1.2fr 1.2fr 80px 100px 44px', borderTop: '1px solid #E5E5E5', alignItems: 'center' }}>
            {!isMobile && <div style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#737373', fontFamily: 'JetBrains Mono, monospace' }}>{row.i}</div>}
            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{row.type}</div>
              {isMobile && <div style={{ fontSize: 11, color: '#737373', fontFamily: 'JetBrains Mono, monospace' }}>{row.size} · {row.qty.toLocaleString()} ชิ้น</div>}
            </div>
            {!isMobile && <div style={{ padding: '10px 12px', fontSize: 13, color: '#525252', fontFamily: 'JetBrains Mono, monospace' }}>{row.size}</div>}
            {!isMobile && <div style={{ padding: '10px 12px', fontSize: 13, color: '#525252' }}>{row.opt}</div>}
            {!isMobile && <div style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{row.qty.toLocaleString()}</div>}
            <div style={{ padding: '10px 12px', fontSize: 14, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>฿{row.price.toLocaleString()}</div>
            {!isMobile && <div style={{ padding: '10px 12px', display: 'flex', gap: 6, color: '#A3A3A3', fontSize: 14 }}><span style={{ cursor: 'pointer' }}>✏️</span><span style={{ cursor: 'pointer' }}>🗑</span></div>}
          </div>
        ))}
        <div style={{ padding: '12px 16px', background: '#FFFEF0', borderTop: '2px solid #0A0A0A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#525252' }}>รวม 2 รายการ · 1,500 ชิ้น</span>
          <span style={{ fontSize: 18, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace' }}>฿3,300</span>
        </div>
      </div>
    </div>
  );

  const Step3 = () => (
    <div style={{ background: '#FFFFFF', border: '2px solid #0A0A0A', borderRadius: 10, padding: 22, boxShadow: '3px 3px 0 #0A0A0A' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: '#FFD400', border: '2px solid #0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>3</div>
        <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>การชำระเงิน · Payment</h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 14 }}>
        {[['ยอดรวม', '3,300', '฿'], ['มัดจำ', '1,000', '฿'], ['คงเหลือ', '2,300', '฿'], ['ช่องทาง', 'โอนเงิน', '']].map(([l, v, p]) => (
          <div key={l}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>{l}</label>
            <div style={{ border: '2px solid #0A0A0A', borderRadius: 8, padding: '10px 12px', background: '#FFFFFF', fontSize: 14, fontFamily: p === '฿' ? 'JetBrains Mono, monospace' : 'inherit', fontWeight: 700 }}>{p}{v}{p === '' ? ' ▾' : ''}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const Step4 = () => (
    <div style={{ background: '#FFFFFF', border: '2px solid #0A0A0A', borderRadius: 10, padding: 22, boxShadow: '3px 3px 0 #0A0A0A' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: '#FFD400', border: '2px solid #0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>4</div>
        <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>ไฟล์แนบ · Attachments</h3>
      </div>
      <div style={{ border: '3px dashed #D4D4D4', borderRadius: 10, padding: 40, textAlign: 'center', background: '#FAFAFA' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📎</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>ลากไฟล์มาวางที่นี่</div>
        <div style={{ fontSize: 13, color: '#737373', marginBottom: 20 }}>รองรับ JPG, PNG, PDF, AI, PSD (สูงสุด 50MB)</div>
        <button style={{ padding: '10px 22px', background: '#FFD400', border: '2px solid #0A0A0A', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '3px 3px 0 #0A0A0A' }}>เลือกไฟล์</button>
      </div>
    </div>
  );

  const NavButtons = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 20, borderTop: '2px dashed #D4D4D4' }}>
      <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate('home')} style={{ padding: '10px 18px', background: '#FFFFFF', border: '2px solid #0A0A0A', borderRadius: 8, boxShadow: '2px 2px 0 #0A0A0A', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        ← {step > 1 ? 'ย้อนกลับ' : 'ยกเลิก'}
      </button>
      {step < 4 ? (
        <button onClick={() => setStep(s => s + 1)} style={{ padding: '10px 24px', background: '#FFD400', color: '#0A0A0A', border: '2px solid #0A0A0A', borderRadius: 8, boxShadow: '3px 3px 0 #0A0A0A', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>ถัดไป →</button>
      ) : (
        <button onClick={() => navigate('home')} style={{ padding: '10px 24px', background: '#0A0A0A', color: '#FFD400', border: '2px solid #0A0A0A', borderRadius: 8, boxShadow: '3px 3px 0 #FFD400', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>✓ บันทึกใบงาน</button>
      )}
    </div>
  );

  return (
    <AppLayout>
      <ProtoTopBar
        breadcrumb="CREATE · สร้างใบงานใหม่"
        title="สร้างใบงาน"
        onBack={() => navigate('home')}
        right={
          <span style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: '#16A34A', display: 'inline-block' }} />
            {!isMobile && 'บันทึกอัตโนมัติ'}
          </span>
        }
      />
      {/* Stepper bar */}
      <div style={{ padding: '12px 24px', borderBottom: '2px solid #0A0A0A', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 20, flexShrink: 0 }}>
        {steps.map((label, i) => (
          <React.Fragment key={i}>
            <StepDot num={i + 1} label={label} status={getStatus(i + 1)} />
            {i < steps.length - 1 && <div style={{ flex: isMobile ? '0 0 16px' : 1, height: 2, background: i + 1 < step ? '#0A0A0A' : '#D4D4D4', minWidth: 10, maxWidth: isMobile ? 16 : 40 }} />}
          </React.Fragment>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ width: 80, height: 6, background: '#F4F4F4', borderRadius: 999, border: '1.5px solid #0A0A0A', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ width: `${progress}%`, height: '100%', background: '#FFD400' }} />
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <UrgencyStrip />
        {step === 1 && <Step1 />}
        {step === 2 && <Step2 />}
        {step === 3 && <Step3 />}
        {step === 4 && <Step4 />}
        <NavButtons />
      </div>
    </AppLayout>
  );
};

Object.assign(window, { ProtoCreateScreen });
