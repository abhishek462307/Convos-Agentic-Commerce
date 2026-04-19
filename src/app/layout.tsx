import type { Metadata, Viewport } from "next";
import "./globals.css";
import { VisualEditsMessenger } from "orchids-visual-edits";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export async function generateMetadata(): Promise<Metadata> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Convos";
  const description = process.env.NEXT_PUBLIC_APP_DESCRIPTION ?? "Open-source conversational commerce for merchant storefronts and AI-assisted shopping.";
  const ogImage = process.env.NEXT_PUBLIC_OG_IMAGE_URL ?? "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e/Untitled-design-resized-1768689543984.webp";
  const gscId = process.env.NEXT_PUBLIC_GSC_VERIFICATION_ID;

  return {
    title: `${appName} | Conversational Commerce`,
    description,
    metadataBase: new URL(appUrl),
    verification: {
      google: gscId,
    },
    openGraph: {
      title: `${appName} | Conversational Commerce`,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${appName} preview`,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${appName} | Conversational Commerce`,
      description,
      images: [ogImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <VisualEditsMessenger />
        <SpeedInsights />
      </body>
    </html>
  );
}
