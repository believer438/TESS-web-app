import AIPanelChat from "@/components/ai/AIPanelChat";

/** Full-screen TESS entry point for guest chat and authenticated workspace access. */
export default function AIHomePage() {
  return (
    <main className="h-screen min-w-0 w-full overflow-hidden bg-white dark:bg-[#0f1219]">
      <AIPanelChat
        isOpen
        push
        isExpanded
        desktopWorkspace
        showClose={false}
        onExpandedChange={() => undefined}
        onClose={() => undefined}
        mode="assistant"
      />
    </main>
  );
}
