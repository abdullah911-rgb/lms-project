import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import ZoomMtgEmbeddedImport from '@zoom/meetingsdk/embedded';
import { useAuth } from '../contexts/AuthContext';
import { zoomService } from '../services/portalService';
import { API_URL } from '../constants';
import { getRoleHomePath } from '../utils/authRedirect';

function getZoomEmbedded() {
  const mod = ZoomMtgEmbeddedImport;
  if (typeof mod?.createClient === 'function') return mod;
  if (typeof mod?.default?.createClient === 'function') return mod.default;
  throw new Error('Zoom SDK could not be initialized. Please refresh and try again.');
}

function getBackPath(role, courseId) {
  if (courseId) {
    if (role === 'STUDENT') return `/student/course/${courseId}`;
    if (role === 'INSTRUCTOR' || role === 'ADMIN') return `/instructor/courses/${courseId}/edit`;
  }
  return getRoleHomePath(role);
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
  const hasJoinedRef = useRef(false);
  const isLeavingRef = useRef(false);

  const [status, setStatus] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const isHost = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';

  const cleanupClient = useCallback(async () => {
    if (clientRef.current) {
      try {
        await clientRef.current.leave();
      } catch (_) {}
      clientRef.current = null;
    }
  }, []);

  const goBack = useCallback(() => {
    if (user?.role) {
      navigate(getBackPath(user.role, courseId));
    } else {
      navigate(-1);
    }
  }, [user?.role, courseId, navigate]);

  const handleJoinFailure = useCallback(async (message) => {
    await cleanupClient();
    setStatus('error');
    setErrorMsg(message || 'Failed to join the meeting. Please try again.');
  }, [cleanupClient]);

  const handleLeave = useCallback(async () => {
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;

    if (attendanceRecorded.current) {
      try {
        await zoomService.leaveAttendance(meetingId);
      } catch (e) {
        console.warn('Leave attendance error:', e);
      }
    }

    await cleanupClient();
    goBack();
  }, [meetingId, cleanupClient, goBack]);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        setStatus('loading');
        setErrorMsg('');
        hasJoinedRef.current = false;
        // #region agent log
        fetch('http://127.0.0.1:7426/ingest/3c625e6b-f1af-45ab-a819-1fb708d0e578',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'947982'},body:JSON.stringify({sessionId:'947982',runId:'initial',hypothesisId:'H2',location:'ZoomClassroom.jsx:init:start',message:'Zoom classroom init started',data:{meetingId,courseId,role:user?.role||null,isHost},timestamp:Date.now()})}).catch(()=>{});
        // #endregion

        const ZoomMtgEmbedded = getZoomEmbedded();

        if (!isMounted) return;
        setStatus('joining');

        const role = isHost ? 1 : 0;
        const { data: sigData } = await zoomService.getSignature(meetingId, role);
        const { signature, sdkKey, meetingNumber, password } = sigData.data;
        // #region agent log
        fetch('http://127.0.0.1:7426/ingest/3c625e6b-f1af-45ab-a819-1fb708d0e578',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'947982'},body:JSON.stringify({sessionId:'947982',runId:'initial',hypothesisId:'H3',location:'ZoomClassroom.jsx:init:signature',message:'Zoom signature payload received',data:{hasSignature:Boolean(signature),sdkKeyPrefix:sdkKey?String(sdkKey).slice(0,6):null,meetingNumberType:typeof meetingNumber,meetingNumber:String(meetingNumber||''),passwordLength:password?String(password).length:0},timestamp:Date.now()})}).catch(()=>{});
        // #endregion

        if (!isMounted) return;

        const client = ZoomMtgEmbedded.createClient();
        clientRef.current = client;
        // #region agent log
        fetch('http://127.0.0.1:7426/ingest/3c625e6b-f1af-45ab-a819-1fb708d0e578',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'947982'},body:JSON.stringify({sessionId:'947982',runId:'initial',hypothesisId:'H2',location:'ZoomClassroom.jsx:init:createClient',message:'Zoom client created',data:{hasClient:Boolean(client),hasOn:Boolean(client&&typeof client.on==='function'),hasInit:Boolean(client&&typeof client.init==='function'),hasJoin:Boolean(client&&typeof client.join==='function')},timestamp:Date.now()})}).catch(()=>{});
        // #endregion

        client.on('connection-change', (payload) => {
          // #region agent log
          fetch('http://127.0.0.1:7426/ingest/3c625e6b-f1af-45ab-a819-1fb708d0e578',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'947982'},body:JSON.stringify({sessionId:'947982',runId:'initial',hypothesisId:'H2',location:'ZoomClassroom.jsx:connection-change',message:'Zoom connection state changed',data:{state:payload?.state||null,reason:payload?.reason||null,errorMessage:payload?.errorMessage||null},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
          if (!isMounted) return;
          if (payload.state === 'Fail') {
            handleJoinFailure(
              payload.reason || payload.errorMessage || 'Failed to join the meeting. Signature may be invalid.'
            );
          } else if (payload.state === 'Closed' && hasJoinedRef.current) {
            handleLeave();
          }
        });

        await client.init({
          debug: false,
          zoomAppRoot: containerRef.current,
          language: 'en-US',
          patchJsMedia: true,
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

        if (!isMounted) return;

        await client.join({
          signature,
          sdkKey,
          meetingNumber: String(meetingNumber),
          password: password || '',
          userName: user?.name || 'Guest',
          userEmail: user?.email || '',
          role,
        });

        if (!isMounted) return;
        hasJoinedRef.current = true;
        setStatus('live');

        try {
          await zoomService.joinAttendance(meetingId);
          attendanceRecorded.current = true;
        } catch (e) {
          console.warn('Join attendance error:', e);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Zoom init error:', err);
        // #region agent log
        fetch('http://127.0.0.1:7426/ingest/3c625e6b-f1af-45ab-a819-1fb708d0e578',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'947982'},body:JSON.stringify({sessionId:'947982',runId:'initial',hypothesisId:'H2',location:'ZoomClassroom.jsx:init:catch',message:'Zoom classroom init failed',data:{message:err?.message||null,name:err?.name||null,reason:err?.reason||null,errorMessage:err?.errorMessage||null,stackTop:err?.stack?String(err.stack).split('\n').slice(0,2).join(' | '):null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        const msg =
          err?.reason ||
          err?.errorMessage ||
          err?.message ||
          'Failed to start the classroom. Please try again.';
        await handleJoinFailure(msg);
      }
    };

    init();

    return () => {
      isMounted = false;
      cleanupClient();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  useEffect(() => {
    const onError = (event) => {
      // #region agent log
      fetch('http://127.0.0.1:7426/ingest/3c625e6b-f1af-45ab-a819-1fb708d0e578',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'947982'},body:JSON.stringify({sessionId:'947982',runId:'initial',hypothesisId:'H8',location:'ZoomClassroom.jsx:window:error',message:'Window error captured on Zoom page',data:{message:event?.message||null,filename:event?.filename||null,lineno:event?.lineno||null,colno:event?.colno||null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    };
    const onUnhandledRejection = (event) => {
      // #region agent log
      fetch('http://127.0.0.1:7426/ingest/3c625e6b-f1af-45ab-a819-1fb708d0e578',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'947982'},body:JSON.stringify({sessionId:'947982',runId:'initial',hypothesisId:'H8',location:'ZoomClassroom.jsx:window:unhandledrejection',message:'Unhandled rejection captured on Zoom page',data:{reasonMessage:event?.reason?.message||String(event?.reason||''),reasonName:event?.reason?.name||null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    const onUnload = () => {
      if (attendanceRecorded.current) {
        const token = localStorage.getItem('accessToken');
        fetch(`${API_URL}/zoom/${meetingId}/attendance/leave`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          keepalive: true,
          credentials: 'include',
        }).catch(() => {});
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
          onClick={status === 'error' ? goBack : handleLeave}
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
          ✕ {status === 'error' ? 'Go Back' : 'Leave Class'}
        </button>
      </div>

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
            onClick={goBack}
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
