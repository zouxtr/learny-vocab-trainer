import { useSyncStore } from "@/stores/syncStore";
import { SyncPanel } from "@/components/system/SyncPanel";

/** Store-wired sync panel. Rendered in the desktop sidebar and (on mobile)
 * inside a dialog opened from the top bar. */
export function SyncSection() {
  const connected = useSyncStore((s) => s.connected);
  const syncing = useSyncStore((s) => s.syncing);
  const lastResult = useSyncStore((s) => s.lastResult);
  const connect = useSyncStore((s) => s.connect);
  const disconnect = useSyncStore((s) => s.disconnect);
  const syncNow = useSyncStore((s) => s.syncNow);

  return (
    <SyncPanel
      status={{ connected, syncing, lastResult }}
      onConnect={(id) => void connect(id)}
      onDisconnect={(id) => void disconnect(id)}
      onSyncNow={(id) => void syncNow(id)}
    />
  );
}