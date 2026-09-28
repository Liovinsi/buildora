// Meta's official JavaScript SDK + WhatsApp Embedded Signup.
// https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/implementation

const SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js';
const SESSION_WAIT_MS = 3000;

let sdkPromise = null;

/** Load and init the Facebook JS SDK once per page. Resolves with window.FB. */
export function loadFacebookSdk({ appId, version }) {
  // Meta rejects anything else with "Invalid app ID"; fail here with a clearer message.
  if (!/^\d+$/.test(String(appId ?? ''))) {
    return Promise.reject(new Error('Meta sign-in is misconfigured: the backend META_APP_ID is not a numeric Meta App ID.'));
  }
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
 * The SDK picks its own per-call redirect_uri for the OAuth dialog, and Meta only exchanges the
 * code with that exact value. FB.login opens the dialog synchronously, so read it from window.open.
 */
function captureDialogRedirectUri(openDialog) {
  const originalOpen = window.open;
  let redirectUri;
  window.open = function (url, ...rest) {
    try {
      const u = new URL(String(url), window.location.href);
      if (u.pathname.endsWith('/dialog/oauth')) redirectUri = u.searchParams.get('redirect_uri') ?? undefined;
    } catch {
      // not a URL we care about
    }
    return originalOpen.call(this, url, ...rest);
  };
  try {
    openDialog();
  } finally {
    window.open = originalOpen;
  }
  return redirectUri;
}

// FB.login returned no authorization code. Say which case it was instead of one generic message.
function noCodeError(status, session, sawSignupMessage) {
  if (session) {
    return new Error('Meta finished the WhatsApp setup but did not return an authorization code. Please click Connect WhatsApp again.');
  }
  if (status === 'not_authorized') {
    return new SignupCancelled('Buildora was not given permission in the Meta window. Accept the permissions to connect WhatsApp.');
  }
  if (!sawSignupMessage) {
    // Meta error pages (e.g. "Invalid app ID") close without telling this page anything.
    return new SignupCancelled(
      'The Meta window closed before WhatsApp setup started. If Meta showed an error there (such as "Invalid app ID"), the Meta app is misconfigured; otherwise click the button to try again.'
    );
  }
  return new SignupCancelled('WhatsApp setup was closed before it finished.');
}

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
    let sawSignupMessage = false;

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
        // Keep Meta's error and session IDs: Meta support needs them to look the failure up.
        const ref = [data.data.error_id && `error ${data.data.error_id}`, data.data.session_id && `session ${data.data.session_id}`]
          .filter(Boolean)
          .join(', ');
        failure = new Error(`Meta reported an error: ${data.data.error_message}${ref ? ` (${ref})` : ''}`);
      } else if (data.event === 'CANCEL') {
        const step = data.data?.current_step;
        failure = new SignupCancelled(
          step
            ? `WhatsApp setup was closed at the "${step.replaceAll('_', ' ').toLowerCase()}" step before it finished.`
            : 'WhatsApp setup was closed before it finished.'
        );
      }
      sawSignupMessage = true;
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
    const redirectUri = captureDialogRedirectUri(() => FB.login(
      (response) => {
        const code = response?.authResponse?.code;
        waitForSession().then(() => {
          cleanup();
          if (failure) return reject(failure);
          if (!code) return reject(noCodeError(response?.status, session, sawSignupMessage));
          resolve({ code, redirectUri, ...(session || {}) });
        });
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        // v3 session info: FINISH* events carry waba_id / phone_number_id / business_id.
        extras: { setup: {}, sessionInfoVersion: '3' },
      }
    ));
  });
}
