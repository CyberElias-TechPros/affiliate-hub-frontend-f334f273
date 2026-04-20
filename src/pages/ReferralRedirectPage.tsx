import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';

const ReferralRedirectPage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!code) {
      navigate('/marketplace', { replace: true });
      return;
    }

    (async () => {
      try {
        const { data } = await api.get(`/affiliate/r/${code}`);
        if (data?.url) {
          window.location.href = data.url;
        } else {
          navigate('/marketplace', { replace: true });
        }
      } catch {
        navigate('/marketplace', { replace: true });
      }
    })();
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
};

export default ReferralRedirectPage;