import "./globals.css";
import { Web3Provider } from "@/contexts/Web3Context";

export const metadata = {
  title: "TokenQueue - Decentralized Waiting List",
  description: "A decentralized waiting list system powered by blockchain",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background-light dark:bg-background-dark font-display text-gray-800 dark:text-gray-200">
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
