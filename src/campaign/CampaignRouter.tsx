import { lazy, Suspense, useState } from "react";
import { freshSession, type Session } from "../firstlight/persistence";
import { CAMPAIGN_SAVE_KEY, loadCampaign, saveCampaign } from "./persistence";
import type { CampaignState } from "./types";
import "../firstlight/firstLight.css";

function DownloadFailure() {
  return (
    <main className="fl-world-loading">
      <p>This part of the story could not finish downloading.</p>
      <button onClick={() => location.reload()}>Retry the story</button>
    </main>
  );
}
const FirstLightApp = lazy(() =>
  import("../firstlight/FirstLightApp").catch(() => ({
    default: DownloadFailure,
  })),
);
const CampaignApp = lazy(() =>
  import("./CampaignApp").catch(() => ({ default: DownloadFailure })),
);

/** A valid campaign save contains its canonical First Light origin for portability. */
export default function CampaignRouter() {
  const [loaded] = useState(loadCampaign);
  const [campaign, setCampaign] = useState(loaded.state);
  const [firstLightOverride, setFirstLightOverride] = useState<
    Session | undefined
  >();
  const [notice, setNotice] = useState(loaded.notice);
  function begin(state: CampaignState) {
    saveCampaign(state);
    setCampaign(state);
  }
  function replayFirstLight() {
    try {
      localStorage.removeItem(CAMPAIGN_SAVE_KEY);
    } catch {
      setNotice(
        "Storage is unavailable. This replay is kept in this session; export your progress to keep it.",
      );
    }
    setFirstLightOverride(freshSession());
    setCampaign(null);
  }
  return (
    <Suspense
      fallback={
        <div className="fl-world-loading">
          <span className="fl-loading-ring" />
          <p>Opening the next part of your story…</p>
        </div>
      }
    >
      {campaign ? (
        <CampaignApp
          initialState={campaign}
          onReturnToFirstLight={replayFirstLight}
        />
      ) : (
        <FirstLightApp
          onCampaignReady={begin}
          initialSession={firstLightOverride}
          startupNotice={notice}
        />
      )}
    </Suspense>
  );
}
