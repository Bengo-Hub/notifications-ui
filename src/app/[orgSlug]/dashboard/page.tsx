export default function DashboardPage() {
    return (
        <div className="p-8">
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Notification Center</h1>
                    <p className="text-muted-foreground mt-1">Manage templates, providers, and tenant-specific delivery rules.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                        <h3 className="text-lg font-semibold">Active Templates</h3>
                        <p className="text-4xl font-bold mt-2">24</p>
                        <p className="text-xs text-muted-foreground mt-1">+2 created this week</p>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                        <h3 className="text-lg font-semibold">Delivery Rate</h3>
                        <p className="text-4xl font-bold mt-2">99.2%</p>
                        <p className="text-xs text-green-500 mt-1">↑ 0.4% from average</p>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                        <h3 className="text-lg font-semibold">Total Sent (24h)</h3>
                        <p className="text-4xl font-bold mt-2">1.2k</p>
                        <p className="text-xs text-muted-foreground mt-1">SMS, Email, Push</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-8 text-center border-dashed">
                    <p className="text-muted-foreground">Select a category from the sidebar to start managing notifications.</p>
                </div>
            </div>
        </div>
    );
}
