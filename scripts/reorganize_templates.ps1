$base = "d:\Projects\BengoBox\notifications-service\notifications-api\templates"
$groups = @{
    "auth" = @("account_locked", "email_verification", "login_new_device", "mfa_enabled", "oauth_linked", "password_reset", "welcome", "otp")
    "cafe" = @("cafe_order_cancelled", "cafe_order_delivered", "cafe_order_out_for_delivery", "cafe_order_placed", "cafe_order_ready")
    "finance" = @("budget_threshold", "expense_approved", "expense_rejected", "invoice_created", "invoice_due", "invoice_overdue", "invoice_sent", "payment_failed", "payment_receipt", "payment_success", "payout_completed")
    "inventory" = @("low_stock_alert", "purchase_order_approved", "stock_adjustment", "stock_out")
    "logistics" = @("delivery_arriving", "delivery_assigned", "delivery_completed", "delivery_failed", "eta_updated", "route_updated", "transfer_completed", "transfer_created")
    "pos" = @("cash_drawer_exception", "loyalty_points_earned", "pos_license_renewal", "pos_order_ready", "pos_payment_receipt")
    "projects" = @("project_milestone_reached")
    "reports" = @("activity_report_approved", "activity_report_rejected", "activity_report_submitted", "report_ready")
    "shared" = @("base", "generic_notification", "system_alert", "weather_advisory", "approval_required")
    "subscription" = @("subscription_expiring", "subscription_renewed")
    "ticketing" = @("sla_breach", "ticket_assigned", "ticket_resolved")
    "truload" = @("weight_ticket", "compliance_certificate", "special_release", "special_release_approved", "case_update", "alert_high_compliance", "new_case_notification")
}

$channels = @("email", "sms", "push")
$extensions = @(".html", ".txt", ".mjml", ".json")

foreach ($ch in $channels) {
    $chPath = Join-Path $base $ch
    if (!(Test-Path $chPath)) { continue }

    foreach ($group in $groups.Keys) {
        $groupPath = Join-Path $chPath $group
        if (!(Test-Path $groupPath)) { New-Item -ItemType Directory -Path $groupPath | Out-Null }

        foreach ($name in $groups[$group]) {
            foreach ($ext in $extensions) {
                $file = $name + $ext
                $filePath = Join-Path $chPath $file
                if (Test-Path $filePath) {
                    Move-Item -Path $filePath -Destination (Join-Path $groupPath $file) -Force
                }
            }
        }
    }
}
