import type { ReactElement } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type HoverTooltipProps = {
  label: string;
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
};

export default function HoverTooltip({ label, children, side = "top" }: HoverTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className="border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg dark:border-slate-200 dark:bg-white dark:text-slate-900">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
