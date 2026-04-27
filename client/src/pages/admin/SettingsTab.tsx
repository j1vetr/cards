import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Settings, Mail, Loader2, CheckCircle2, XCircle, Send, Server, CreditCard, Copy, AlertTriangle, Wrench } from 'lucide-react';

export default function SettingsPanel() {
  const [settings, setSettings] = useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_secure: 'false',
    admin_email: '',
    site_url: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [iyzicoSaving, setIyzicoSaving] = useState(false);
  const [callbackCopied, setCallbackCopied] = useState(false);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);

  const { data: maintenanceData, refetch: refetchMaintenance } = useQuery<{ enabled: boolean }>({
    queryKey: ['/api/admin/maintenance'],
  });

  const handleMaintenanceToggle = async (enabled: boolean) => {
    if (!maintenanceData || maintenanceData.enabled === enabled) return;
    setMaintenanceSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
        credentials: 'include',
      });
      if (res.ok) {
        await refetchMaintenance();
        setMessage({
          type: 'success',
          text: enabled
            ? 'Bakım modu AÇILDI. Site ziyaretçilere bakım sayfası gösteriliyor. Admin paneli açık kalır.'
            : 'Bakım modu KAPATILDI. Site normal şekilde yayında.',
        });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Bakım modu değiştirilemedi' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Bakım modu değiştirilemedi' });
    } finally {
      setMaintenanceSaving(false);
    }
  };

  const { data: iyzicoConfig, refetch: refetchIyzico } = useQuery<{
    mode: 'sandbox' | 'live';
    configured: boolean;
    callbackUrl: string;
    baseUrl: string;
    envOverride: boolean;
  }>({
    queryKey: ['/api/admin/iyzico/config'],
  });

  const handleIyzicoModeChange = async (mode: 'sandbox' | 'live') => {
    if (!iyzicoConfig || iyzicoConfig.mode === mode) return;
    setIyzicoSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/iyzico/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
        credentials: 'include',
      });
      if (res.ok) {
        await refetchIyzico();
        setMessage({
          type: 'success',
          text: mode === 'live'
            ? 'iyzico CANLI moda alındı. API anahtarlarınızın canlı (production) anahtarlar olduğundan emin olun.'
            : 'iyzico TEST (sandbox) moduna alındı.',
        });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Mod değiştirilemedi' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Mod değiştirilemedi' });
    } finally {
      setIyzicoSaving(false);
    }
  };

  const handleCopyCallback = async () => {
    if (!iyzicoConfig?.callbackUrl) return;
    try {
      await navigator.clipboard.writeText(iyzicoConfig.callbackUrl);
      setCallbackCopied(true);
      setTimeout(() => setCallbackCopied(false), 2000);
    } catch {
      setMessage({ type: 'error', text: 'URL panoya kopyalanamadı' });
    }
  };

  const { data: savedSettings, isLoading } = useQuery<{
    smtp_host?: string;
    smtp_port?: string;
    smtp_user?: string;
    smtp_pass?: string;
    smtp_secure?: string;
    admin_email?: string;
    site_url?: string;
  }>({
    queryKey: ['/api/admin/settings'],
  });

  useEffect(() => {
    if (savedSettings) {
      setSettings(prev => ({
        ...prev,
        ...savedSettings,
      }));
      if (savedSettings.admin_email) {
        setTestEmail(savedSettings.admin_email);
      }
    }
  }, [savedSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
        credentials: 'include',
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Ayarlar kaydedildi!' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Ayarlar kaydedilemedi' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Bir hata oluştu' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) return;
    setIsTesting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Test e-postası gönderildi!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Test e-postası gönderilemedi' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Bir hata oluştu' });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Ayarlar</h2>
        <p className="text-neutral-500">E-posta ve sistem ayarlarını yönetin</p>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-neutral-50 rounded-lg">
            <Server className="w-5 h-5 text-neutral-900" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">SMTP Ayarları</h3>
            <p className="text-sm text-neutral-500">E-posta gönderimi için SMTP sunucu yapılandırması</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">SMTP Sunucu</label>
            <input
              type="text"
              value={settings.smtp_host}
              onChange={(e) => setSettings(s => ({ ...s, smtp_host: e.target.value }))}
              placeholder="mail.example.com"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:border-white transition-colors"
              data-testid="input-smtp-host"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Port</label>
            <input
              type="text"
              value={settings.smtp_port}
              onChange={(e) => setSettings(s => ({ ...s, smtp_port: e.target.value }))}
              placeholder="587"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:border-white transition-colors"
              data-testid="input-smtp-port"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Kullanıcı Adı (E-posta)</label>
            <input
              type="text"
              value={settings.smtp_user}
              onChange={(e) => setSettings(s => ({ ...s, smtp_user: e.target.value }))}
              placeholder="no-reply@example.com"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:border-white transition-colors"
              data-testid="input-smtp-user"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Şifre</label>
            <input
              type="password"
              value={settings.smtp_pass}
              onChange={(e) => setSettings(s => ({ ...s, smtp_pass: e.target.value }))}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:border-white transition-colors"
              data-testid="input-smtp-pass"
            />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.smtp_secure === 'true'}
                onChange={(e) => setSettings(s => ({ ...s, smtp_secure: e.target.checked ? 'true' : 'false' }))}
                className="w-5 h-5 rounded bg-neutral-50 border-neutral-200"
              />
              <span className="text-sm text-neutral-900">SSL/TLS Kullan (Port 465 için)</span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-neutral-50 rounded-lg">
            <Mail className="w-5 h-5 text-neutral-900" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Bildirim Ayarları</h3>
            <p className="text-sm text-neutral-500">Sipariş bildirimleri için admin e-posta adresi</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Admin E-posta</label>
            <input
              type="email"
              value={settings.admin_email}
              onChange={(e) => setSettings(s => ({ ...s, admin_email: e.target.value }))}
              placeholder="admin@example.com"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:border-white transition-colors"
              data-testid="input-admin-email"
            />
            <p className="text-xs text-neutral-500 mt-1">Yeni sipariş bildirimleri bu adrese gönderilir</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Site URL</label>
            <input
              type="text"
              value={settings.site_url}
              onChange={(e) => setSettings(s => ({ ...s, site_url: e.target.value }))}
              placeholder="https://polenstone.com.tr"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:border-white transition-colors"
              data-testid="input-site-url"
            />
            <p className="text-xs text-neutral-500 mt-1">E-postalardaki bağlantılar için kullanılır</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-maintenance-settings">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-neutral-50 rounded-lg">
            <Wrench className="w-5 h-5 text-neutral-900" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Bakım Modu</h3>
            <p className="text-sm text-neutral-500">Açıkken siteye gelen ziyaretçilere bakım sayfası gösterilir. Admin paneli ve API erişimi açık kalır.</p>
          </div>
        </div>

        {!maintenanceData ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleMaintenanceToggle(false)}
                disabled={maintenanceSaving}
                data-testid="button-maintenance-off"
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors text-left ${
                  !maintenanceData.enabled
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {!maintenanceData.enabled && <CheckCircle2 className="w-4 h-4" />}
                  <span>KAPALI · Site yayında</span>
                </div>
                <div className={`text-xs mt-1 ${!maintenanceData.enabled ? 'text-white/70' : 'text-neutral-500'}`}>
                  Normal çalışma modu
                </div>
              </button>
              <button
                onClick={() => handleMaintenanceToggle(true)}
                disabled={maintenanceSaving}
                data-testid="button-maintenance-on"
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors text-left ${
                  maintenanceData.enabled
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {maintenanceData.enabled && <CheckCircle2 className="w-4 h-4" />}
                  <span>AÇIK · Bakım sayfası</span>
                </div>
                <div className={`text-xs mt-1 ${maintenanceData.enabled ? 'text-white/80' : 'text-neutral-500'}`}>
                  Ziyaretçiler bakım sayfasını görür
                </div>
              </button>
            </div>

            {maintenanceData.enabled && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                  Site şu anda bakımda. Ziyaretçiler "Yakında yeni tasarımımız ile sizlerle birlikteyiz" mesajını görüyor. Admin paneline (<code>/admin</code>) erişim sürüyor.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-iyzico-settings">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-neutral-50 rounded-lg">
            <CreditCard className="w-5 h-5 text-neutral-900" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">iyzico Ödeme Ayarları</h3>
            <p className="text-sm text-neutral-500">Test (sandbox) ve canlı mod arasında geçiş yapın</p>
          </div>
        </div>

        {!iyzicoConfig ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor...
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-neutral-500 mb-2">Çalışma Modu</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleIyzicoModeChange('sandbox')}
                  disabled={iyzicoSaving || iyzicoConfig.envOverride}
                  data-testid="button-iyzico-mode-sandbox"
                  className={`relative px-4 py-3 rounded-lg border text-left transition-colors disabled:opacity-50 ${
                    iyzicoConfig.mode === 'sandbox'
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {iyzicoConfig.mode === 'sandbox' && <CheckCircle2 className="w-4 h-4" />}
                    Test (Sandbox)
                  </div>
                  <div className={`text-xs mt-1 ${iyzicoConfig.mode === 'sandbox' ? 'text-white/70' : 'text-neutral-500'}`}>
                    Gerçek tahsilat yapılmaz
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleIyzicoModeChange('live')}
                  disabled={iyzicoSaving || iyzicoConfig.envOverride}
                  data-testid="button-iyzico-mode-live"
                  className={`relative px-4 py-3 rounded-lg border text-left transition-colors disabled:opacity-50 ${
                    iyzicoConfig.mode === 'live'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {iyzicoConfig.mode === 'live' && <CheckCircle2 className="w-4 h-4" />}
                    Canlı (Production)
                  </div>
                  <div className={`text-xs mt-1 ${iyzicoConfig.mode === 'live' ? 'text-white/80' : 'text-neutral-500'}`}>
                    Gerçek kart tahsilatı yapılır
                  </div>
                </button>
              </div>
              {iyzicoConfig.envOverride && (
                <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>IYZICO_MODE</strong> veya <strong>IYZICO_BASE_URL</strong> ortam değişkeni tanımlı,
                    panel üzerinden mod değiştirme devre dışı. Modu değiştirmek için bu değişkenleri kaldırın.
                  </span>
                </div>
              )}
              {!iyzicoConfig.configured && (
                <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>IYZICO_API_KEY</strong> ve <strong>IYZICO_SECRET_KEY</strong> tanımlı değil. Ödeme alınamaz.
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-500 mb-2">
                Callback URL (iyzico panelinde &ldquo;Bildirim URL&rdquo; alanına girin)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={iyzicoConfig.callbackUrl}
                  data-testid="input-iyzico-callback-url"
                  className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={handleCopyCallback}
                  data-testid="button-copy-callback-url"
                  className="flex items-center gap-2 px-4 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium"
                >
                  {callbackCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {callbackCopied ? 'Kopyalandı' : 'Kopyala'}
                </button>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                iyzico Merchant Panel → Ayarlar → Bildirim Ayarları bölümünden bu URL'i kaydedin.
                Checkout Form akışı ayrıca her isteğin içinde callback URL gönderir, ancak panelde whitelisting yapılması önerilir.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-200">
                <div className="text-neutral-500">Aktif Mod</div>
                <div className="font-semibold text-neutral-900 mt-0.5" data-testid="text-iyzico-active-mode">
                  {iyzicoConfig.mode === 'live' ? 'CANLI (Production)' : 'TEST (Sandbox)'}
                </div>
              </div>
              <div className="px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-200">
                <div className="text-neutral-500">API Anahtarları</div>
                <div className={`font-semibold mt-0.5 ${iyzicoConfig.configured ? 'text-emerald-600' : 'text-red-600'}`}>
                  {iyzicoConfig.configured ? 'Tanımlı' : 'Eksik'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-neutral-50 rounded-lg">
            <Send className="w-5 h-5 text-neutral-900" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Test E-postası</h3>
            <p className="text-sm text-neutral-500">SMTP ayarlarınızı test edin</p>
          </div>
        </div>

        <div className="flex gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@example.com"
            className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:border-white transition-colors"
            data-testid="input-test-email"
          />
          <button
            onClick={handleTestEmail}
            disabled={isTesting || !testEmail}
            className="flex items-center gap-2 px-6 py-3 bg-neutral-50 text-neutral-900 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50"
            data-testid="button-send-test"
          >
            {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Test Gönder
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 font-medium"
          data-testid="button-save-settings"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Ayarları Kaydet
        </button>
      </div>
    </div>
  );
}

