export const QrCodeAnotherSite = (siteName: string) => {
    return {
        header: "แจ้งเตือน",
        message: `อุปกรณ์นี้อยู่ในหน่วยงาน ${siteName} กดยืนยันเพื่อเปลี่ยนหน่วยงาน`
    }
}
export const QrCodeNoPermision = () => {
    return {
        header: "แจ้งเตือน",
        message: `คุณไม่มีสิทธิในหน่วยงานนี้`
    }
}
export const sendOTPverify = (phone: string) => {
    return {
        header: "ยืนยันการส่งรหัส OTP",
        message: `รหัส OTP จะถูกส่งไปที่เบอร์ ${phone} กรุณากรอกรหัส OTP เพื่อเข้าสู่ระบบ`
    }
}
// เบอร์โทรศัพท์ไม่ถูกต้อง
export const sendOTPverifyFail = () => {
    return {
        header: "เกิดข้อผิดพลาด",
        message: "กรุณาทำรายการใหม่อีกครั้ง"
    }
}
// รหัส OTP ไม่ถูกต้อง
export const InvalidOTP = () => {
    return {
        header: "แจ้งเตือน",
        message: "รหัส OTP ไม่ถูกต้อง"
    }
}
export const UserSuspended = () => {
    return {
        header: "แจ้งเตือน",
        message: "บัญชีผู้ใช้งานถูกระงับ กรุณาติดต่อผู้ดูแลระบบ"
    }
}
export const UserDeleted = () => {
    return {
        header: "แจ้งเตือน",
        message: "บัญชีผู้ใช้งานถูกลบ กรุณาติดต่อผู้ดูแลระบบ"
    }
}

// signOut
export const signOut = () => {
    return {
        header: "ออกจากระบบ",
        message: "กดยืนยันเพื่อออกจากระบบ"
    }
}
// EquipmentNotFound
export const EquipmentNotFound = () => {
    return {
        header: "ไม่พบอุปกรณ์ในโรงพยาบาลที่คุณเลือก",
        message: "เปลี่ยนโรงพยาบาลและลองอีกครั้ง"
    }
}
// SameRoom 
export const SameRoom = () => {
    return {
        header: "เพิ่มห้องไม่สำเร็จ",
        message: "คุณมีห้องนี้อยู่แล้ว"
    }
}
//AddRoomSuccess
export const AddRoomSuccess = () => {
    return {
        header: "แจ้งเตือน",
        message: "เพิ่มห้องสำเร็จ"
    }
}
// inputInvalid
export const inputInvalid = () => {
    return {
        header: "แจ้งเตือน",
        message: "กรุณากรอกข้อมูลให้ครบถ้วน"
    }
}
//EquipmentNoChange
export const EquipmentNoChange = () => {
    return {
        header: "แจ้งเตือน",
        message: "ข้อมูลไม่มีการเปลี่ยนแปลง"
    }
}
// ไม่มีข้อมูลผู้ใช้งาน กรุณาตรวจสอบเบอร์โทรศัพท์
export const NoUserData = () => {
    return {
        header: "ไม่มีข้อมูลผู้ใช้งาน",
        message: "กรุณาตรวจสอบเบอร์โทรศัพท์"
    }
}

// ถูกระงับสิทธิ์การใช้งาน หากมีข้อสงสัย กรุณาติดต่อผู้ดูแลระบบของหน่วยงาน
export const accountSuspended = () => {
    return {
        header: "ถูกระงับสิทธิ์การใช้งาน",
        message: "หากมีข้อสงสัย กรุณาติดต่อผู้ดูแลระบบของหน่วยงาน"
    }
}

