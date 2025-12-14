import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getApplications, createApplication } from '@/lib/supabase-service';

interface Application {
  id: string;
  property_id?: string;
  user_id?: string;
  status: 'pending' | 'approved' | 'rejected';
  [key: string]: any;
}

export function useApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      const localApps = JSON.parse(localStorage.getItem('choiceProperties_applications') || '[]') as Application[];
      setApplications(localApps);
      return;
    }

    const fetchApplications = async () => {
      setLoading(true);
      try {
        const apps = await getApplications(user.id);
        setApplications(apps as Application[]);
      } catch (err) {
        const localApps = JSON.parse(localStorage.getItem('choiceProperties_applications') || '[]') as Application[];
        setApplications(localApps);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [user]);

  const submitApplication = async (appData: Record<string, any>) => {
    if (!user) {
      const apps = JSON.parse(localStorage.getItem('choiceProperties_applications') || '[]') as Application[];
      const newApp: Application = { id: `app_${Date.now()}`, ...appData, status: 'pending', property_id: appData.property_id };
      const updated = [...apps, newApp];
      localStorage.setItem('choiceProperties_applications', JSON.stringify(updated));
      setApplications(updated);
      return newApp;
    }

    try {
      const newApp = await createApplication({ ...appData, user_id: user.id });
      if (newApp) {
        setApplications([...applications, newApp as Application]);
      }
      return newApp as Application;
    } catch (err) {
      return null;
    }
  };

  return { applications, submitApplication, loading };
}
