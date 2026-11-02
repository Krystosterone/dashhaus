import { HaLight, useHaAreas } from "@dashhaus/core";

/** The house by area, from Home Assistant's registries: each area's lights, under its name. */
export function LightsByArea() {
  const areas = useHaAreas();
  if (!areas) return <p>Reading the areas…</p>;
  return (
    <>
      {areas.map(({ area, entityIds }) => {
        const lights = entityIds.filter((id) => id.startsWith("light."));
        if (lights.length === 0) return null;
        return (
          <section key={area.id} aria-label={area.name}>
            <h2>{area.name}</h2>
            {lights.map((id) => (
              <HaLight key={id} entityId={id} loadHistory={false}>
                {({ entity, actions }) => (
                  <button type="button" aria-pressed={entity.state === "on"} onClick={actions.onToggle}>
                    {entity.name}
                  </button>
                )}
              </HaLight>
            ))}
          </section>
        );
      })}
    </>
  );
}
