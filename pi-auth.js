// pi-auth.js — initializes the Pi SDK and logs basic status
(function() {
  const sdkScript = document.createElement('script');
  sdkScript.src = 'https://sdk.minepi.com/pi-sdk.js';
  sdkScript.async = true;

  sdkScript.onload = () => {
    console.log('✅ Pi SDK loaded successfully');
    if (window.Pi && window.Pi.init) {
      try {
        window.Pi.init({ sandbox: false });
        console.log('🚀 Pi SDK initialized (Production Mode)');
      } catch (e) {
        console.error('❌ Pi SDK init error:', e);
      }
    }
  };

  sdkScript.onerror = () => {
    console.error('⚠️ Failed to load Pi SDK');
  };

  document.head.appendChild(sdkScript);
})();
