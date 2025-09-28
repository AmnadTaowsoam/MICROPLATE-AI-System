import { useState } from 'react';
import { 
  MdDashboard, 
  MdScience, 
  MdPerson, 
  MdSettings, 
  MdNotifications,
  MdSearch,
  MdQrCodeScanner,
  MdUpload,
  MdPhotoCamera,
  MdVideocam,
  MdVideocamOff,
  MdRefresh,
  MdPlayArrow,
  MdTableChart,
  MdBarChart,
  MdImage,
  MdDownload,
  MdVisibility,
  MdInfo,
  MdCheckCircle,
  MdWarning,
  MdError,
  MdArrowBack,
  MdExpandMore,
  MdExpandLess,
  MdKeyboardArrowRight
} from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  steps: string[];
  tips?: string[];
  warnings?: string[];
}

const guideSections: GuideSection[] = [
  {
    id: 'overview',
    title: 'ระบบ HAllytics Overview',
    icon: <MdDashboard className="h-6 w-6" />,
    description: 'ระบบวิเคราะห์ภาพ Microplate แบบ AI สำหรับการตรวจสอบคุณภาพและปริมาณ',
    steps: [
      'ระบบใช้ AI Model ในการวิเคราะห์ภาพ Microplate',
      'สามารถอัปโหลดหรือถ่ายภาพได้ผ่านกล้องที่เชื่อมต่อ',
      'แสดงผลการวิเคราะห์ในรูปแบบตารางและกราฟ',
      'สร้าง Interface Files สำหรับ Labware Systems',
      'จัดการข้อมูลตัวอย่างและผลการวิเคราะห์',
      'ตรวจสอบสถานะการเชื่อมต่อกล้องแบบ Real-time'
    ],
    tips: [
      'ภาพควรมีความชัดเจนและแสงสว่างเพียงพอ',
      'Microplate ควรอยู่ในตำแหน่งที่เหมาะสม',
      'ตรวจสอบข้อมูลตัวอย่างให้ครบถ้วนก่อนวิเคราะห์'
    ]
  },
  {
    id: 'dashboard',
    title: 'Dashboard - หน้าหลัก',
    icon: <MdDashboard className="h-6 w-6" />,
    description: 'หน้าสำหรับอัปโหลดภาพและเริ่มต้นการวิเคราะห์',
    steps: [
      'กรอกข้อมูล Sample Number (จำเป็น)',
      'กรอกข้อมูล Submission Number (จำเป็น)',
      'กรอกคำอธิบายเพิ่มเติม (ไม่จำเป็น)',
      'สแกน QR Code หรือกรอกข้อมูลด้วยตนเอง',
      'อัปโหลดภาพหรือถ่ายภาพ Microplate ด้วยกล้อง',
      'ตรวจสอบสถานะกล้องก่อนถ่ายภาพ',
      'กดปุ่ม "Capture" เพื่อถ่ายภาพใหม่',
      'กดปุ่ม "Run Prediction" เพื่อเริ่มวิเคราะห์'
    ],
    tips: [
      'ใช้ QR Code Scanner เพื่อความสะดวกและความแม่นยำ',
      'ตรวจสอบสถานะกล้องก่อนถ่ายภาพ (ต้องแสดง "กล้องพร้อมใช้งาน")',
      'ตรวจสอบข้อมูลก่อนกดปุ่มวิเคราะห์',
      'รอให้ระบบประมวลผลเสร็จสิ้นก่อนปิดหน้า',
      'หากกล้องไม่พร้อมใช้งาน ให้กดปุ่มรีเฟรชเพื่อตรวจสอบใหม่'
    ],
    warnings: [
      'ข้อมูล Sample Number และ Submission Number จำเป็นต้องกรอก',
      'ภาพต้องเป็นไฟล์รูปภาพที่รองรับ (JPG, PNG, etc.)',
      'ตรวจสอบให้แน่ใจว่ากล้องเชื่อมต่อและพร้อมใช้งานก่อนถ่ายภาพ',
      'หากกล้องไม่ทำงาน ให้ติดต่อผู้ดูแลระบบ'
    ]
  },
  {
    id: 'results',
    title: 'Results - ผลการวิเคราะห์',
    icon: <MdScience className="h-6 w-6" />,
    description: 'แสดงผลการวิเคราะห์แบบละเอียดพร้อมข้อมูลสถิติ',
    steps: [
      'เลือกตัวอย่างที่ต้องการดูผลลัพธ์',
      'ดูข้อมูล Overall Sample Distribution',
      'ตรวจสอบ Individual Analysis Runs',
      'ดูภาพต้นฉบับและภาพที่วิเคราะห์แล้ว',
      'สร้าง Interface Files สำหรับ Labware',
      'ดาวน์โหลด CSV Files'
    ],
    tips: [
      'คลิกที่รูปภาพเพื่อดูในขนาดเต็ม',
      'ใช้ปุ่ม Interface เพื่อสร้างไฟล์ CSV',
      'ตรวจสอบค่า Total ในแต่ละตาราง'
    ]
  },
  {
    id: 'camera-status',
    title: 'Camera Status - สถานะกล้อง',
    icon: <MdVideocam className="h-6 w-6" />,
    description: 'การตรวจสอบและจัดการสถานะการเชื่อมต่อกล้อง',
    steps: [
      'ดูสถานะกล้องใน System Logs bar',
      'ตรวจสอบสถานะข้างปุ่ม Capture',
      'กดปุ่มรีเฟรชเพื่อตรวจสอบการเชื่อมต่อใหม่',
      'ดูเวลาที่ตรวจสอบครั้งล่าสุด',
      'ตรวจสอบข้อความแสดงสถานะ'
    ],
    tips: [
      'สถานะ "กล้องพร้อมใช้งาน" = สามารถถ่ายภาพได้',
      'สถานะ "กล้องไม่พร้อมใช้งาน" = ต้องตรวจสอบการเชื่อมต่อ',
      'สถานะ "กำลังถ่ายภาพ..." = กำลังประมวลผล',
      'สถานะ "กำลังตรวจสอบ..." = กำลังตรวจสอบการเชื่อมต่อ'
    ],
    warnings: [
      'หากกล้องไม่พร้อมใช้งาน ให้ตรวจสอบ Vision Capture Service',
      'อย่าปิดหน้าเว็บขณะกำลังถ่ายภาพ',
      'หากปัญหายังคงอยู่ ให้ติดต่อผู้ดูแลระบบ'
    ]
  },
  {
    id: 'notifications',
    title: 'Notifications - การแจ้งเตือน',
    icon: <MdNotifications className="h-6 w-6" />,
    description: 'ระบบแจ้งเตือนสำหรับสถานะการทำงานของระบบ',
    steps: [
      'ดูการแจ้งเตือนใน Bell Icon (มุมขวาบน)',
      'คลิกที่การแจ้งเตือนเพื่อดูรายละเอียด',
      'Mark as Read สำหรับการแจ้งเตือนที่อ่านแล้ว',
      'ลบการแจ้งเตือนที่ไม่ต้องการ',
      'ใช้ "View all notifications" เพื่อดูทั้งหมด'
    ],
    tips: [
      'ตัวเลขสีแดงแสดงจำนวนการแจ้งเตือนใหม่',
      'การแจ้งเตือนสีเขียว = สำเร็จ',
      'การแจ้งเตือนสีเหลือง = คำเตือน',
      'การแจ้งเตือนสีแดง = ข้อผิดพลาด'
    ]
  },
  {
    id: 'profile',
    title: 'Profile - โปรไฟล์ผู้ใช้',
    icon: <MdPerson className="h-6 w-6" />,
    description: 'จัดการข้อมูลส่วนตัวและบัญชีผู้ใช้',
    steps: [
      'ดูข้อมูลโปรไฟล์ปัจจุบัน',
      'แก้ไขข้อมูลส่วนตัว',
      'เปลี่ยนรหัสผ่าน',
      'จัดการการตั้งค่าบัญชี'
    ],
    tips: [
      'อัปเดตข้อมูลให้เป็นปัจจุบัน',
      'ใช้รหัสผ่านที่แข็งแกร่ง',
      'ตรวจสอบอีเมลเป็นประจำ'
    ]
  },
  {
    id: 'settings',
    title: 'Settings - การตั้งค่า',
    icon: <MdSettings className="h-6 w-6" />,
    description: 'การตั้งค่าระบบและความชอบส่วนตัว',
    steps: [
      'เปลี่ยน Theme (Light/Dark/System)',
      'ตั้งค่าภาษา',
      'การตั้งค่าแจ้งเตือน',
      'การตั้งค่าระบบอื่นๆ'
    ],
    tips: [
      'เลือก Theme ที่เหมาะสมกับการใช้งาน',
      'ตั้งค่าแจ้งเตือนตามความต้องการ',
      'บันทึกการตั้งค่าหลังจากเปลี่ยนแปลง'
    ]
  }
];

