"use client";

import {
  BarChart3,
  BookOpen,
  Bot,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  MessageSquareQuote,
  MessagesSquare,
  Phone,
  Plug,
  ScrollText,
  Settings,
  Users,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

import type { MembershipRole } from "@/generated/prisma/client";
import { can, type Capability } from "@/lib/rbac/permissions";
import { cn } from "@/lib/utils";

type SidebarItem = {
  label: string;
  href: string;
  icon: ReactNode;
  /** Quem vê o item. Sem capability = todo mundo logado vê. */
  capability?: Capability;
  /** Mostra badge "Em breve" + desabilita link. */
  comingSoon?: boolean;
};

type SidebarGroup = {
  label: string;
  items: SidebarItem[];
};

const GROUPS: SidebarGroup[] = [
  {
    label: "Operação",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard /> },
      {
        label: "Conversas",
        href: "/conversations",
        icon: <MessagesSquare />,
        capability: "conversation:view",
        comingSoon: true,
      },
    ],
  },
  {
    label: "Configuração",
    items: [
      {
        label: "Departamentos",
        href: "/departments",
        icon: <Building2 />,
        capability: "department:manage",
      },
      {
        label: "Agentes",
        href: "/agents",
        icon: <Bot />,
        capability: "agent:manage",
      },
      {
        label: "Conhecimento",
        href: "/knowledge",
        icon: <BookOpen />,
        capability: "knowledge:manage",
        comingSoon: true,
      },
      {
        label: "Canais",
        href: "/channels",
        icon: <Phone />,
        capability: "channel:manage",
        comingSoon: true,
      },
      {
        label: "Roteamento",
        href: "/routing",
        icon: <Workflow />,
        capability: "routing:manage",
        comingSoon: true,
      },
      {
        label: "Integrações",
        href: "/integrations",
        icon: <Plug />,
        capability: "integration:manage",
        comingSoon: true,
      },
      {
        label: "Templates de mensagem",
        href: "/templates",
        icon: <MessageSquareQuote />,
        capability: "template:manage",
        comingSoon: true,
      },
    ],
  },
  {
    label: "Tenant",
    items: [
      {
        label: "Membros",
        href: "/members",
        icon: <Users />,
        capability: "tenant:manage_members",
        comingSoon: true,
      },
      {
        label: "Uso & custos",
        href: "/usage",
        icon: <BarChart3 />,
        capability: "usage:view",
        comingSoon: true,
      },
      {
        label: "Auditoria",
        href: "/audit",
        icon: <ScrollText />,
        capability: "audit:view",
      },
      {
        label: "Configurações",
        href: "/settings",
        icon: <Settings />,
        capability: "tenant:settings",
        comingSoon: true,
      },
    ],
  },
];

const STORAGE_KEY = "portal-sidebar-collapsed";

type PortalSidebarProps = {
  role: MembershipRole;
};

export function PortalSidebar({ role }: PortalSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- inicialização da preferência persistida; cascade single-render aceitável
      setCollapsed(true);
    }
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "border-divider-strong bg-background/40 sticky top-14 flex h-[calc(100vh-3.5rem)] flex-col border-r backdrop-blur transition-[width] duration-200",
        collapsed ? "w-14" : "w-60",
      )}
    >
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-2 py-4">
        {GROUPS.map((group) => {
          const visibleItems = group.items.filter((i) => !i.capability || can(role, i.capability));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="flex flex-col gap-1">
              {!collapsed ? (
                <h3 className="text-muted-foreground px-3 text-xs font-semibold tracking-wide uppercase">
                  {group.label}
                </h3>
              ) : null}
              <ul className="flex flex-col gap-0.5">
                {visibleItems.map((item) => (
                  <li key={item.href}>
                    <SidebarLink item={item} pathname={pathname} collapsed={collapsed} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
        className="text-muted-foreground hover:text-foreground border-divider-strong hover:bg-glass-bg flex h-10 items-center justify-center border-t transition-colors"
      >
        {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
      </button>
    </aside>
  );
}

function SidebarLink({
  item,
  pathname,
  collapsed,
}: {
  item: SidebarItem;
  pathname: string;
  collapsed: boolean;
}) {
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const isDisabled = item.comingSoon;

  const inner = (
    <>
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center [&>svg]:size-4",
          isActive ? "text-accent-light" : "",
        )}
      >
        {item.icon}
      </span>
      {!collapsed ? (
        <>
          <span className="flex-1 truncate text-sm">{item.label}</span>
          {item.comingSoon ? (
            <span className="bg-glass-bg text-muted-foreground rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
              em breve
            </span>
          ) : null}
        </>
      ) : null}
    </>
  );

  const baseClasses = cn(
    "flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
    isActive
      ? "bg-glass-bg text-foreground"
      : isDisabled
        ? "text-muted-foreground/60 cursor-not-allowed"
        : "text-muted-foreground hover:text-foreground hover:bg-glass-bg",
    collapsed ? "justify-center" : "",
  );

  if (isDisabled) {
    return (
      <span
        className={baseClasses}
        title={collapsed ? `${item.label} (em breve)` : undefined}
        aria-disabled
      >
        {inner}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      className={baseClasses}
      title={collapsed ? item.label : undefined}
      aria-current={isActive ? "page" : undefined}
    >
      {inner}
    </Link>
  );
}
