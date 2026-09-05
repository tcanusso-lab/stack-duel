/**
 * Rewarded ads: native AdMob on Capacitor Android, mock dialog on web.
 * Always optional — callers must keep a no-ad path (Play again).
 */
(function (global) {
  "use strict";

  const cfg = () => global.STACK_DUEL_ADS || {
    APP_ID: "ca-app-pub-3940256099942544~3347511713",
    REWARDED_UNIT_ID: "ca-app-pub-3940256099942544/5224354917",
    MOCK_DELAY_MS: 1500,
  };

  function isNative() {
    try {
      return !!(global.Capacitor && global.Capacitor.isNativePlatform && global.Capacitor.isNativePlatform());
    } catch (_) {
      return false;
    }
  }

  async function getAdMob() {
    // Loaded by Capacitor runtime on device; web keeps mock only.
    const Cap = global.Capacitor;
    if (!Cap || !Cap.Plugins || !Cap.Plugins.AdMob) {
      // community plugin may register as AdMob on Plugins
      if (global.AdMob) return global.AdMob;
      throw new Error("AdMob plugin unavailable");
    }
    return Cap.Plugins.AdMob;
  }

  let initialized = false;
  let prepared = false;

  async function init() {
    if (!isNative() || initialized) return;
    const AdMob = await getAdMob();
    await AdMob.initialize({
      testingDevices: [],
      initializeForTesting: true,
    });
    initialized = true;
  }

  async function prepareRewarded() {
    if (!isNative()) return;
    try {
      await init();
      const AdMob = await getAdMob();
      const id = cfg().REWARDED_UNIT_ID;
      await AdMob.prepareRewardVideoAd({ adId: id, isTesting: true });
      prepared = true;
    } catch (err) {
      prepared = false;
      console.warn("AdMob prepare failed", err);
    }
  }

  function showMockAd() {
    return new Promise((resolve, reject) => {
      const modal = document.getElementById("ad-modal");
      const done = document.getElementById("btn-ad-done");
      const skip = document.getElementById("btn-ad-skip");
      const title = document.getElementById("ad-modal-title");
      const sub = document.getElementById("ad-modal-sub");
      if (!modal || !done || !skip) {
        reject(new Error("mock ad UI missing"));
        return;
      }

      modal.classList.remove("hidden");
      modal.classList.remove("ready");
      done.classList.add("hidden");
      title.textContent = "Watching ad…";
      sub.textContent = "Mock rewarded ad";

      let timer = null;
      const cleanup = () => {
        if (timer) clearTimeout(timer);
        done.onclick = null;
        skip.onclick = null;
      };

      skip.onclick = () => {
        cleanup();
        modal.classList.add("hidden");
        reject(new Error("cancelled"));
      };

      timer = setTimeout(() => {
        timer = null;
        modal.classList.add("ready");
        title.textContent = "Ad watched";
        sub.textContent = "Reward unlocked · Vendetta!";
        done.classList.remove("hidden");
        done.onclick = () => {
          cleanup();
          modal.classList.add("hidden");
          resolve();
        };
      }, cfg().MOCK_DELAY_MS || 1500);
    });
  }

  async function showRewarded() {
    if (!isNative()) {
      return showMockAd();
    }
    try {
      await init();
      const AdMob = await getAdMob();
      if (!prepared) {
        await prepareRewarded();
      }
      const result = await AdMob.showRewardVideoAd();
      prepared = false;
      // preload next
      prepareRewarded();
      if (result && result.rewarded === false) {
        throw new Error("not rewarded");
      }
      return result;
    } catch (err) {
      console.warn("Native rewarded failed, falling back to mock", err);
      return showMockAd();
    }
  }

  global.StackDuelAds = {
    isNative,
    init,
    prepareRewarded,
    showRewarded,
    showMockAd,
  };
})(window);
