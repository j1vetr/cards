import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useParams } from 'wouter';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Lock,
  CreditCard,
  XCircle,
} from 'lucide-react';
import { SEO } from '@/components/SEO';

type PaymentRequestStatus = 'pending' | 'paid' | 'cancelled' | 'expired';

interface PublicPaymentRequest {
  token: string;
  amount: string;
  description: string | null;
  customerName: string | null;
  status: PaymentRequestStatus;
  expiresAt: string | null;
  paidAt: string | null;
}

const formatTry = (amount: string | number) =>
  Number(amount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PaymentRequest() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [request, setRequest] = useState<PublicPaymentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [checkoutFormContent, setCheckoutFormContent] = useState<string | null>(null);
  const [paymentPageUrl, setPaymentPageUrl] = useState<string | null>(null);
  const checkoutFormRef = useRef<HTMLDivElement>(null);

  // Mirror the latest request into a ref so the success poll can read the
  // current status without listing `request` as a dependency (which would
  // re-subscribe the effect on every fetch and reset its attempt counter).
  const requestRef = useRef<PublicPaymentRequest | null>(null);
  requestRef.current = request;

  // `durum` is set by the iyzico callback redirect (basarili | basarisiz).
  const callbackResult = new URLSearchParams(window.location.search).get('durum');

  const loadRequest = useCallback(async () => {
    if (!token) {
      setError('Ödeme talebi bulunamadı');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/payment-requests/${token}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Ödeme talebi bulunamadı');
        setLoading(false);
        return;
      }
      const data: PublicPaymentRequest = await res.json();
      setRequest(data);
      setLoading(false);
    } catch {
      setError('Ödeme talebi yüklenemedi');
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  // After an iyzico success redirect the server callback has already settled the
  // request, but our just-fetched snapshot can race it. Poll briefly until the
  // authoritative status flips to 'paid' rather than trusting the URL param alone.
  useEffect(() => {
    if (callbackResult !== 'basarili') return;
    if (requestRef.current?.status === 'paid') return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (requestRef.current?.status === 'paid' || attempts >= 6) {
        clearInterval(timer);
        return;
      }
      loadRequest();
    }, 2000);
    return () => clearInterval(timer);
  }, [callbackResult, loadRequest]);

  const handlePay = async () => {
    if (!token) return;
    setPayLoading(true);
    setPayError(null);
    try {
      const res = await fetch(`/api/payment-requests/${token}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPayError(data.error || 'Ödeme başlatılamadı');
        setPayLoading(false);
        return;
      }
      setPaymentPageUrl(data.paymentPageUrl || null);
      setCheckoutFormContent(data.checkoutFormContent || null);
      setPayLoading(false);
    } catch {
      setPayError('Ödeme başlatılamadı');
      setPayLoading(false);
    }
  };

  // Inject iyzico Checkout Form HTML/JS — same approach as the cart checkout.
  useEffect(() => {
    if (!checkoutFormContent || !checkoutFormRef.current) return;
    const container = checkoutFormRef.current;
    container.innerHTML = '';

    const formMount = document.createElement('div');
    formMount.id = 'iyzipay-checkout-form';
    formMount.className = 'responsive';
    container.appendChild(formMount);

    try {
      delete (window as unknown as { iyziInit?: unknown }).iyziInit;
    } catch {
      (window as unknown as { iyziInit?: unknown }).iyziInit = undefined;
    }

    const injectedScripts: HTMLScriptElement[] = [];
    const wrapper = document.createElement('div');
    wrapper.innerHTML = checkoutFormContent;

    Array.from(wrapper.childNodes).forEach((node) => {
      if (node.nodeName === 'SCRIPT') {
        const original = node as HTMLScriptElement;
        const script = document.createElement('script');
        if (original.src) script.src = original.src;
        if (original.type) script.type = original.type;
        script.text = original.text;
        container.appendChild(script);
        injectedScripts.push(script);
      } else {
        container.appendChild(node);
      }
    });

    return () => {
      container.innerHTML = '';
      injectedScripts.forEach((s) => s.parentNode?.removeChild(s));
      document
        .querySelectorAll('script[src*="static.iyzipay.com/checkoutform"]')
        .forEach((el) => el.parentNode?.removeChild(el));
      try {
        delete (window as unknown as { iyziInit?: unknown }).iyziInit;
      } catch {
        (window as unknown as { iyziInit?: unknown }).iyziInit = undefined;
      }
    };
  }, [checkoutFormContent]);

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-[#faf7f1] flex flex-col overflow-x-hidden">
      <SEO title="Ödeme" description="Ecarte Jeans güvenli ödeme sayfası." url={`/odeme/${token}`} noIndex />
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16">{children}</main>
      <Footer />
    </div>
  );

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <Shell>
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full border-2 border-polen-orange/20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-polen-orange" strokeWidth={2} />
          </div>
          <p className="text-sm text-black/55">Ödeme talebi yükleniyor…</p>
        </div>
      </Shell>
    );
  }

  // ── Not found / error ─────────────────────────────────────
  if (error || !request) {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center" data-testid="payment-request-error">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-amber-600" strokeWidth={2} />
          </div>
          <h1 className="font-display text-2xl tracking-[0.14em] uppercase text-black mb-3">Talep Bulunamadı</h1>
          <p className="text-sm text-black/60 mb-7">{error || 'Bu ödeme talebi mevcut değil.'}</p>
          <Link href="/">
            <Button className="h-12 px-7 bg-polen-orange text-black hover:bg-[hsl(var(--polen-orange-deep))] hover:text-white font-semibold tracking-[0.1em] uppercase text-[12px] rounded-none">
              Ana Sayfaya Dön
            </Button>
          </Link>
        </div>
      </Shell>
    );
  }

  // Trust only the server's authoritative status for the success screen.
  const isPaid = request.status === 'paid';
  // Success redirect landed but the settlement hasn't reflected yet — show a
  // short "verifying" state (the poll above will flip this to paid).
  const verifying = !isPaid && callbackResult === 'basarili' && request.status === 'pending';

  if (verifying) {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center" data-testid="payment-request-verifying">
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="w-16 h-16 mx-auto mb-5 rounded-full bg-black/[0.05] border border-black/10 flex items-center justify-center"
          >
            <CheckCircle2 className="w-7 h-7 text-black/40" strokeWidth={2} />
          </motion.div>
          <h1 className="font-display text-2xl tracking-[0.14em] uppercase text-black mb-3">
            Ödeme Doğrulanıyor
          </h1>
          <p className="text-sm text-black/60">
            Ödemeniz alınıyor, lütfen birkaç saniye bekleyin…
          </p>
        </div>
      </Shell>
    );
  }

  // ── Paid (success) ────────────────────────────────────────
  if (isPaid) {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center" data-testid="payment-request-paid">
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            className="w-20 h-20 mx-auto mb-5 rounded-full bg-polen-orange flex items-center justify-center shadow-[0_8px_24px_-6px_rgba(253,181,29,0.55)]"
          >
            <CheckCircle2 className="w-10 h-10 text-black" strokeWidth={2.2} />
          </motion.div>
          <h1 className="font-display text-2xl sm:text-3xl tracking-[0.14em] uppercase text-black mb-3">
            Ödemeniz Alındı
          </h1>
          <p className="text-sm text-black/60 mb-6">
            {formatTry(request.amount)} ₺ tutarındaki ödemeniz başarıyla alındı. Teşekkür ederiz.
          </p>
          <Link href="/">
            <Button className="h-12 px-7 bg-polen-orange text-black hover:bg-[hsl(var(--polen-orange-deep))] hover:text-white font-semibold tracking-[0.1em] uppercase text-[12px] rounded-none">
              Ana Sayfaya Dön
            </Button>
          </Link>
        </div>
      </Shell>
    );
  }

  // ── Cancelled / expired ───────────────────────────────────
  if (request.status === 'cancelled' || request.status === 'expired') {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center" data-testid="payment-request-closed">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-black/[0.05] border border-black/10 flex items-center justify-center">
            <XCircle className="w-7 h-7 text-black/45" strokeWidth={2} />
          </div>
          <h1 className="font-display text-2xl tracking-[0.14em] uppercase text-black mb-3">
            {request.status === 'expired' ? 'Süresi Doldu' : 'Talep İptal Edildi'}
          </h1>
          <p className="text-sm text-black/60 mb-7">
            Bu ödeme talebi artık ödenemez. Lütfen yeni bir bağlantı için bizimle iletişime geçin.
          </p>
          <Link href="/">
            <Button className="h-12 px-7 bg-polen-orange text-black hover:bg-[hsl(var(--polen-orange-deep))] hover:text-white font-semibold tracking-[0.1em] uppercase text-[12px] rounded-none">
              Ana Sayfaya Dön
            </Button>
          </Link>
        </div>
      </Shell>
    );
  }

  // ── Pending — show summary + pay ──────────────────────────
  const showIyzico = !!(checkoutFormContent || paymentPageUrl);
  return (
    <Shell>
      <div className="w-full max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-black/[0.08]"
        >
          <div className="border-b border-black/[0.06] px-6 pt-7 pb-6 text-center">
            <p className="text-[10px] tracking-[0.22em] uppercase text-black/45 font-medium mb-3">
              Ödeme Talebi
            </p>
            <p className="font-display text-4xl sm:text-5xl font-bold text-black tracking-tight" data-testid="text-amount">
              {formatTry(request.amount)} ₺
            </p>
            {request.customerName && (
              <p className="mt-3 text-sm text-black/60" data-testid="text-customer-name">
                {request.customerName}
              </p>
            )}
            {request.description && (
              <p className="mt-2 text-sm text-black/55 leading-relaxed" data-testid="text-description">
                {request.description}
              </p>
            )}
          </div>

          <div className="px-6 py-6">
            {callbackResult === 'basarisiz' && !showIyzico && (
              <div className="mb-4 flex items-start gap-2.5 bg-amber-50 border border-amber-200 px-4 py-3" data-testid="payment-failed-notice">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" strokeWidth={2} />
                <p className="text-[13px] text-amber-800 leading-relaxed">
                  Ödeme tamamlanamadı. Lütfen tekrar deneyin.
                </p>
              </div>
            )}

            {showIyzico ? (
              paymentPageUrl ? (
                <div className="space-y-4">
                  <div className="bg-white border border-black/8 overflow-hidden">
                    <iframe
                      src={paymentPageUrl}
                      title="iyzico Güvenli Ödeme"
                      className="w-full"
                      style={{ minHeight: '720px', border: 0 }}
                      allow="payment *"
                      data-testid="iyzico-payment-iframe"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-black/60 text-xs">
                    <Lock className="w-3.5 h-3.5" />
                    <span>256-bit SSL · iyzico güvencesiyle</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div ref={checkoutFormRef} data-testid="iyzico-form-container" />
                  <div className="mt-4 flex items-center gap-2 text-black/60 text-xs">
                    <Lock className="w-3.5 h-3.5" />
                    <span>256-bit SSL · iyzico güvencesiyle</span>
                  </div>
                </div>
              )
            ) : (
              <>
                {payError && (
                  <div className="mb-4 flex items-start gap-2.5 bg-red-50 border border-red-200 px-4 py-3" data-testid="pay-error">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" strokeWidth={2} />
                    <p className="text-[13px] text-red-700 leading-relaxed">{payError}</p>
                  </div>
                )}
                <Button
                  onClick={handlePay}
                  disabled={payLoading}
                  className="w-full h-13 py-3.5 bg-polen-orange text-white hover:bg-[hsl(var(--polen-orange-deep))] font-semibold tracking-[0.1em] uppercase text-[12.5px] rounded-none flex items-center justify-center gap-2"
                  data-testid="button-pay"
                >
                  {payLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" strokeWidth={2} />
                      Kredi Kartı ile Öde
                    </>
                  )}
                </Button>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-black/40 text-[10px]">
                  <Lock className="w-3 h-3 shrink-0" />
                  <span className="uppercase tracking-[0.06em] whitespace-nowrap">Ödemeniz iyzico güvencesiyle korunur</span>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </Shell>
  );
}
