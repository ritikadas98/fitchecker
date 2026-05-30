/**
 * Fake Chrome browser window. Holds three tabs (the fixtures), a URL bar
 * that updates with the active tab, and a two-column content area: the PDP
 * mock on the left, the real FitCheck side panel as children on the right.
 */
import { FIXTURE_ORDER, FIXTURES, type FixtureKey } from "./fixtures";
import { PdpMock } from "./PdpMock";

interface Props {
  activeTab: FixtureKey;
  onTabChange: (k: FixtureKey) => void;
  children: React.ReactNode;
}

export function ChromeWindow({ activeTab, onTabChange, children }: Props) {
  const activeFixture = FIXTURES[activeTab];

  return (
    <div className="chrome-window">
      {/* Title bar with traffic lights + tabs */}
      <div className="chrome-titlebar">
        <div className="chrome-traffic-lights" aria-hidden>
          <span className="tl tl-close" />
          <span className="tl tl-min" />
          <span className="tl tl-max" />
        </div>
        <div className="chrome-tabs" role="tablist">
          {FIXTURE_ORDER.map((key) => {
            const f = FIXTURES[key];
            const isActive = key === activeTab;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={isActive}
                className={`chrome-tab${isActive ? " active" : ""}`}
                onClick={() => onTabChange(key)}
                title={f.tabLabel}
              >
                <span
                  className="chrome-tab-favicon"
                  style={{ background: f.retailerAccent }}
                />
                <span className="chrome-tab-label">{f.tabLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* URL toolbar */}
      <div className="chrome-toolbar">
        <span className="chrome-nav-arrows" aria-hidden>
          ← → ⟳
        </span>
        <div className="chrome-url-bar">
          <span className="chrome-url-lock" aria-hidden>
            🔒
          </span>
          <span className="chrome-url-text">{activeFixture.pdpUrl}</span>
        </div>
        <span className="chrome-icons" aria-hidden>
          ⋮
        </span>
      </div>

      {/* Two-column content */}
      <div className="chrome-content">
        <main className="chrome-pdp" role="main">
          <PdpMock fixture={activeFixture} />
        </main>
        <aside className="chrome-sidepanel" aria-label="FitCheck side panel">
          {children}
        </aside>
      </div>
    </div>
  );
}
