import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Loader2, Package } from 'lucide-react';

export default function PaymentSuccess() {
  const [location] = useLocation();
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oid = params.get('oid');

    if (!oid) {
      setError('Sipariş bulunamadı');
      setLoading(false);
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/payment/status/${oid}`, {
          credentials: 'include',
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'completed') {
            setOrderNumber(data.orderNumber);
            setLoading(false);
          } else if (data.status === 'failed') {
            setError('Ödeme işlemi başarısız oldu');
            setLoading(false);
          } else {
            setTimeout(checkStatus, 2000);
          }
        } else {
          setError('Sipariş durumu kontrol edilemedi');
          setLoading(false);
        }
      } catch (err) {
        setError('Bir hata oluştu');
        setLoading(false);
      }
    };

    checkStatus();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-36 pb-20 px-4 sm:px-6">
          <div className="max-w-lg mx-auto text-center">
            <Loader2 className="w-12 h-12 animate-spin text-white/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Ödeme onaylanıyor...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-36 pb-20 px-4 sm:px-6">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
              <span className="text-4xl">!</span>
            </div>
            <h1 className="font-display text-3xl tracking-wider mb-4">BİR HATA OLUŞTU</h1>
            <p className="text-muted-foreground mb-8">{error}</p>
            <Link href="/">
              <Button className="h-12 px-8 bg-white text-black hover:bg-white/90 font-bold tracking-wide">
                ANA SAYFAYA DÖN
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <main className="pt-36 pb-20 px-4 sm:px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg mx-auto text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center"
          >
            <CheckCircle2 className="w-12 h-12 text-white" />
          </motion.div>
          <h1 className="font-display text-3xl tracking-wider mb-4" data-testid="text-order-success">
            ÖDEMENİZ BAŞARILI!
          </h1>
          <p className="text-muted-foreground mb-2">
            Siparişiniz başarıyla oluşturuldu.
          </p>
          <p className="text-lg font-mono font-bold text-white mb-8">
            Sipariş No: #{orderNumber}
          </p>
          
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 mb-8 text-left">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-green-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-white mb-2">Sonraki Adımlar</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Sipariş onayı e-posta adresinize gönderildi</li>
                  <li>• Siparişiniz 1 iş günü içinde kargoya verilecek</li>
                  <li>• Kargo takip numarası SMS ile bildirilecek</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/" className="flex-1">
              <Button className="w-full h-12 bg-white text-black hover:bg-white/90 font-bold tracking-wide group">
                ALIŞVERİŞE DEVAM ET
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