export default function UserGuidePage() {
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState<string | null>('overview');
  const [activeTab, setActiveTab] = useState<'guide' | 'features' | 'troubleshooting'>('guide');

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const FeatureCard = ({ icon, title, description, color }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
  }) => (
    <Card className="p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <MdArrowBack className="h-5 w-5" />
              Back
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                📚 User Guide
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                คู่มือการใช้งานระบบ HAllytics อย่างละเอียด
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit">
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'guide'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              คู่มือการใช้งาน
            </button>
            <button
              onClick={() => setActiveTab('features')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'features'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              ฟีเจอร์หลัก
            </button>
            <button
              onClick={() => setActiveTab('troubleshooting')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'troubleshooting'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              แก้ไขปัญหา
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'guide' && (
          <div className="space-y-6">
            {guideSections.map((section) => (
              <Card key={section.id} className="overflow-hidden">
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-400">
                        {section.icon}
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {section.title}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                          {section.description}
                        </p>
                      </div>
                    </div>
                    {expandedSection === section.id ? (
                      <MdExpandLess className="h-6 w-6 text-gray-400" />
                    ) : (
                      <MdExpandMore className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedSection === section.id && (
                  <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="pt-6 space-y-6">
                      {/* Steps */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <MdKeyboardArrowRight className="h-5 w-5 text-blue-600" />
                          ขั้นตอนการใช้งาน
                        </h3>
                        <div className="space-y-3">
                          {section.steps.map((step, index) => (
                            <div key={index} className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                  {index + 1}
                                </span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300">
                                {step}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tips */}
                      {section.tips && section.tips.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <MdInfo className="h-5 w-5 text-green-600" />
                            เคล็ดลับ
                          </h3>
                          <div className="space-y-2">
                            {section.tips.map((tip, index) => (
                              <div key={index} className="flex items-start gap-3">
                                <MdCheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                <p className="text-gray-700 dark:text-gray-300">
                                  {tip}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Warnings */}
                      {section.warnings && section.warnings.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <MdWarning className="h-5 w-5 text-yellow-600" />
                            ข้อควรระวัง
                          </h3>
                          <div className="space-y-2">
                            {section.warnings.map((warning, index) => (
                              <div key={index} className="flex items-start gap-3">
                                <MdError className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <p className="text-gray-700 dark:text-gray-300">
                                  {warning}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'features' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<MdQrCodeScanner className="h-8 w-8 text-white" />}
              title="QR Code Scanner"
              description="สแกน QR Code เพื่อกรอกข้อมูลตัวอย่างอัตโนมัติ"
              color="bg-blue-500"
            />
            <FeatureCard
              icon={<MdUpload className="h-8 w-8 text-white" />}
              title="Image Upload"
              description="อัปโหลดภาพ Microplate จากไฟล์"
              color="bg-green-500"
            />
            <FeatureCard
              icon={<MdVideocam className="h-8 w-8 text-white" />}
              title="Camera Capture"
              description="ถ่ายภาพ Microplate ด้วยกล้องที่เชื่อมต่อ"
              color="bg-indigo-500"
            />
            <FeatureCard
              icon={<MdScience className="h-8 w-8 text-white" />}
              title="AI Analysis"
              description="วิเคราะห์ภาพด้วย AI Model ที่แม่นยำ"
              color="bg-purple-500"
            />
            <FeatureCard
              icon={<MdTableChart className="h-8 w-8 text-white" />}
              title="Data Visualization"
              description="แสดงผลข้อมูลในรูปแบบตารางและกราฟ"
              color="bg-orange-500"
            />
            <FeatureCard
              icon={<MdDownload className="h-8 w-8 text-white" />}
              title="Export Data"
              description="ส่งออกข้อมูลเป็น CSV สำหรับ Labware Systems"
              color="bg-teal-500"
            />
            <FeatureCard
              icon={<MdNotifications className="h-8 w-8 text-white" />}
              title="Real-time Notifications"
              description="รับการแจ้งเตือนแบบ Real-time"
              color="bg-red-500"
            />
            <FeatureCard
              icon={<MdVideocamOff className="h-8 w-8 text-white" />}
              title="Camera Status Monitor"
              description="ตรวจสอบสถานะการเชื่อมต่อกล้องแบบ Real-time"
              color="bg-cyan-500"
            />
          </div>
        )}

        {activeTab === 'troubleshooting' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                ปัญหาที่พบบ่อยและวิธีแก้ไข
              </h2>
              
              <div className="space-y-6">
                <div className="border-l-4 border-red-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    ภาพไม่แสดงผล
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">
                    หากภาพไม่แสดงผลในหน้า Results
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                    <li>ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต</li>
                    <li>ลองรีเฟรชหน้าเว็บ</li>
                    <li>ตรวจสอบไฟล์ภาพว่าถูกต้องหรือไม่</li>
                  </ul>
                </div>

                <div className="border-l-4 border-yellow-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    การวิเคราะห์ใช้เวลานาน
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">
                    หากการวิเคราะห์ใช้เวลานานเกินไป
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                    <li>ตรวจสอบขนาดไฟล์ภาพ</li>
                    <li>รอให้ระบบประมวลผลเสร็จสิ้น</li>
                    <li>ลองใช้ภาพที่มีความละเอียดต่ำกว่า</li>
                  </ul>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    ไม่สามารถดาวน์โหลดไฟล์ CSV
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">
                    หากไม่สามารถดาวน์โหลดไฟล์ Interface CSV
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                    <li>ตรวจสอบการตั้งค่า Browser</li>
                    <li>ลองใช้ Browser อื่น</li>
                    <li>ตรวจสอบสิทธิ์การดาวน์โหลดไฟล์</li>
                  </ul>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    ข้อมูลไม่ถูกต้อง
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">
                    หากข้อมูลที่แสดงไม่ถูกต้อง
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                    <li>ตรวจสอบข้อมูลที่กรอกในหน้า Dashboard</li>
                    <li>ลองวิเคราะห์ใหม่</li>
                    <li>ตรวจสอบคุณภาพของภาพ</li>
                  </ul>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    กล้องไม่ทำงานหรือไม่พร้อมใช้งาน
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">
                    หากกล้องแสดงสถานะ "ไม่พร้อมใช้งาน" หรือ "กำลังตรวจสอบ..."
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                    <li>ตรวจสอบการเชื่อมต่อกล้องกับระบบ</li>
                    <li>กดปุ่มรีเฟรชเพื่อตรวจสอบการเชื่อมต่อใหม่</li>
                    <li>ตรวจสอบว่า Vision Capture Service ทำงานอยู่</li>
                    <li>ลองใช้การอัปโหลดไฟล์แทนการถ่ายภาพ</li>
                    <li>ติดต่อผู้ดูแลระบบหากปัญหายังคงอยู่</li>
                  </ul>
                </div>

                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    ปุ่ม Capture ไม่ทำงาน
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">
                    หากปุ่ม Capture สีเทาและไม่สามารถกดได้
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                    <li>ตรวจสอบสถานะกล้องก่อนใช้งาน</li>
                    <li>รอให้ระบบตรวจสอบการเชื่อมต่อเสร็จสิ้น</li>
                    <li>ตรวจสอบว่ามีข้อมูล Sample Number และ Submission Number</li>
                    <li>ลองรีเฟรชหน้าเว็บ</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-blue-50 dark:bg-blue-900/20">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                ต้องการความช่วยเหลือเพิ่มเติม?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                หากคุณพบปัญหาที่ไม่สามารถแก้ไขได้ด้วยตนเอง กรุณาติดต่อทีมสนับสนุน
              </p>
              <div className="flex gap-4">
                <Button variant="primary">
                  ติดต่อ Support
                </Button>
                <Button variant="outline">
                  ส่ง Feedback
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
