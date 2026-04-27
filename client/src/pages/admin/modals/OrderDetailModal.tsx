import { useState, useEffect } from 'react';

import type { Order, OrderItem, OrderNote, OrderUpdatePayload } from '../_shared/types';
import AdminModal from '../_ui/AdminModal';

export default function OrderDetailModal({ order, onClose, onRefresh }: { order: Order; onClose: () => void; onRefresh?: () => void }) {
  const [status, setStatus] = useState(order.status);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    // Fetch order details including items
    fetch(`/api/admin/orders/${order.id}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.items) setOrderItems(data.items);
        if (data.trackingNumber) setTrackingNumber(data.trackingNumber);
        if (data.trackingUrl) setTrackingUrl(data.trackingUrl);
      });
    
    // Fetch order notes
    fetch(`/api/admin/orders/${order.id}/notes`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setNotes(data));
  }, [order.id]);

  const handleStatusUpdate = async () => {
    setIsUpdating(true);
    try {
      const payload: OrderUpdatePayload = { status };
      
      // Include tracking number when changing to shipped
      if (status === 'shipped' && trackingNumber) {
        payload.trackingNumber = trackingNumber;
      }
      
      await fetch(`/api/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      onRefresh?.();
      onClose();
    } catch (error) {
      console.error('Status update failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTrackingUpdate = async () => {
    setIsUpdating(true);
    try {
      await fetch(`/api/admin/orders/${order.id}/tracking`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          trackingNumber, 
          trackingUrl: trackingUrl || `https://www.dhl.com/tr-tr/home/takip.html?tracking-id=${trackingNumber}`,
          shippingCarrier: 'DHL E-Commerce'
        }),
        credentials: 'include',
      });
      
      // Update status to shipped if tracking is added
      if (status !== 'shipped' && status !== 'delivered') {
        await fetch(`/api/admin/orders/${order.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'shipped' }),
          credentials: 'include',
        });
        setStatus('shipped');
      }
      onRefresh?.();
    } catch (error) {
      console.error('Tracking update failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    setIsUpdating(true);
    try {
      await fetch(`/api/admin/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
        credentials: 'include',
      });
      setStatus('cancelled');
      setShowCancelConfirm(false);
      onRefresh?.();
    } catch (error) {
      console.error('Cancel order failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote }),
        credentials: 'include',
      });
      const note = await res.json();
      setNotes([note, ...notes]);
      setNewNote('');
    } catch (error) {
      console.error('Add note failed:', error);
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Beklemede', color: 'bg-yellow-500' },
    { value: 'processing', label: 'Hazırlanıyor', color: 'bg-blue-500' },
    { value: 'shipped', label: 'Kargoya Verildi', color: 'bg-purple-500' },
    { value: 'delivered', label: 'Teslim Edildi', color: 'bg-green-500' },
    { value: 'cancelled', label: 'İptal Edildi', color: 'bg-red-500' },
  ];

  return (
    <AdminModal
      open
      onClose={onClose}
      title="Sipariş Detayı"
      description={<span className="font-mono">{order.orderNumber}</span>}
      size="lg"
      testId="modal-order-detail"
    >
        
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-neutral-500 mb-1">Müşteri</p>
              <p className="text-neutral-900 font-medium">{order.customerName}</p>
              <p className="text-neutral-500 text-sm">{order.customerEmail}</p>
              <p className="text-neutral-500 text-sm">{order.customerPhone}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500 mb-1">Teslimat Adresi</p>
              <p className="text-neutral-700 text-sm">{order.shippingAddress?.address}</p>
              <p className="text-neutral-500 text-sm">{order.shippingAddress?.district}, {order.shippingAddress?.city}</p>
              <p className="text-neutral-500 text-sm">{order.shippingAddress?.postalCode}</p>
            </div>
          </div>

          {/* Order Items */}
          {orderItems.length > 0 && (
            <div>
              <p className="text-sm text-neutral-500 mb-2">Sipariş Kalemleri</p>
              <div className="bg-neutral-50 rounded-lg p-3 space-y-2">
                {orderItems.map((item: OrderItem, index: number) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="text-neutral-900">{item.productName}</p>
                      {item.variantDetails && <p className="text-neutral-500 text-xs">{item.variantDetails}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-neutral-900">{item.quantity} x {item.price}₺</p>
                      <p className="text-neutral-500 text-xs">{item.subtotal}₺</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 pt-3 border-t border-neutral-200">
                <span className="text-neutral-500">Toplam</span>
                <span className="text-xl font-bold text-neutral-900">{order.total}₺</span>
              </div>
            </div>
          )}

          {/* Status Management */}
          <div className="bg-neutral-100 rounded-lg p-4">
            <p className="text-sm text-neutral-500 mb-3">Sipariş Durumu</p>
            <div className="flex gap-3 items-center">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={status === 'cancelled'}
                className="flex-1 px-4 py-2 bg-neutral-200 border border-zinc-600 rounded-lg text-neutral-900 focus:outline-none"
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={handleStatusUpdate}
                disabled={isUpdating || status === order.status || status === 'cancelled'}
                className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-50"
              >
                Güncelle
              </button>
            </div>
          </div>

          {/* DHL Tracking */}
          <div className="bg-neutral-100 rounded-lg p-4">
            <p className="text-sm text-neutral-500 mb-3">DHL E-Commerce Kargo</p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Takip Numarası"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full px-4 py-2 bg-neutral-200 border border-zinc-600 rounded-lg text-neutral-900 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Takip URL (opsiyonel - otomatik oluşturulur)"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                className="w-full px-4 py-2 bg-neutral-200 border border-zinc-600 rounded-lg text-neutral-900 focus:outline-none"
              />
              <button
                onClick={handleTrackingUpdate}
                disabled={isUpdating || !trackingNumber}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                Kargoya Ver
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-sm text-neutral-500 mb-2">Notlar</p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Not ekle..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="flex-1 px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none"
              />
              <button
                onClick={handleAddNote}
                className="px-4 py-2 bg-neutral-200 text-neutral-900 rounded-lg hover:bg-zinc-600"
              >
                Ekle
              </button>
            </div>
            {notes.length > 0 && (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {notes.map((note: OrderNote) => (
                  <div key={note.id} className="bg-neutral-50 rounded-lg p-2 text-sm">
                    <p className="text-neutral-900">{note.content}</p>
                    <p className="text-neutral-500 text-xs mt-1">
                      {new Date(note.createdAt).toLocaleString('tr-TR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cancel Order */}
          {status !== 'cancelled' && status !== 'delivered' && (
            <div className="pt-4 border-t border-neutral-200">
              {!showCancelConfirm ? (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg hover:bg-red-600/30"
                >
                  Siparişi İptal Et
                </button>
              ) : (
                <div className="space-y-3 bg-red-900/20 p-4 rounded-lg border border-red-600/30">
                  <p className="text-red-400 text-sm">Siparişi iptal etmek istediğinize emin misiniz? Stok otomatik olarak iade edilecektir.</p>
                  <input
                    type="text"
                    placeholder="İptal sebebi (opsiyonel)"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      className="flex-1 px-4 py-2 bg-neutral-200 text-neutral-900 rounded-lg hover:bg-zinc-600"
                    >
                      Vazgeç
                    </button>
                    <button
                      onClick={handleCancelOrder}
                      disabled={isUpdating}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      İptal Et
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
    </AdminModal>
  );
}
