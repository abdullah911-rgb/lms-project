import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { zoomService } from '../services/portalService';

/**
 * Loads the Zoom Meeting SDK script dynamically and returns a promise
 * that resolves when the global ZoomMtgEmbedded is available.
 */
function loadZoomSDK() {
  return new Promise((resolve, reject) => {
    if (window.ZoomMtgEmbedded) return resolve(window.ZoomMtgEmbedded);

    // Use the latest stable Component View SDK
    const script = document.createElement('script');
    script.src = 'https://source.zoom.us/3.9.5/zoom-meeting-embedded.min.js';
    script.async = true;
    script.onload = () => {
      if (window.ZoomMtgEmbedded) resolve(window.ZoomMtgEmbedded);
      else reject(new Error('Zoom SDK loaded but ZoomMtgEmbedded not found.'));
    };
    script.onerror = () => reject(new Error('Failed to load Zoom SDK script.'));
    document.head.appendChild(script);
  });
}

export default function ZoomClassroom() {
  const { meetingId } = useParams();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');
  const navigate = useNavigate();
  const { user } = useAuth();

  const containerRef = useRef(null);
  const clientRef = useRef(null);
  const attendanceRecorded = useRef(false);

  const [status, setStatus] = useState('loading'); // 'loading' | 'joining' | 'live' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const isHost = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';

  // ── Record leave attendance and clean up ─────────────────────────────────
  const handleLeave = useCallback(async () => {
    if (attendanceRecorded.current) {
      try {
        await zoomService.leaveAttendance(meetingId);
      } catch (e) {
        console.warn('Leave attendance error:', e);
      }
    }
    if (clientRef.current) {
      try {
        await clientRef.current.leave();
      } catch (_) {}
      clientRef.current = null;
    }
    // Navigate back to the course view
    if (courseId) {
      navigate(`/student/course/${courseId}`);
    } else {
      navigate(-1);
    }
  }, [meetingId, courseId, navigate]);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        setStatus('loading');

        // 1. Load Zoom SDK
        const ZoomMtgEmbedded = await loadZoomSDK();

        if (!isMounted) return;
        setStatus('joining');

        // 2. Fetch the signature + SDK key from our backend
        const role = isHost ? 1 : 0;
        const { data: sigData } = await zoomService.getSignature(meetingId, role);
        const { signature, sdkKey, meetingNumber, password } = sigData.data;

        if (!isMounted) return;

        // 3. Create the embedded client and attach to our DOM element
        const client = ZoomMtgEmbedded.createClient();
        clientRef.current = client;

        client.init({
          debug: false,
          zoomAppRoot: containerRef.current,
          language: 'en-US',
          customize: {
            video: {
              isResizable: true,
              viewSizes: { default: { width: containerRef.current.offsetWidth || 1200, height: 600 } },
            },
            meetingInfo: ['topic', 'host', 'participant', 'dc', 'enctype'],
            toolbar: {
              buttons: [
                { text: 'Leave Class', className: 'zm-btn-leave', onClick: handleLeave },
              ],
            },
          },
        });

        // 4. Join the meeting
        await client.join({
          signature,
          sdkKey,
          meetingNumber,
          password,
          userName: user?.name || 'Guest',
          userEmail: user?.email || '',
          role,
        });

        if (!isMounted) return;
        setStatus('live');

        // 5. Record join attendance
        try {
          await zoomService.joinAttendance(meetingId);
          attendanceRecorded.current = true;
        } catch (e) {
          console.warn('Join attendance error:', e);
        }

        // 6. Listen for when user leaves via Zoom's own controls
        client.on('connection-change', (payload) => {
          if (payload.state === 'Closed' || payload.state === 'Fail') {
            handleLeave();
          }
        });
      } catch (err) {
        if (!isMounted) return;
        console.error('Zoom init error:', err);
        setStatus('error');
        setErrorMsg(err.message || 'Failed to start the classroom. Please try again.');
      }
    };

    init();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  // Clean up on page unload
  useEffect(() => {
    const onUnload = () => {
      if (attendanceRecorded.current) {
        // Best-effort beacon
        navigator.sendBeacon &&
          navigator.sendBeacon(`/api/zoom/${meetingId}/attendance/leave`);
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [meetingId]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          background: '#1e293b',
          borderBottom: '1px solid #334155',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Live indicator */}
          {status === 'live' && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#dc2626',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                borderRadius: 6,
                padding: '3px 10px',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#fff',
                  animation: 'pulse 1.5s infinite',
                }}
              />
              LIVE
            </span>
          )}
          <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 15 }}>
            {status === 'loading' && 'Preparing Classroom…'}
            {status === 'joining' && 'Connecting to Live Class…'}
            {status === 'live' && 'Virtual Classroom'}
            {status === 'error' && 'Connection Error'}
          </span>
        </div>

        <button
          onClick={handleLeave}
          style={{
            background: '#dc2626',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 18px',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ✕ Leave Class
        </button>
      </div>

      {/* ── Status overlays ── */}
      {(status === 'loading' || status === 'joining') && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            color: '#94a3b8',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: '4px solid #334155',
              borderTop: '4px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 0.9s linear infinite',
            }}
          />
          <p style={{ fontSize: 15, color: '#cbd5e1', margin: 0 }}>
            {status === 'loading' ? 'Loading Zoom classroom…' : 'Joining the live session…'}
          </p>
          <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>
            Please allow camera and microphone access when prompted.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 24,
          }}
        >
          <div style={{ fontSize: 40 }}>⚠️</div>
          <h2 style={{ color: '#f87171', margin: 0, fontSize: 20 }}>
            Could Not Connect
          </h2>
          <p style={{ color: '#94a3b8', textAlign: 'center', maxWidth: 480, margin: 0 }}>
            {errorMsg}
          </p>
          <button
            onClick={() => navigate(-1)}
            style={{
              marginTop: 8,
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Go Back
          </button>
        </div>
      )}

      {/* ── Zoom embedded container ── */}
      <div
        ref={containerRef}
        id="meetingSDKElement"
        style={{
          flex: 1,
          display: status === 'error' ? 'none' : 'block',
          width: '100%',
          minHeight: 0,
        }}
      />

      {/* ── Keyframe animations ── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
