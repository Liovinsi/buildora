// Meta's official JavaScript SDK + WhatsApp Embedded Signup.
// https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/implementation

const SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js';
const SESSION_WAIT_MS = 3000;

let sdkPromise = null;

/** Load and init the Facebook JS SDK once per page. Resolves with window.FB. */
export function loadFacebookSdk({ appId, version }) {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const init = () => {
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version });
      resolve(window.FB);
    };
    if (window.FB) return init();
    window.fbAsyncInit = init;

    const script = document.createElement('script');
    script.src = SDK_SRC;
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => {
      sdkPromise = null;
      script.remove();
      reject(new Error('Could not load Meta sign-in. If you use an ad or tracker blocker, allow this page and try again.'));
    };
    document.body.appendChild(script);
  });
  return sdkPromise;
}

export class SignupCancelled extends Error {}

/**
 * Open Embedded Signup. MUST be called directly from a click handler (popup blockers).
 * Resolves with { code, event, wabaId, phoneNumberId }; rejects with SignupCancelled if the
 * user closes the window, or an Error if Meta reports one.
 */
export function launchEmbeddedSignup(FB, { configId }) {
  return new Promise((resolve, reject) => {
    let session = null;
    let failure = null;
    let onSession = null;

    const onMessage = (e) => {
      let host = '';
      try {
        host = new URL(e.origin).hostname;
      } catch {
        return;
      }
      if (host !== 'facebook.com' && !host.endsWith('.facebook.com')) return;
      let data = e.data;
      try {
        if (typeof data === 'string') data = JSON.parse(data);
      } catch {
        return;
      }
      if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;

      if (String(data.event).startsWith('FINISH')) {
        session = { event: data.event, wabaId: data.data?.waba_id, phoneNumberId: data.data?.phone_number_id };
      } else if (data.data?.error_message) {
        failure = new Error(data.data.error_message);
      } else if (data.event === 'CANCEL') {
        failure = new SignupCancelled('WhatsApp setup was not finished.');
      }
      onSession?.();
    };
    window.addEventListener('message', onMessage);
    const cleanup = () => window.removeEventListener('message', onMessage);

    // The FINISH message usually arrives before the login callback, but not always.
    const waitForSession = () =>
      new Promise((done) => {
        if (session || failure) return done();
        const timer = setTimeout(done, SESSION_WAIT_MS);
        onSession = () => {
          clearTimeout(timer);
          done();
        };
      });

    // FB.login requires a plain (non-async) callback.
    FB.login(
      (response) => {
        const code = response?.authResponse?.code;
        waitForSession().then(() => {
          cleanup();
          if (failure) return reject(failure);
          if (!code) return reject(new SignupCancelled('WhatsApp setup was not finished.'));
          resolve({ code, ...(session || {}) });
        });
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        // v3 session info: FINISH* events carry waba_id / phone_number_id / business_id.
        extras: { setup: {}, sessionInfoVersion: '3' },
      }
    );
  });
}
