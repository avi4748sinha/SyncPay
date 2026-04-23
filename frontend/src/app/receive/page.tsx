'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';
import { useAuthStore } from '@/store/authStore';
import { AppHeader } from '@/components/AppHeader';
import { savePendingTxns, markTxnSynced } from '@/lib/idb';
import type { SenderFinalQRPayload } from '@/types';

export default function ReceivePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const [step, setStep] = useState<'identity' | 'scan'>('identity');
  const [scanError, setScanError] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number>(0);
  const decodedRef = useRef(false);

  const qrSession = useMemo(
    () => ({
      sessionId: 'SES-' + Date.now(),
      timestamp: Date.now(),
    }),
    []
  );

  const syncId = user?.sync_id || 'user@syncpay';
  const identityPayload = JSON.stringify({
    receiver_id: user?.id,
    wallet_id: user?.id,
    device_id: 'web',
    session_id: qrSession.sessionId,
    timestamp: qrSession.timestamp,
  });

  useEffect(() => {
    if (step !== 'scan') return;

    let cancelled = false;
    decodedRef.current = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setScanError('');
      } catch {
        setScanError('Camera access denied or not available.');
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [step]);

  useEffect(() => {
    if (step !== 'scan' || scanError) return;
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const context = ctx;

    function tick() {
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        scanLoopRef.current = requestAnimationFrame(tick);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code && !decodedRef.current) {
        decodedRef.current = true;
        try {
          const payload = JSON.parse(code.data) as SenderFinalQRPayload;

          if (
            !payload.txn_id ||
            !payload.sender_id ||
            !payload.receiver_id ||
            !payload.amount ||
            !payload.signature ||
            !payload.device_id ||
            !payload.timestamp
          ) {
            decodedRef.current = false;
            scanLoopRef.current = requestAnimationFrame(tick);
            return;
          }

          if (!user?.id || payload.receiver_id !== user.id) {
            setScanError('This QR is not for this receiver account.');
            decodedRef.current = false;
            scanLoopRef.current = requestAnimationFrame(tick);
            return;
          }

          streamRef.current?.getTracks().forEach((t) => t.stop());

          // Save receiver-side pending incoming txn locally.
          // This is required for History -> Pending tab to show offline received payments.
          (async () => {
            try {
              await savePendingTxns([
                {
                  txn_id: payload.txn_id,
                  sender_id: payload.sender_id,
                  receiver_id: payload.receiver_id,
                  amount: payload.amount,
                  timestamp: payload.timestamp,
                  signature: payload.signature,
                  device_id: payload.device_id,
                  sync_status: 'PENDING_SYNC',
                },
              ]);

              let settled = false;
              if (typeof navigator !== 'undefined' && navigator.onLine && token) {
                const res = await fetch('/api/transactions/settle-offline', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    txn_id: payload.txn_id,
                    sender_id: payload.sender_id,
                    receiver_id: payload.receiver_id,
                    amount: payload.amount,
                    timestamp: payload.timestamp,
                    signature: payload.signature,
                    device_id: payload.device_id,
                  }),
                });
                const data = await res.json().catch(() => ({}));
                if (data.success) {
                  await markTxnSynced(payload.txn_id);
                  settled = true;
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('syncpay-wallet-refresh'));
                    window.dispatchEvent(new Event('syncpay-pending-refresh'));
                  }
                }
              }

              sessionStorage.setItem('receive_success_amount', String(payload.amount / 100));
              sessionStorage.setItem('receive_success_sender_id', payload.sender_id);
              sessionStorage.setItem('receive_success_txn_id', payload.txn_id);
              sessionStorage.setItem('receive_success_status', settled ? 'SYNCED' : 'PENDING_SYNC');

              router.push('/receive/success');
            } catch {
              decodedRef.current = false;
              setScanError('Failed to save pending transaction.');
              scanLoopRef.current = requestAnimationFrame(tick);
            }
          })();

          return;
        } catch {
          decodedRef.current = false;
        }
      }

      scanLoopRef.current = requestAnimationFrame(tick);
    }

    scanLoopRef.current = requestAnimationFrame(tick);

    return () => {
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    };
  }, [step, scanError, user?.id, router, token]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Receive Payment" backHref="/dashboard" />
      <div className="p-4">
        {step === 'identity' && (
          <>
            <h2 className="mt-8 text-lg font-semibold text-primary">Step 1: Show Identity QR</h2>
            <p className="mt-2 text-sm text-gray-600">Ask sender to scan this QR code</p>
            <div className="mt-4 flex justify-center rounded-card border-4 border-secondary/40 bg-white p-6">
              <QRCodeSVG value={identityPayload} size={240} level="M" />
            </div>
            <p className="mt-4 text-center text-sm font-mono text-primary">{qrSession.sessionId}</p>
            <p className="mt-4 flex items-center justify-between rounded bg-gray-100 px-4 py-2 text-sm">
              <span className="text-gray-600">Sync ID</span>
              <span className="font-semibold text-primary">{syncId}</span>
            </p>
            <p className="mt-4 rounded bg-blue-50 p-3 text-xs text-primary">
              Note: This QR does NOT contain any amount. Sender will enter the amount after scanning.
            </p>
            <button
              onClick={() => setStep('scan')}
              className="mt-8 w-full rounded-button gradient-teal py-3 font-medium text-white"
            >
              Next: Scan Payment QR ->
            </button>
          </>
        )}

        {step === 'scan' && (
          <>
            <h2 className="mt-8 text-lg font-semibold text-primary">Step 2: Scan Payment QR</h2>
            <div className="relative mt-6 flex aspect-square items-center justify-center overflow-hidden rounded-lg border-4 border-secondary bg-gray-900">
              {scanError ? (
                <div className="flex flex-col items-center gap-2 p-4 text-center text-white">
                  <span className="text-5xl">CAM</span>
                  <p className="text-sm">{scanError}</p>
                </div>
              ) : (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                </>
              )}
            </div>
            <p className="mt-4 text-center text-gray-500">Position QR code within frame</p>
            <button
              type="button"
              onClick={() => {
                setStep('identity');
                setScanError('');
              }}
              className="mt-6 w-full rounded-button border border-gray-200 bg-white py-3 font-medium text-primary"
            >
              Back to Identity QR
            </button>
          </>
        )}
      </div>
    </div>
  );
}
