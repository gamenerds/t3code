import type {
  AgentIconPositionWhenCollapsed,
  SidebarProjectSortOrder,
} from "@t3tools/contracts/settings";
import { T, useGT } from "gt-react";
import { ChevronRightIcon, ListFilterIcon } from "lucide-react";

import { updateClientSettings, useClientSettings } from "../../hooks/useSettings";
import { cn } from "~/lib/utils";
import {
  Menu,
  MenuCheckboxItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRadioItemIndicator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
} from "../ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { SidebarHeaderIconButton } from "./SidebarThreadHeader";

type SidebarGroupBy = "status" | "folder";

function RadioCheck() {
  return (
    <MenuRadioItemIndicator className="ms-auto">
      {/* Same check as MenuCheckboxItem's indicator. */}
      <svg
        aria-hidden
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
        viewBox="0 0 24 24"
      >
        <path d="M5.252 12.7 10.2 18.63 18.748 5.37" />
      </svg>
    </MenuRadioItemIndicator>
  );
}

/** Sized to the longest option so the menu keeps its width when the value changes. */
function SubmenuValue(props: {
  labels: ReadonlyArray<string | undefined>;
  current: string | undefined;
}) {
  return (
    <span className="ms-auto grid text-end text-muted-foreground">
      {[...new Set(props.labels)].map((label) => (
        <span
          key={label}
          aria-hidden={label !== props.current}
          className={cn("col-start-1 row-start-1", label !== props.current && "invisible")}
        >
          {label}
        </span>
      ))}
    </span>
  );
}

/**
 * The sidebar's view options: how threads are grouped, how project folders are
 * sorted, and what each row shows. Every option is an existing client setting.
 */
