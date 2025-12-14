import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "wouter";
import { useEffect } from "react";

interface StorageMetrics {
  totalImages: number;
  totalStorageUsed: number;
  estimatedBandwidthUsed: number;
  storagePercentage: number;
}

export default function AdminStorageMonitor() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  const { data: metrics, isLoading, error } = useQuery<StorageMetrics>({
    queryKey: ['/api/admin/storage-metrics'],
    enabled: user?.role === 'admin',
  });

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (!user || user.role !== 'admin') {
    return <div className="p-4">Access denied</div>;
  }

  if (isLoading) {
    return <div className="p-4">Loading usage data...</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-foreground font-semibold">Usage data is temporarily unavailable.</p>
      </div>
    );
  }

  if (!metrics) {
    return <div className="p-4">Usage data is temporarily unavailable.</div>;
  }

  const isWarning = metrics.storagePercentage > 70;
  const isCritical = metrics.storagePercentage > 90;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Admin: Storage & Bandwidth Monitor</h1>

      <Card className="p-6 space-y-6">
        {/* Storage Usage */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Storage Usage</h2>
          <div className="space-y-2">
            <div className="text-foreground">
              <span className="text-base">Total Storage Used: </span>
              <span className="font-semibold">{formatBytes(metrics.totalStorageUsed)}</span>
            </div>
            <div className="text-foreground">
              <span className="text-base">Usage Percentage: </span>
              <span className="font-semibold">{metrics.storagePercentage.toFixed(1)}%</span>
            </div>
          </div>

          {/* Warning Messages */}
          {isCritical && (
            <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-red-800 dark:text-red-200">
              <p className="font-semibold">CRITICAL: Storage usage exceeds 90% of free-tier limit.</p>
              <p className="text-sm mt-1">Upgrade or delete images immediately.</p>
            </div>
          )}
          {isWarning && !isCritical && (
            <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded text-yellow-800 dark:text-yellow-200">
              <p className="font-semibold">WARNING: Storage usage exceeds 70% of free-tier limit.</p>
              <p className="text-sm mt-1">Consider upgrading or removing unused images.</p>
            </div>
          )}
        </div>

        {/* Image Count */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Images</h2>
          <div className="text-foreground">
            <span className="text-base">Total Images: </span>
            <span className="font-semibold">{metrics.totalImages}</span>
          </div>
        </div>

        {/* Bandwidth Estimate */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Estimated Bandwidth Usage</h2>
          <div className="text-foreground">
            <span className="text-base">Total Bandwidth (views × size): </span>
            <span className="font-semibold">{formatBytes(metrics.estimatedBandwidthUsed)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
