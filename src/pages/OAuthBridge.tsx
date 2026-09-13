import { useEffect } from "react";

// The sign-in broker lives at /~oauth/* and is served by Lovable's edge proxy.
// If a browser lands here inside the app (e.g. the editor preview domain, where
// the proxy doesn't intercept), forward the whole request to the published site
// so the sign-in flow can finish instead of showing a 404.
const PUBLISHED_ORIGIN = "https://integralstocks.lovable.app";

const OAuthBridge = () => {
  useEffect(() => {
    const { pathname, search, hash, origin } = window.location;
    if (origin === PUBLISHED_ORIGIN) return; // nothing we can do; proxy should have handled it
    window.location.replace(`${PUBLISHED_ORIGIN}${pathname}${search}${hash}`);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Finishing sign-in…</p>
    </div>
  );
};

export default OAuthBridge;
