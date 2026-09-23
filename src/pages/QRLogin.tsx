import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { QrCode, RefreshCw, ArrowLeft } from 'lucide-react';

const QR_SERVICE = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=';
const POLL_INTERVAL = 2500;
const QR_EXPIRY_SECONDS = 120;

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export default function QRLogin() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(QR_EXPIRY_SECONDS);
  const [polling, setPolling] = useState(false);

  const generateToken = async () => {
    const newToken = generateId();
    const expiry = new Date(Date.now() + QR_EXPIRY_SECONDS * 1000);
    await ((supabase as any).from('qr_login_tokens')).insert({ token: newToken, expires_at: expiry.toISOString() });
    setToken(newToken);
    setExpiresAt(expiry);
    setSecondsLeft(QR_EXPIRY_SECONDS);
    const deepLink = `${window.location.origin}/auth/qr-consume?token=${newToken}`;
    setQrUrl(`${QR_SERVICE}${encodeURIComponent(deepLink)}`);
    setPolling(true);
  };

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => {
      const s = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000));
      setSecondsLeft(s);
      if (s === 0) { setPolling(false); clearInterval(id); }
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  useEffect(() => {
    if (!polling || !token) return;
    const id = setInterval(async () => {
      const { data } = await ((supabase as any).from('qr_login_tokens'))
        .select('consumed_at, user_id').eq('token', token).maybeSingle();
      if (data?.consumed_at && data?.user_id) {
        setPolling(false);
        clearInterval(id);
        toast.success('QR login successful!');
        navigate('/', { replace: true });
      }
    }, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [polling, token, navigate]);

  useEffect(() => { generateToken(); }, []); // eslint-disable-line

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Link to="/login" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
            <CardTitle className="text-2xl flex items-center gap-2"><QrCode className="h-6 w-6" />QR Login</CardTitle>
          </div>
          <CardDescription>Scan the QR code with the Incu mobile app to log in instantly.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          {qrUrl && (
            <div className="relative">
              <img src={qrUrl} alt="QR Login Code" className={`rounded-lg border-4 ${secondsLeft < 20 ? 'border-destructive' : 'border-primary'} transition-colors`} width={200} height={200} />
              {secondsLeft === 0 && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                  <p className="text-destructive font-semibold">Expired</p>
                </div>
              )}
            </div>
          )}
          <div className="text-center space-y-1">
            {secondsLeft > 0 ? (
              <p className="text-sm text-muted-foreground">Expires in <span className={`font-mono font-bold ${secondsLeft < 20 ? 'text-destructive' : ''}`}>{secondsLeft}s</span></p>
            ) : (
              <p className="text-sm text-destructive">QR code expired</p>
            )}
            {polling && <p className="text-xs text-muted-foreground animate-pulse">Waiting for scan...</p>}
          </div>
          <Button variant="outline" className="gap-2" onClick={generateToken} disabled={polling && secondsLeft > 0}>
            <RefreshCw className="h-4 w-4" />Generate New Code
          </Button>
          <p className="text-sm text-muted-foreground">Prefer password? <Link to="/login" className="text-primary underline">Login here</Link></p>
        </CardContent>
      </Card>
    </div>
  );
}
