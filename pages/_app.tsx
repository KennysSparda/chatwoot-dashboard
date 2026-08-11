import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Script from "next/script";

const themeInitializationScript = `
  (function () {
    try {
      var savedTheme = window.localStorage.getItem("support-dashboard-theme");
      var theme =
        savedTheme === "dark" || savedTheme === "light"
          ? savedTheme
          : "light";

      document.documentElement.setAttribute("data-theme", theme);
      document.documentElement.style.colorScheme = theme;
    } catch (error) {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.style.colorScheme = "light";
    }
  })();
`;

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Script
        id="initialize-dashboard-theme"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: themeInitializationScript,
        }}
      />

      <Component {...pageProps} />
    </>
  );
}
