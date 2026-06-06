import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { WinnerFeed } from "./WinnerFeed";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-[100dvh] w-full flex justify-center"
      style={{ background: "#010204" }}
    >
      <div
        className="w-full max-w-[430px] relative flex flex-col min-h-[100dvh]"
        style={{ background: "#020408" }}
      >
        <Header />
        <main className="flex-1 overflow-x-hidden" style={{ paddingBottom: 110 }}>
          {children}
        </main>
        <BottomNav />
        <WinnerFeed />
      </div>
    </div>
  );
}
