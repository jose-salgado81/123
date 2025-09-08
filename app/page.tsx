import Image from "next/image";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    function getCookie(name: string): string | undefined {
      if (typeof document === "undefined") return undefined;
      const match = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, "\\$1") + "=([^;]*)"));
      return match ? decodeURIComponent(match[1]) : undefined;
    }

    function getParamFromUrl(url: string, key: string): string | undefined {
      try {
        const u = new URL(url);
        const v = u.searchParams.get(key);
        return v || undefined;
      } catch {
        return undefined;
      }
    }

    function resolveFbcFbp(anchor: HTMLAnchorElement) {
      const fromHrefFbc = getParamFromUrl(anchor.href, "fbc");
      const fromHrefFbp = getParamFromUrl(anchor.href, "fbp");
      const cookieFbp = getCookie("_fbp");
      const cookieFbc = getCookie("_fbc");
      return {
        fbc: fromHrefFbc || cookieFbc,
        fbp: fromHrefFbp || cookieFbp,
      };
    }

    function isOutbound(anchor: HTMLAnchorElement): boolean {
      try {
        const linkUrl = new URL(anchor.href);
        return linkUrl.hostname !== window.location.hostname;
      } catch {
        return false;
      }
    }

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest && target.closest("a");
      if (!anchor) return;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!anchor.href) return;
      if (!isOutbound(anchor)) return;

      const { fbc, fbp } = resolveFbcFbp(anchor);
      const payload = {
        sourceUrl: window.location.href,
        fbc,
        fbp,
      } as Record<string, unknown>;

      try {
        const json = JSON.stringify(payload);
        const blob = new Blob([json], { type: "application/json" });
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/everflowclicktofb", blob);
        } else {
          // Fallback with keepalive so navigation is not blocked
          fetch("/api/everflowclicktofb", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: json,
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        // ignore
      }
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <ol className="font-mono list-inside list-decimal text-sm/6 text-center sm:text-left">
          <li className="mb-2 tracking-[-.01em]">
            Get started by editing{" "}
            <code className="bg-black/[.05] dark:bg-white/[.06] font-mono font-semibold px-1 py-0.5 rounded">
              app/page.tsx
            </code>
            .
          </li>
          <li className="tracking-[-.01em]">
            Save and see your changes instantly.
          </li>
        </ol>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={20}
              height={20}
            />
            Deploy now
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read our docs
          </a>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
