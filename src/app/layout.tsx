import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'JustCelebrateYou — Gather Video Messages for Life’s Meaningful Moments',
    description: 'JustCelebrateYou lets you gather video messages from friends and family for birthdays, anniversaries, memorials, and milestones. Save celebrations to your account and revisit them anytime.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className}>{children}</body>
        </html>
    );
}
