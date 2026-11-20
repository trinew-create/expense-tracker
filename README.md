# เว็บแอปรายรับ-รายจ่ายส่วนตัว (Personal Expense Tracker)

เว็บแอปจดรายรับ-รายจ่ายส่วนตัวภาษาไทย (สกุลเงินบาท ฿) แบบ **Mobile-First** รองรับ **PWA** โฮสต์ฟรีบน **GitHub Pages** และเก็บข้อมูลใน **Google Sheets** ส่วนตัวผ่าน **Google Apps Script**

## โครงสร้างไฟล์

- `backend/Code.gs` — โค้ด Google Apps Script สำหรับฝั่ง Backend
- `index.html` — หน้าเว็บแอปหลัก (HTML + Tailwind CSS)
- `styles.css` — สไตล์เฉพาะ (Bottom Sheet, Modal Animation, Safe Area, Accessibility)
- `app.js` — ลอจิกฝั่ง Frontend, Local Cache, Offline Sync Queue และเชื่อมต่อ Apps Script
- `manifest.json`, `sw.js`, `icons/` — ไฟล์สำหรับติดตั้งเป็น PWA บนมือถือ

---

## ขั้นตอนที่ 1: ติดตั้งฝั่ง Backend (Google Sheets + Apps Script)

1. สร้างไฟล์ **Google Sheets** ใหม่ใน Google Drive ของคุณ (ตั้งชื่ออะไรก็ได้ เช่น `My Expense Tracker`)
2. ไปที่เมนู **Extensions (ส่วนขยาย)** → **Apps Script**
3. ลบโค้ดเดิมในไฟล์ `Code.gs` แล้วคัดลอกโค้ดทั้งหมดจาก [`backend/Code.gs`](./backend/Code.gs) มาวาง
4. แก้ไขค่า `SECRET_PIN` ด้านบนสุดของไฟล์ให้เป็นรหัสส่วนตัวของคุณ เช่น:
   ```javascript
   const SECRET_PIN = '987654';
   ```
5. กด **Save (บันทึก)**
6. กดปุ่ม **Deploy (ทำให้ใช้งานได้)** → **New deployment (การทำให้ใช้งานได้รายการใหม่)**
   - คลิกไอคอนฟันเฟืองเลือกประเภท **Web app (เว็บแอป)**
   - **Execute as (ดำเนินการในฐานะ):** `Me` (บัญชีของคุณ)
   - **Who has access (ผู้ที่มีสิทธิ์เข้าถึง):** `Anyone` (ทุกคน) *(จำเป็นเพื่อให้ GitHub Pages เรียกใช้งานได้ โดยมีการป้องกันด้วย `SECRET_PIN`)*
   - กด **Deploy** และกดอนุญาตสิทธิ์ (Authorize access) ตามขั้นตอนของ Google
7. คัดลอก **Web app URL** ที่ลงท้ายด้วย `/exec` เก็บไว้

> ชีตชื่อ `Transactions` พร้อมหัวตาราง (`id`, `date`, `type`, `category`, `amount`, `note`, `updated_at`) จะถูกสร้างให้อัตโนมัติเมื่อมีการเชื่อมต่อครั้งแรก

---

## ขั้นตอนที่ 2: โฮสต์ฝั่ง Frontend บน GitHub Pages

1. สร้าง Repository ใหม่บน GitHub (Public หรือ Private ก็ได้หากรองรับ Pages)
2. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้นไปที่ branch `main`
3. ไปที่ **Settings** → **Pages**
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` / `/ (root)` แล้วกด **Save**
4. รอประมาณ 1–2 นาที จะได้ลิงก์เว็บแอป เช่น `https://<username>.github.io/<repo-name>/`

---

## ขั้นตอนที่ 3: ตั้งค่าครั้งแรกและติดตั้งลงมือถือ (PWA)

1. เปิดเว็บแอปจากลิงก์ GitHub Pages (หน้าตั้งค่าจะเด้งขึ้นมาอัตโนมัติในครั้งแรก หรือแตะปุ่มฟันเฟืองมุมขวาบน)
2. วาง **Apps Script Web App URL** และกรอก **PIN** ที่ตั้งไว้ใน `Code.gs`
3. กด **บันทึกและซิงก์ข้อมูล** (ค่าจะถูกบันทึกใน `LocalStorage` ไม่ต้องกรอกซ้ำ)
4. **เพิ่มลงหน้าจอโฮม (PWA):**
   - **iOS (Safari):** กดปุ่ม **Share** → **Add to Home Screen (เพิ่มไปยังหน้าจอโฮม)**
   - **Android (Chrome):** กดเมนู **⋮** → **Install app / Add to Home screen**

---

## หมายเหตุเมื่อแก้ไขโค้ด `Code.gs` ภายหลัง

หากมีการแก้ไขโค้ดใน Apps Script (เช่น เปลี่ยน `SECRET_PIN`) ให้กด **Deploy → Manage deployments → กดรูปดินสอ → เลือก Version: New version → กด Deploy** เพื่อให้ URL เดิมใช้โค้ดเวอร์ชันล่าสุด
