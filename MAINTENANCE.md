# Maintenance Mode

เว็บไซต์ใช้ `index.html` เป็นตัว router:
- `maintenance.json` = false → เปิด `game.html`
- `maintenance.json` = true → เปิด `maintenance.html`

## เปิด/ปิดแบบคลิกเดียว
ไปที่ GitHub:
1. Actions
2. เลือก **Maintenance Mode**
3. กด **Run workflow**
4. เลือก `ON` เพื่อปิดปรับปรุง หรือ `OFF` เพื่อเปิดเกม
5. กด **Run workflow**

GitHub Actions จะ commit `maintenance.json` ให้อัตโนมัติ แล้ว GitHub Pages จะ deploy ตามปกติ

## ทดสอบ
- `/?maintenanceTest=1` จำลองหน้า Maintenance
- `/?testUpdate=1` เข้าเกมและจำลองว่ามี Update ใหม่
