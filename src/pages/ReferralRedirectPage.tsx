import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AffiliateAPI } from '@/lib/api';

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
        const data = await AffiliateAPI.resolve(code);
        if (data?.url) {
          // Preserve the referral/query params already present on this URL.
          const url = new URL(data.url, window.location.origin);
          const params = new URLSearchParams(window.location.search);
          params.forEach((value, key) => {
            if (!url.searchParams.has(key)) url.searchParams.set(key, value);
          });
          window.location.replace(url.toString());
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