import { Info } from "lucide-react";
export function SaveNotice({ message }: { message: string | null }) {
  return message ? (
    <aside className="save-notice" aria-label="Temporary demo saves">
      <Info size={15} />
      <p>{message}</p>
    </aside>
  ) : null;
}
