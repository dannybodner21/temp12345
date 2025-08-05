import { AdminSyncedServices } from '@/components/AdminSyncedServices';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminSyncSettings = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Admin Navigation */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-6">
            <h2 className="text-lg font-semibold">Admin Dashboard</h2>
            <nav className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/providers')}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Providers
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/bookings')}
                className="flex items-center gap-2"
              >
                <BookOpen className="h-4 w-4" />
                Bookings
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate('/admin/sync-settings')}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Sync Settings
              </Button>
            </nav>
          </div>
        </div>
      </div>
      
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">
            Sync Settings Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Control which synced services from external platforms are offered on Lately
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <AdminSyncedServices />
      </div>
    </div>
  );
};

export default AdminSyncSettings;