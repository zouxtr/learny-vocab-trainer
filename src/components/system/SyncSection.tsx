import { useSyncStore } from "@/stores/syncStore";
import { SyncPanel } from "@/components/system/SyncPanel";

/** Store-wired sync panel. Rendered in the desktop sidebar and (on mobile)
 * inside a dialog opened from the top bar. */
export function SyncSection() {
  const connected = useSyncStore((s) => s.connected);
  const uploading = useSyncStore((s) => s.uploading);
  const downloading = useSyncStore((s) => s.downloading);
  const uploadResult = useSyncStore((s) => s.uploadResult);
  const downloadResult = useSyncStore((s) => s.downloadResult);
  const lastSynced = useSyncStore((s) => s.lastSynced);
  const remoteHasUnsyncedChanges = useSyncStore((s) => s.remoteHasUnsyncedChanges);
  const checkUnsyncedChanges = useSyncStore((s) => s.checkUnsyncedChanges);
  const connect = useSyncStore((s) => s.connect);
  const disconnect = useSyncStore((s) => s.disconnect);
  const upload = useSyncStore((s) => s.upload);
  const download = useSyncStore((s) => s.download);

  return (
    <SyncPanel
      connected={connected}
      uploading={uploading}
      downloading={downloading}
      uploadResult={uploadResult}
      downloadResult={downloadResult}
      lastSynced={lastSynced}
      remoteHasUnsyncedChanges={remoteHasUnsyncedChanges}
      onCheckUnsyncedChanges={() => void checkUnsyncedChanges()}
      onConnect={(id) => void connect(id)}
      onDisconnect={(id) => void disconnect(id)}
      onUpload={() => void upload()}
      onDownload={() => void download()}
    />
  );
}