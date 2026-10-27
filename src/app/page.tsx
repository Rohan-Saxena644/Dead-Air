import { Game } from "@/components/game/Game";
import { ComfortProvider } from "@/components/game/Atmosphere";
export default function Page() {
  return (
    <ComfortProvider>
      <Game />
    </ComfortProvider>
  );
}
