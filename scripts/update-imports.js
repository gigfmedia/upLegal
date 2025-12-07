import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filesToUpdate = [
  'src/pages/DashboardProfile.tsx',
  'src/pages/SearchResults.tsx',
  'src/pages/DashboardAppointments.tsx',
  'src/contexts/NotificationContext.tsx',
  'src/pages/DashboardPayments.tsx',
  'src/contexts/MessageProvider.tsx',
  'src/pages/AttorneyDashboard.tsx',
  'src/pages/DashboardAppointments.backup.tsx',
  'src/pages/LawyerDashboard.tsx',
  'src/pages/Index.tsx',
  'src/components/ScheduleModal.tsx',
  'src/components/messages/ChatWindow.tsx',
  'src/pages/DashboardSettings.tsx',
  'src/pages/PublicProfile.tsx',
  'src/pages/UserDashboard.tsx',
  'src/pages/DashboardMessages.tsx',
  'src/components/Header.tsx',
  'src/components/LawyerCard.tsx',
  'src/components/ConsultationModal.tsx',
  'src/components/AuthModal.tsx'
];

filesToUpdate.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace(
      /from ['"]@\/contexts\/AuthContext['"]/g,
      'from "@/contexts/AuthContext"'
    );
    fs.writeFileSync(fullPath, content, 'utf8');
  } else {
    console.warn(`File not found: ${filePath}`);
  }
});