export function SidebarViewMenu() {
  const gt = useGT();
  const folderMode = useClientSettings((s) => s.boringSidebarEnabled);
  // Folder rows and Status cards keep separate details-line choices.
  const folderDetailsLine = useClientSettings((s) => s.boringSidebarMultilineRows);
  const cardDetailsLine = useClientSettings((s) => s.sidebarCardDetailsLine);
  const multilineRows = folderMode ? folderDetailsLine : cardDetailsLine;
  const collapsedRows = useClientSettings((s) => s.sidebarCollapsedRows);
  const folderAgentIcon = useClientSettings((s) => s.sidebarFolderAgentIcon);
  const viewAppliesToShelves = useClientSettings((s) => s.sidebarViewAppliesToShelves);
  const projectIcon = useClientSettings((s) => s.sidebarProjectIcon);
  const collapsedProjectName = useClientSettings((s) => s.sidebarCollapsedProjectName);
  const agentIconPosition = useClientSettings((s) => s.agentIconPositionWhenCollapsed);
  const afterDetailsLabel = gt("After details", { $context: "sidebar agent icon position" });
  const agentIconLabels: Record<AgentIconPositionWhenCollapsed, string> = {
    beforeProject: gt("Before project", { $context: "sidebar agent icon position" }),
    afterProject: gt("Before thread", { $context: "sidebar agent icon position" }),
    afterThreadName: gt("Before time", { $context: "sidebar agent icon position" }),
    afterTime: gt("After time", { $context: "sidebar agent icon position" }),
    // With the details line on, "none" puts the icon at the end of that line.
    none: multilineRows
      ? afterDetailsLabel
      : gt("None", { $context: "sidebar agent icon position" }),
  };
  const workingShelf = useClientSettings((s) => s.sidebarWorkingShelfEnabled);
  const projectSort = useClientSettings((s) => s.sidebarProjectSortOrder);
  const groupBy: SidebarGroupBy = folderMode ? "folder" : "status";
  const groupLabels: Record<SidebarGroupBy, string> = {
    status: gt("Status", { $context: "sidebar group by option" }),
    folder: gt("Project", { $context: "sidebar group by option" }),
  };
  const sortLabels: Record<SidebarProjectSortOrder, string> = {
    updated_at: gt("Last updated", { $context: "sidebar sort option" }),
    created_at: gt("Created", { $context: "sidebar sort option" }),
    manual: gt("Manual", { $context: "sidebar sort option" }),
  };
  const label = gt("View options");
  return (
    <Menu>
      <MenuTrigger render={<SidebarHeaderIconButton label={label} />}>
        <ListFilterIcon />
      </MenuTrigger>
      {/* Refocusing the trigger after a pointer close shows its focus ring and opens its tooltip. */}
      <MenuPopup
        align="start"
        className="min-w-52"
        finalFocus={(closeType) => closeType === "keyboard"}
      >
        <MenuSub>
          <MenuSubTrigger>
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <T>Group by</T>
              <SubmenuValue labels={Object.values(groupLabels)} current={groupLabels[groupBy]} />
            </span>
          </MenuSubTrigger>
          <MenuSubPopup>
            <MenuRadioGroup
              value={groupBy}
              onValueChange={(value) =>
                void updateClientSettings({ boringSidebarEnabled: value === "folder" })
              }
            >
              {(["status", "folder"] as const).map((value) => (
                <MenuRadioItem key={value} value={value}>
                  <span className="flex items-center gap-3">
                    {groupLabels[value]}
                    <RadioCheck />
                  </span>
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </MenuSubPopup>
        </MenuSub>
        <MenuSub>
          <MenuSubTrigger>
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <T>Sort by</T>
              <SubmenuValue labels={Object.values(sortLabels)} current={sortLabels[projectSort]} />
            </span>
          </MenuSubTrigger>
          <MenuSubPopup>
            <MenuRadioGroup
              value={projectSort}
              onValueChange={(value) => {
                const order = value as SidebarProjectSortOrder;
                // The command palette's own thread order follows the time orders.
                void updateClientSettings(
                  order === "manual"
                    ? { sidebarProjectSortOrder: order }
                    : { sidebarProjectSortOrder: order, sidebarThreadSortOrder: order },
                );
              }}
            >
              {(["updated_at", "created_at", "manual"] as const).map((value) => (
                <MenuRadioItem key={value} value={value}>
                  <span className="flex items-center gap-3">
                    {sortLabels[value]}
                    <RadioCheck />
                  </span>
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </MenuSubPopup>
        </MenuSub>
        <MenuSub>
          <MenuSubTrigger>
            <T>Show</T>
          </MenuSubTrigger>
          <MenuSubPopup>
            <MenuCheckboxItem
              variant="trailing"
              checked={workingShelf}
              onCheckedChange={(checked) =>
                void updateClientSettings({ sidebarWorkingShelfEnabled: Boolean(checked) })
              }
            >
              <T>Working section</T>
            </MenuCheckboxItem>
            <MenuCheckboxItem
              variant="trailing"
              checked={projectIcon}
              onCheckedChange={(checked) =>
                void updateClientSettings({ sidebarProjectIcon: Boolean(checked) })
              }
            >
              <T>Project icon</T>
            </MenuCheckboxItem>
            {!folderMode && collapsedRows ? (
              <MenuCheckboxItem
                variant="trailing"
                checked={collapsedProjectName}
                onCheckedChange={(checked) =>
                  void updateClientSettings({ sidebarCollapsedProjectName: Boolean(checked) })
                }
              >
                <T>Project name</T>
              </MenuCheckboxItem>
            ) : null}
            <MenuCheckboxItem
              variant="trailing"
              checked={multilineRows}
              onCheckedChange={(checked) =>
                void updateClientSettings(
                  folderMode
                    ? { boringSidebarMultilineRows: Boolean(checked) }
                    : { sidebarCardDetailsLine: Boolean(checked) },
                )
              }
            >
              <T>Thread details line</T>
            </MenuCheckboxItem>
            {folderMode ? (
              <MenuCheckboxItem
                variant="trailing"
                checked={folderAgentIcon}
                onCheckedChange={(checked) =>
                  void updateClientSettings({ sidebarFolderAgentIcon: Boolean(checked) })
                }
              >
                <T>Agent icon</T>
              </MenuCheckboxItem>
            ) : (
              <MenuCheckboxItem
                variant="trailing"
                checked={collapsedRows}
                onCheckedChange={(checked) =>
                  void updateClientSettings({ sidebarCollapsedRows: Boolean(checked) })
                }
              >
                <T>Collapsed</T>
              </MenuCheckboxItem>
            )}
            {!folderMode && collapsedRows ? (
              <MenuSub>
                <MenuSubTrigger>
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <T>Agent icon</T>
                    <SubmenuValue
                      labels={[...Object.values(agentIconLabels), afterDetailsLabel]}
                      current={agentIconLabels[agentIconPosition]}
                    />
                  </span>
                </MenuSubTrigger>
                <MenuSubPopup>
                  <MenuRadioGroup
                    value={agentIconPosition}
                    onValueChange={(value) =>
                      void updateClientSettings({
                        agentIconPositionWhenCollapsed: value as AgentIconPositionWhenCollapsed,
                      })
                    }
                  >
                    {(
                      [
                        "beforeProject",
                        "afterProject",
                        "afterThreadName",
                        "afterTime",
                        "none",
                      ] as const
                    ).map((value) => (
                      <MenuRadioItem key={value} value={value}>
                        <span className="flex items-center gap-3">
                          {agentIconLabels[value]}
                          <RadioCheck />
                        </span>
                      </MenuRadioItem>
                    ))}
                  </MenuRadioGroup>
                </MenuSubPopup>
              </MenuSub>
            ) : folderMode ? null : (
              // Holds the Agent icon row's width so toggling Collapsed doesn't resize the menu.
              <div
                aria-hidden
                className="invisible flex h-0 items-center gap-2 overflow-hidden px-2 text-base sm:text-sm"
              >
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <T>Agent icon</T>
                  <SubmenuValue
                    labels={[...Object.values(agentIconLabels), afterDetailsLabel]}
                    current={agentIconLabels[agentIconPosition]}
                  />
                </span>
                <ChevronRightIcon className="-me-0.5 size-4.5 shrink-0 sm:size-4" />
              </div>
            )}
            {folderMode ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <MenuCheckboxItem
                      variant="trailing"
                      checked={viewAppliesToShelves}
                      onCheckedChange={(checked) =>
                        void updateClientSettings({ sidebarViewAppliesToShelves: Boolean(checked) })
                      }
                    />
                  }
                >
                  <T>Apply to Settled etc</T>
                </TooltipTrigger>
                <TooltipPopup side="right">
                  <T>Apply view settings to Settled, Snoozed</T>
                </TooltipPopup>
              </Tooltip>
            ) : null}
          </MenuSubPopup>
        </MenuSub>
      </MenuPopup>
    </Menu>
  );
}
