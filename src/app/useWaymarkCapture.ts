import type { PathId } from "../types/ui";
import { useWaymarkApp } from "./WaymarkAppProvider";
import { createQuickCaptureMark } from "../lib/waymark/shellAppAdapters";
import type { CaptureMediaAttachment } from "../types/capture";

export function useWaymarkCapture() {
  const app = useWaymarkApp();

  return {
    async createQuickCaptureMark(
      title: string,
      detail: string,
      uiPathId: PathId,
      mediaAttachments: CaptureMediaAttachment[] = [],
    ) {
      const result = await createQuickCaptureMark(app, title, detail, uiPathId, undefined, mediaAttachments);
      return result?.markId ?? null;
    },
  };
}
