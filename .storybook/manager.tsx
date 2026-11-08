import React, { useState } from "react";
import type { ComponentType } from "react";
import { addons, types, useGlobals, useGlobalTypes, useStorybookApi, useStorybookState } from "storybook/manager-api";
import { IconButton, Separator, TooltipLinkList, WithTooltip } from "storybook/internal/components";
import { ContrastIcon, MirrorIcon, PaintBrushIcon } from "@storybook/icons";

/**
 * The skin's toolbar. Every skin declares its globals' toolbars in its own Storybook setup (src/skins/<skin>/storybook.tsx)
 * and .storybook/preview.tsx stamps each with its skin's `section` and hands its toolbar over as `skinToolbar`, so
 * Storybook's own toolbar, which would draw every skin's menus on every story, has none to draw: this draws only the open
 * story's skin's, each labelled with its name and value.
 */
/** The toolbar icons the skins name, by the name a skin's `storybook.tsx` gives (Storybook's own toolbar's names). */
const ICONS: Record<string, ComponentType> = { contrast: ContrastIcon, mirror: MirrorIcon, paintbrush: PaintBrushIcon };

interface SkinToolbar {
  title: string;
  icon?: string;
  items: { value: string; title: string }[];
}

interface SkinGlobalType {
  description?: string;
  section?: string;
  skinToolbar?: SkinToolbar;
}

const ADDON_ID = "dashhaus/skin-toolbar";

function SkinMenu({ id, type }: { id: string; type: SkinGlobalType & { skinToolbar: SkinToolbar } }) {
  const [globals, updateGlobals, storyGlobals] = useGlobals();
  const [open, setOpen] = useState(false);
  const { title, icon, items } = type.skinToolbar;
  const Icon = icon ? ICONS[icon] : undefined;
  const current = items.find((item) => item.value === globals[id]);
  const locked = id in storyGlobals;
  return (
    <WithTooltip
      placement="top"
      closeOnOutsideClick
      onVisibleChange={setOpen}
      tooltip={({ onHide }) => (
        <TooltipLinkList
          links={items.map((item) => ({
            id: item.value,
            title: item.title,
            active: item.value === globals[id],
            disabled: locked,
            onClick: () => { updateGlobals({ [id]: item.value }); onHide(); },
          }))}
        />
      )}
    >
      <IconButton active={open} disabled={locked} title={type.description ?? title}>
        {Icon && <Icon />}
        <span style={{ marginLeft: Icon ? 6 : 0 }}>{title}: {current?.title ?? "none"}</span>
      </IconButton>
    </WithTooltip>
  );
}

function SkinToolbar() {
  useStorybookState();
  const title = useStorybookApi().getCurrentStoryData()?.title;
  const globalTypes = useGlobalTypes() as Record<string, SkinGlobalType>;
  const menus = Object.entries(globalTypes).filter(
    (entry): entry is [string, SkinGlobalType & { skinToolbar: SkinToolbar }] => {
      const [, type] = entry;
      return !!type.skinToolbar && !!type.section && !!title?.startsWith(`${type.section}/`);
    },
  );
  if (!menus.length) return null;
  return (
    <>
      <Separator />
      {menus.map(([id, type]) => <SkinMenu key={id} id={id} type={type} />)}
    </>
  );
}

addons.register(ADDON_ID, () => {
  addons.add(ADDON_ID, {
    title: "Skin toolbar",
    type: types.TOOL,
    match: ({ tabId }) => !tabId,
    render: () => <SkinToolbar />,
  });
});
