'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { useAuthStore } from '@/store/authStore';
import jsQR from 'jsqr';

export default function SendScanPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');
  const scanLoopRef = useRef<number>(0);
  const validatedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
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
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setError('');
      } catch {
        setError('Camera access denied or not available.');
      }
    }
    startCamera();
    return () => {
      cancelled = true;
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (error || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function tick() {
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        scanLoopRef.current = requestAnimationFrame(tick);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code && !validatedRef.current) {
        validatedRef.current = true;
        try {
          const data = JSON.parse(code.data);
          const rid = data.receiver_id || data.id;
          if (!rid) {
            validatedRef.current = false;
            scanLoopRef.current = requestAnimationFrame(tick);
            return;
          }
          const doValidate = (r: { success?: boolean; user?: { id: string; name: string } }) => {
            if (r.success && r.user) {
              sessionStorage.setItem('send_receiver', r.user.name);
              sessionStorage.setItem('send_receiver_id', r.user.id);
              streamRef.current?.getTracks().forEach((t) => t.stop());
              router.push('/send');
            } else {
              sessionStorage.setItem('send_receiver', data.receiver_name || data.sync_id || 'Receiver');
              sessionStorage.setItem('send_receiver_id', rid);
              streamRef.current?.getTracks().forEach((t) => t.stop());
              router.push('/send');
            }
          };
          if (token) {
            fetch(`/api/wallet/user/${rid}`, { headers: { Authorization: `Bearer ${token}` } })
              .then((res) => res.json())
              .then(doValidate)
              .catch(() => {
                validatedRef.current = false;
              });
            scanLoopRef.current = requestAnimationFrame(tick);
            return;
          }
          sessionStorage.setItem('send_receiver', data.receiver_name || data.sync_id || 'Receiver');
          sessionStorage.setItem('send_receiver_id', rid);
          streamRef.current?.getTracks().forEach((t) => t.stop());
          router.push('/send');
          return;
        } catch {
          validatedRef.current = false;
        }
      }
      scanLoopRef.current = requestAnimationFrame(tick);
    }
    scanLoopRef.current = requestAnimationFrame(tick);
    return () => {
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    };
  }, [error, router, token]);

  return (
    <div className="flex min-h-screen flex-col bg-primary">
      <AppHeader title="Scan Payment QR" backHref="/send" dark />

      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="relative flex aspect-square w-full max-w-[300px] items-center justify-center overflow-hidden rounded-2xl border-4 border-secondary bg-black">
          {error ? (
            <div className="flex flex-col items-center gap-2 p-4 text-center text-white">
              <span className="text-4xl">CAM</span>
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
            </>
          )}
        </div>
        <p className="mt-4 text-center text-white">Position QR code within frame</p>
        <p className="mt-2 text-center text-xs text-gray-400">Real-time scan: point camera at receiver&apos;s identity QR</p>
      </div>
    </div>
  );
}
