import './globals.css';

export const metadata = {
  title: 'TaskFlow Pro • Next-Gen Task & Project Manager',
  description: 'A modern, intuitive, and feature-packed Next.js task management application with MongoDB integration and Kanban board.',
  keywords: ['task manager', 'next.js', 'mongodb', 'kanban', 'productivity'],
  authors: [{ name: 'TaskFlow' }],
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
