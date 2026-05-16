import { PillIndicator } from "../components/PillIndicator";
import overlayStyles from "../styles/overlay.css?inline";

type OverlayPageProps = {
  sessionState: import("../api/backend").SessionState;
};

export function OverlayPage({ sessionState }: OverlayPageProps) {
  return (
    <main className="overlay-root">
      <style>{overlayStyles}</style>
      <PillIndicator sessionState={sessionState} />
    </main>
  );
}
