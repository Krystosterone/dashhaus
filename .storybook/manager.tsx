import React, { useState } from "react";
import { addons, types, useGlobals, useGlobalTypes, useStorybookApi, useStorybookState } from "storybook/internal/manager-api";
import { Icons, IconButton, Separator, TooltipLinkList, WithTooltip } from "storybook/internal/components";
import type { IconsProps } from "storybook/internal/components";

/**
 * The skin's toolbar. Every skin declares its globals' toolbars in its own Storybook setup (src/skins/<skin>/storybook.tsx)
 * and .storybook/preview.tsx stamps each with its skin's `section`. Storybook's own toolbar addon is off (main.ts), as it
 * draws every skin's menus on every story: this draws only the open story's skin's, each labelled with its name and value.
 */
interface SkinToolbar {
  title: string;
  icon?: IconsProps["icon"];
  items: { value: string; title: string }[];
}

interface SkinGlobalType {
  description?: string;
  section?: string;
  toolbar?: SkinToolbar;
}

const ADDON_ID = "dashhaus/skin-toolbar";

function SkinMenu({ id, type }: { id: string; type: SkinGlobalType & { toolbar: SkinToolbar } }) {
  const [globals, updateGlobals, storyGlobals] = useGlobals();
  const [open, setOpen] = useState(false);
  const { title, icon, items } = type.toolbar;
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
        {icon && <Icons icon={icon} __suppressDeprecationWarning />}
        <span style={{ marginLeft: icon ? 6 : 0 }}>{title}: {current?.title ?? "none"}</span>
      </IconButton>
    </WithTooltip>
  );
}

function SkinToolbar() {
  useStorybookState();
  const title = useStorybookApi().getCurrentStoryData()?.title;
  const globalTypes = useGlobalTypes() as Record<string, SkinGlobalType>;
  const menus = Object.entries(globalTypes).filter(
    (entry): entry is [string, SkinGlobalType & { toolbar: SkinToolbar }] => {
      const [, type] = entry;
      return !!type.toolbar && !!type.section && !!title?.startsWith(`${type.section}/`);
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
