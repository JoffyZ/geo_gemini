import Link from "next/link";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Search, 
  Settings, 
  Tags,
  Globe,
  LogOut,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "总览面板", href: "/dashboard", icon: LayoutDashboard },
  { name: "问题库管理", href: "/dashboard/prompts", icon: MessageSquare },
  { name: "品牌管理", href: "/dashboard/brands", icon: Building2 },
  { name: "Prompt 实验室", href: "/dashboard/explorer", icon: Search },
  { name: "分类管理", href: "/dashboard/categories", icon: Tags },
  { name: "监测配置", href: "/dashboard/settings/monitoring", icon: Globe },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/30 flex flex-col fixed inset-y-0">
        <div className="p-6 border-b bg-background">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground text-sm">
              G
            </div>
            <span>GEO Gemini</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                "hover:bg-muted hover:text-foreground text-muted-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t bg-background mt-auto">
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-destructive rounded-md hover:bg-destructive/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pl-64">
        {children}
      </main>
    </div>
  );
}
