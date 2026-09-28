import { useCallback, useEffect, useState } from 'react';
import { CircleAlert, CircleCheck, Inbox, LoaderCircle, MessageCircle, ShieldCheck, Unlink } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorState, PageLoader } from '../components/ui/Feedback';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { useApi } from '../hooks/useApi';
import { useCurrentBusiness } from '../hooks/useCurrentBusiness';
import { useToast } from '../hooks/useToast';
import { whatsappService } from '../services/whatsappService';
import { maskPhone } from '../utils/format';
import { launchEmbeddedSignup, loadFacebookSdk, SignupCancelled } from '../utils/metaSdk';

function Alert({ tone = 'red', children }) {
  const tones = {
    red: 'border-red-200 bg-red-50 text-red-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
  };
  return (
    <div className={`flex gap-2.5 rounded-xl border p-3.5 text-left text-sm ${tones[tone]}`} role="alert">
      <CircleAlert className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function StatusRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-right font-medium text-neutral-900">{children}</dd>
    </div>
  );
}

// phase: idle -> meta (owner is in Meta's window) -> finishing (backend completes setup) -> idle
export default function WhatsAppConnectPage() {
  const { business, refresh } = useCurrentBusiness();
  const toast = useToast();
  const load = useCallback(
    () => Promise.all([whatsappService.status(business._id), whatsappService.config()]),
    [business._id]
  );
  const { data, loading, error, reload, setData } = useApi(load, [load]);
  const [status, config] = data || [];

  const [fb, setFb] = useState(null);
  const [sdkError, setSdkError] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [connectError, setConnectError] = useState(null);
  const [cancelled, setCancelled] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const needsSdk = config?.available && (!status?.connected || status?.needsReconnect);

  // Load Meta's SDK ahead of the click, so FB.login opens directly from the button (popup blockers).
  const prepareSdk = useCallback(() => {
    setSdkError(null);
    loadFacebookSdk({ appId: config.appId, version: config.apiVersion }).then(setFb, (err) => setSdkError(err.message));
  }, [config]);

  useEffect(() => {
    if (needsSdk && !fb) prepareSdk();
  }, [needsSdk, fb, prepareSdk]);

  const applyStatus = async (next) => {
    setData([next, config]);
    await refresh(); // keeps the sidebar / dashboard WhatsApp status in sync
  };

  function connect() {
    if (phase !== 'idle') return;
    setConnectError(null);
    setCancelled(null);
    // The platform's Meta app isn't configured on this server: never pretend to connect.
    if (!config.available) {
      setUnavailable(true);
      return;
    }
    if (!fb) return;
    setPhase('meta');
    launchEmbeddedSignup(fb, { configId: config.configId })
      .then(async (result) => {
        setPhase('finishing');
        await applyStatus(await whatsappService.connect({ businessId: business._id, ...result }));
        toast.success('WhatsApp connected');
      })
      .catch((err) => {
        if (err instanceof SignupCancelled) setCancelled(err.message);
        else setConnectError(err.message);
      })
      .finally(() => setPhase('idle'));
  }

  async function disconnect() {
    setDisconnecting(true);
    try {
      await applyStatus(await whatsappService.disconnect(business._id));
      setConfirmDisconnect(false);
      toast.success('WhatsApp disconnected');
    } catch (err) {
      toast.error(err);
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const busy = phase !== 'idle';
  const preparing = config.available && !fb && !sdkError;
  const connectButton = (label) => (
    <Button variant="whatsapp" size="lg" onClick={connect} loading={busy || preparing} disabled={busy || preparing}>
      {!busy && !preparing && <MessageCircle className="size-5" />}
      {phase === 'meta' ? 'Waiting for Meta…' : phase === 'finishing' ? 'Finishing setup…' : preparing ? 'Preparing…' : label}
    </Button>
  );

  const feedback = (
    <div className="space-y-3">
      {phase === 'meta' && <p className="text-sm text-neutral-500">Complete the steps in the Meta window. Keep this page open.</p>}
      {phase === 'finishing' && (
        <p className="flex items-center justify-center gap-2 text-sm text-neutral-500">
          <LoaderCircle className="size-4 animate-spin" /> Activating your number for Buildora. This can take a few seconds.
        </p>
      )}
      {unavailable && (
        <Alert tone="amber">
          <div className="font-medium">WhatsApp connection can’t be started right now</div>
          Buildora’s WhatsApp integration is still being set up. Please try again later or contact Buildora support.
          {import.meta.env.DEV && (
            <div className="mt-2 border-t border-amber-200 pt-2 text-xs">
              <span className="font-semibold">Developer:</span> set <code>META_APP_ID</code>, <code>META_APP_SECRET</code>,{' '}
              <code>EMBEDDED_SIGNUP_CONFIG_ID</code> and <code>TOKEN_ENCRYPTION_KEY</code> in the backend <code>.env</code>, restart it, then{' '}
              <button onClick={() => { setUnavailable(false); reload(); }} className="font-medium underline">check again</button>.
            </div>
          )}
        </Alert>
      )}
      {cancelled && !busy && <Alert tone="amber">{cancelled} Click the button again whenever you’re ready.</Alert>}
      {connectError && !busy && (
        <Alert>
          <div className="font-medium">Couldn’t connect WhatsApp</div>
          {connectError}
        </Alert>
      )}
      {sdkError && (
        <Alert>
          {sdkError} <button onClick={prepareSdk} className="font-medium underline">Try again</button>
        </Alert>
      )}
    </div>
  );

  return (
    <>
      <PageHeader title="WhatsApp" description="Receive customer WhatsApp messages in Buildora and reply from your inbox." />

      <Card className="mx-auto max-w-xl">
        {status.connected ? (
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-whatsapp text-white">
                <MessageCircle className="size-6" />
              </div>
              <div className="min-w-0">
                <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.needsReconnect ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
                  <span className={`size-2 rounded-full ${status.needsReconnect ? 'bg-amber-500' : 'bg-whatsapp'}`} />
                  {status.needsReconnect ? 'Needs reconnecting' : 'Connected'}
                </div>
                <div className="mt-1 truncate text-lg font-semibold">{status.verifiedName || business.name}</div>
                <div className="text-sm tracking-wide text-neutral-600">{status.displayPhoneNumber ? maskPhone(status.displayPhoneNumber) : 'WhatsApp Business number'}</div>
              </div>
              {!status.needsReconnect && <CircleCheck className="ml-auto size-6 shrink-0 text-emerald-600" />}
            </div>

            <dl className="mt-6 divide-y divide-neutral-100 border-y border-neutral-100">
              <StatusRow label="Status">{status.needsReconnect ? <span className="text-amber-700">Reconnect required</span> : <span className="text-emerald-700">Active · receiving messages</span>}</StatusRow>
              <StatusRow label="Business name">{status.verifiedName || business.name}</StatusRow>
              <StatusRow label="Phone number">{status.displayPhoneNumber ? maskPhone(status.displayPhoneNumber) : '—'}</StatusRow>
              {status.connectedAt && <StatusRow label="Connected on">{new Date(status.connectedAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</StatusRow>}
            </dl>

            {status.needsReconnect && (
              <div className="mt-6 space-y-4 text-center">
                <Alert tone="amber">
                  Meta no longer allows Buildora to use this number (access expired or was removed). Reconnect to keep receiving and
                  replying to messages.
                </Alert>
                {connectButton('Reconnect WhatsApp')}
                {feedback}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              <Button to="/dashboard/inbox"><Inbox className="size-4" /> Open Inbox</Button>
              <Button variant="danger" onClick={() => setConfirmDisconnect(true)}><Unlink className="size-4" /> Disconnect</Button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center sm:p-10">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-whatsapp text-white shadow-sm">
              <MessageCircle className="size-8" />
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight">Connect your WhatsApp Business</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-600">
              Messages your customers send to your WhatsApp Business number will appear in your Buildora Inbox, so you can read and
              reply to them in one place.
            </p>
            <div className="mt-6">{connectButton('Connect WhatsApp')}</div>
            <div className="mx-auto mt-4 max-w-md">{feedback}</div>
            <p className="mt-6 flex items-center justify-center gap-1.5 text-xs font-medium text-neutral-500">
              <ShieldCheck className="size-4 text-emerald-600" /> Secure connection powered by Meta
            </p>
            <p className="mt-1 text-xs text-neutral-400">You’ll sign in with Meta and choose your WhatsApp Business number.</p>
          </div>
        )}
      </Card>

      <Modal
        open={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        title="Disconnect WhatsApp?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDisconnect(false)}>Cancel</Button>
            <Button variant="danger" loading={disconnecting} onClick={disconnect}>Disconnect</Button>
          </>
        }
      >
        <p className="text-sm text-neutral-600">
          New WhatsApp messages will no longer appear in this inbox and you won’t be able to reply. Existing conversations are kept.
        </p>
      </Modal>
    </>
  );
}
