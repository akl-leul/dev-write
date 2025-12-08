import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  Heart,
  Bookmark,
  Tag,
  FolderOpen,
  Bell,
  Image,
  Link2,
  UserPlus,
  ThumbsUp,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
  },
  {
    title: "Content",
    icon: FileText,
    children: [
      { title: "Posts", icon: FileText, path: "/posts" },
      { title: "Categories", icon: FolderOpen, path: "/categories" },
      { title: "Tags", icon: Tag, path: "/tags" },
      { title: "Post Images", icon: Image, path: "/post-images" },
      { title: "Post Tags", icon: Link2, path: "/post-tags" },
    ],
  },
  {
    title: "Users",
    icon: Users,
    children: [
      { title: "Profiles", icon: Users, path: "/profiles" },
      { title: "Followers", icon: UserPlus, path: "/followers" },
    ],
  },
  {
    title: "Engagement",
    icon: Heart,
    children: [
      { title: "Comments", icon: MessageSquare, path: "/comments" },
      { title: "Likes", icon: Heart, path: "/likes" },
      { title: "Comment Likes", icon: ThumbsUp, path: "/comment-likes" },
      { title: "Bookmarks", icon: Bookmark, path: "/bookmarks" },
    ],
  },
  {
    title: "Notifications",
    icon: Bell,
    path: "/notifications",
  },
];

interface MenuItemProps {
  item: typeof menuItems[0];
  collapsed: boolean;
}

function MenuItem({ item, collapsed }: MenuItemProps) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(
    item.children?.some((child) => child.path === location.pathname) || false
  );

  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.path === location.pathname;

  if (hasChildren) {
    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            "text-sidebar-foreground"
          )}
        >
          <item.icon className="h-5 w-5 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.title}</span>
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </>
          )}
        </button>
        {isOpen && !collapsed && (
          <div className="ml-4 space-y-1 border-l border-sidebar-border pl-4">
            {item.children.map((child) => (
              <NavLink
                key={child.path}
                to={child.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )
                }
              >
                <child.icon className="h-4 w-4 shrink-0" />
                <span>{child.title}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path!}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )
      }
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{item.title}</span>}
    </NavLink>
  );
}

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
            {!collapsed && (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-semibold text-foreground">
                  Admin Panel
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="hidden h-8 w-8 md:flex"
              onClick={() => setCollapsed(!collapsed)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
            <p className={cn("mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground", collapsed && "hidden")}>
              Menu
            </p>
            {menuItems.map((item) => (
              <MenuItem key={item.title} item={item} collapsed={collapsed} />
            ))}
          </nav>
        </div>
      </aside>

      {/* Spacer for main content */}
      <div
        className={cn(
          "hidden transition-all duration-300 md:block",
          collapsed ? "w-16" : "w-64"
        )}
      />
    </>
  );
}
