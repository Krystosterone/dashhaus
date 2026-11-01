import { LovelaceDashboardElement, autoInput, registerCard, scopeToHost } from "@dashhaus/dashboard/skin";
import type { LovelaceHass } from "@dashhaus/dashboard/skin";
import { areaName, friendlyName, groupByArea, sortByName, visibleEntities } from "@dashhaus/dashboard/layout";
import type { AutoInput } from "@dashhaus/dashboard/layout";
import { kindOf, parse__Skin__Config } from "./config";
import type { CardConfig, __Skin__Config } from "./config";
import { renderCard } from "./registry";

export const __SKIN_CONST___CARD_TYPE = "__card_type__";

/**
 * The skin's web fonts, as one Google Fonts stylesheet URL, e.g.
 * "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,700&display=swap".
 * The element links it from the page (a font can't load from inside a shadow root); name the families in
 * styles/tokens.css. Undefined keeps the system stack, and a page without the network keeps it too.
 */
const FONT_HREF: string | undefined = undefined;

const HOST_CSS = `
:host { display: block; height: 100%; }
.__skin__-surface { min-height: 100%; }
.hd-config-error { margin: 16px; padding: 16px; border: 1px solid var(--__skin__-line); border-radius: 12px; background: var(--__skin__-card); color: var(--__skin__-ink); font: 500 13px/1.5 var(--__skin__-sans); white-space: pre-wrap; }
`;

/** Every supported, visible entity as the card its domain picks, by name. */
function autoCards(input: AutoInput): CardConfig[] {
  const cards = visibleEntities(input, (entity) => kindOf(entity) !== undefined).flatMap((entity): CardConfig[] => {
    const card = kindOf(entity);
    return card ? [{ entity, card }] : [];
  });
  return sortByName(cards, (card) => friendlyName(input.states, card.entity));
}

/** `type: custom:__card_type__` on Home Assistant's own authenticated frontend connection. */
export function create__Skin__Card(css: string): CustomElementConstructor {
  const styles = scopeToHost(css) + HOST_CSS;

  return class Dashhaus__Skin__Card extends LovelaceDashboardElement<__Skin__Config> {
    protected readonly styles = styles;
    protected readonly mountClass = "__skin__-surface";
    protected readonly fontHref = FONT_HREF;
    #key?: unknown[];

    static getStubConfig() {
      return { type: "custom:__card_type__" };
    }

    protected parse(raw: unknown) {
      return parse__Skin__Config(raw);
    }

    /** States reach the cards through the store; only the registries and the entity set change the layout. */
    protected changed(_previous: LovelaceHass, next: LovelaceHass) {
      const key = [next.entities, next.devices, next.areas, Object.keys(next.states).length];
      const stale = !this.#key || key.some((value, index) => value !== this.#key![index]);
      this.#key = key;
      return stale;
    }

    protected paintHost(_config: __Skin__Config, hass: LovelaceHass) {
      this.setAttribute("data-theme", hass.themes?.darkMode ? "dark" : "light");
    }

    protected draw(config: __Skin__Config, hass: LovelaceHass) {
      const input = autoInput(hass);
      const cards = (config.cards ?? autoCards(input)).map((card) => ({ ...card, area: card.area ?? areaName(input, card.entity) }));
      const groups = groupByArea(cards);
      return (
        <main className="__skin__-page">
          <header className="__skin__-head"><h1>{config.title}</h1></header>
          {groups.map((group) => (
            <section className="__skin__-area" key={group.area ?? ""}>
              <h2>{group.area ?? "Other"}</h2>
              <div className="__skin__-cards">
                {group.modules.map((card) => <div key={card.entity}>{renderCard(card)}</div>)}
              </div>
            </section>
          ))}
          {cards.length === 0 && <p className="__skin__-empty">No supported entities yet. Add a light or a sensor in Home Assistant.</p>}
        </main>
      );
    }
  };
}

/** Register the element and its card-picker entry. Safe to call twice. */
export function define__Skin__Card(css: string) {
  registerCard(__SKIN_CONST___CARD_TYPE, create__Skin__Card(css), "Dashhaus __Section__", "The __Section__ skin: lights and room sensors, by area.");
}
