import { LovelaceDashboardElement, registerCard, scopeToHost } from "@dashhaus/dashboard/skin";
import type { LovelaceHass } from "@dashhaus/dashboard/skin";
import tokens from "../styles/tokens.css?inline";
import controlCss from "../cards/control/ControlCard.css?inline";
import readingCss from "../cards/reading/ReadingCard.css?inline";
import { ControlCard } from "../cards/control/ControlCard";
import { ReadingCard } from "../cards/reading/ReadingCard";

export interface FixtureConfig {
  title: string;
}

class FixtureDashboard extends LovelaceDashboardElement<FixtureConfig> {
  protected readonly styles = scopeToHost(`${tokens}\n${controlCss}\n${readingCss}`);

  static getStubConfig() {
    return { type: "custom:dashhaus-fixture" };
  }

  protected parse(raw: unknown): FixtureConfig {
    const value = raw as { title?: unknown } | null;
    return { title: typeof value?.title === "string" ? value.title : "Fixture" };
  }

  protected changed(_previous: LovelaceHass, _next: LovelaceHass) {
    return false;
  }

  protected draw(config: FixtureConfig) {
    return (
      <main className="fx-page">
        <h1 className="fx-title">{config.title}</h1>
        <div className="fx-cards">
          <ControlCard name="Desk lamp" on onToggle={() => undefined} />
          <ReadingCard name="Temperature" value={21.44} unit="°C" />
        </div>
      </main>
    );
  }
}

registerCard("dashhaus-fixture", FixtureDashboard, "Dashhaus Fixture", "The DX fixture skin.");
