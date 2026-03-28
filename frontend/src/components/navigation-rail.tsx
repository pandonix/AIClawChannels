import { Icon } from "./ui/icon";
import { IconButton } from "./ui/button";

interface NavigationRailProps {
  onNewChat: () => void;
  onToggleHistory: () => void;
  onOpenSettings: () => void;
  historyOpen: boolean;
}

export function NavigationRail({
  onNewChat,
  onToggleHistory,
  onOpenSettings,
  historyOpen
}: NavigationRailProps) {
  return (
    <nav className="flex h-12 items-center justify-between gap-3 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(31,38,47,0.98)_0%,rgba(38,47,59,0.94)_100%)] px-4 text-[#fffaf4] shadow-[0_30px_70px_rgba(16,24,31,0.32)] backdrop-blur-[20px] lg:h-full lg:flex-col lg:justify-start lg:rounded-[28px] lg:p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f7b488] lg:hidden">
        AIClawChannels
      </p>
      <div className="hidden lg:block">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f7b488]">
          AIClawChannels
        </p>
        <h1 className="font-display text-[1.5rem] leading-none tracking-[-0.05em]">
          协作工作台
        </h1>
      </div>
      <div className="flex items-center gap-1 lg:flex-col lg:gap-2">
        <IconButton
          type="button"
          className="size-9 rounded-full border-white/10 text-[#fffaf4] hover:border-white/20 hover:bg-white/10 lg:size-11 lg:rounded-[18px]"
          data-testid="nav-new-chat"
          onClick={onNewChat}
          variant="contrast"
          aria-label="新建或选择会话"
          title="新建或选择会话"
        >
          <Icon name="plus" size={18} className="lg:size-[22px]" />
        </IconButton>
        <IconButton
          type="button"
          className={`size-9 rounded-full lg:size-11 lg:rounded-[18px] ${
            historyOpen
              ? "border-[#f7b488]/20 bg-[#f7b488]/14 text-[#fffaf4]"
              : "border-white/10 text-[#fffaf4] hover:border-white/20 hover:bg-white/10"
          }`}
          data-testid="nav-history-toggle"
          onClick={onToggleHistory}
          variant="contrast"
          aria-label="切换会话历史"
          title="切换会话历史"
        >
          <Icon name="history" size={18} className="lg:size-[22px]" />
        </IconButton>
        <IconButton
          type="button"
          className="size-9 rounded-full border-white/10 text-[#fffaf4] hover:border-white/20 hover:bg-white/10 lg:size-11 lg:rounded-[18px]"
          data-testid="nav-settings"
          onClick={onOpenSettings}
          variant="contrast"
          aria-label="打开会话设置"
          title="打开会话设置"
        >
          <Icon name="settings" size={18} className="lg:size-[22px]" />
        </IconButton>
      </div>
    </nav>
  );
}
