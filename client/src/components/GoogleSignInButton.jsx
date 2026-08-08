import React, { useEffect, useRef, useState } from "react";

const GOOGLE_SCRIPT_ID = "dinefor-google-identity-services";
const GOOGLE_SCRIPT_URL = "https://accounts.google.com/gsi/client";

function loadGoogleIdentityScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google);
      return;
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);

    if (existingScript) {
      const handleLoad = () => resolve(window.google);
      const handleError = () =>
        reject(new Error("Google Identity Services failed to load."));

      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener("error", handleError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_URL;
    script.async = true;
    script.defer = true;

    script.addEventListener(
      "load",
      () => resolve(window.google),
      { once: true }
    );

    script.addEventListener(
      "error",
      () => reject(new Error("Google Identity Services failed to load.")),
      { once: true }
    );

    document.head.appendChild(script);
  });
}

function GoogleSignInButton({
  onCredential,
  onError,
  disabled = false,
}) {
  const buttonContainerRef = useRef(null);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState("loading");

  const clientId = String(
    import.meta.env.VITE_GOOGLE_CLIENT_ID || ""
  ).trim();

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!clientId) {
      setStatus("not-configured");
      return undefined;
    }

    let cancelled = false;

    const initializeGoogle = async () => {
      try {
        setStatus("loading");

        const google = await loadGoogleIdentityScript();

        if (
          cancelled ||
          !mountedRef.current ||
          !buttonContainerRef.current
        ) {
          return;
        }

        if (!google?.accounts?.id) {
          throw new Error("Google Identity Services is unavailable.");
        }

        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            const credential = response?.credential;

            if (!credential) {
              onError?.(
                "Google did not return a valid sign-in credential."
              );
              return;
            }

            onCredential?.(credential);
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: true,
        });

        buttonContainerRef.current.innerHTML = "";

        google.accounts.id.renderButton(
          buttonContainerRef.current,
          {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "pill",
            logo_alignment: "left",
            width: 360,
          }
        );

        if (!cancelled && mountedRef.current) {
          setStatus("ready");
        }
      } catch (error) {
        console.error("Google Sign-In initialization error:", error);

        if (!cancelled && mountedRef.current) {
          setStatus("error");
          onError?.(
            "Google Sign-In could not be loaded. You can still use email and password."
          );
        }
      }
    };

    initializeGoogle();

    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential, onError]);

  if (status === "not-configured") {
    return (
      <div
        className="rounded-xl border border-border-subtle bg-surface-container-low p-3 text-center"
        role="status"
      >
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          Google Sign-In is not configured for this environment.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {status === "loading" && (
        <button
          type="button"
          disabled
          className="btn-outline w-full flex items-center justify-center gap-2 opacity-70"
        >
          <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
          Loading Google Sign-In…
        </button>
      )}

      {status === "error" && (
        <div
          className="rounded-xl bg-error/10 p-3 text-center text-error"
          role="alert"
        >
          <p className="font-label-sm text-label-sm">
            Google Sign-In is temporarily unavailable.
          </p>
        </div>
      )}

      <div
        ref={buttonContainerRef}
        aria-hidden={status !== "ready"}
        className={[
          "w-full flex justify-center overflow-hidden",
          status === "ready" ? "block" : "hidden",
          disabled ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
      />
    </div>
  );
}

export default GoogleSignInButton;
