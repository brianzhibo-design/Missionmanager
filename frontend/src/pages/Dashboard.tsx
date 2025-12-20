import { useIsMobile } from '../hooks/useIsMobile';
import MobileHome from './mobile/MobileHome';
import DesktopDashboard from './DesktopDashboard';

export default function Dashboard() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileHome />;
  }

  return <DesktopDashboard />;
}
