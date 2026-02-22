# TruLoad Notifications UI

Premium, multi-tenant notification management dashboard built with Next.js 16.1.6, React 19, and Tailwind CSS 4.0.

## Overview
The Notifications UI provides a centralized platform for managing templates, configuring providers, and monitoring delivery performance across the Codevertex ecosystem. It is designed with a premium, mobile-first aesthetic and supports Progressive Web App (PWA) features for real-time alerts.

## Key Features
- **Multi-channel Support**: Manage Email, SMS, and Push notification templates.
- **Advanced Editor**: Markdown support with variable injection and live preview.
- **Dynamic Branding**: Tenant-specific customization for logos and theme colors.
- **Secure Monitoring**: Real-time delivery tracking and multi-tenant audit logs.
- **PWA Ready**: Standalone mobile experience with push notification support.

## Tech Stack
- **Framework**: [Next.js 16.1.6](https://nextjs.org/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Authentication**: OAuth 2.0 (PKCE) via Centralized SSO

## Getting Started

### Prerequisites
- Node.js 20.9.0+
- pnpm 9.0.0+

### Installation
```bash
git clone https://github.com/codevertex/notifications-ui.git
cd notifications-ui
pnpm install
```

### Development
```bash
pnpm dev
```

### Build
```bash
pnpm build
pnpm start
```

## Documentation
- [Architecture Overview](./docs/architecture.md)
- [Integrations Guide](./docs/integrations.md)
- [Sprint History](./docs/sprints/)

## License
MIT License - Copyright (c) 2026 Codevertex IT Solutions
