import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Locale, PathId } from "../../types/ui";
import { MarkDetailTemplate } from "../mark-detail/MarkDetailTemplate";
import { MarkDetailItem } from "../mark-detail/model";
import { PlannedMarkDateTimePickerDialog } from "../planned-mark/PlannedMarkDateTimePickerDialog";
import { MoveMarkValue } from "../planned-mark/PlannedMarkActionSheetContent";
import { getPlannedMarkPathTheme } from "../planned-mark/plannedMarkTheme";

type Props = {
  item: MarkDetailItem;
  locale?: Locale;
  onBack?: () => void;
  onOpenExpedition?: Parameters<typeof MarkDetailTemplate>[0]["onOpenExpedition"];
  onAddToToday?: (item: MarkDetailItem) => void;
  onMove?: (item: MarkDetailItem, value: MoveMarkValue) => void | Promise<void>;
  onMoveToBacklog?: (item: MarkDetailItem) => void;
  onDelete?: (item: MarkDetailItem) => void;
};

export function WeeklyDetailTemplate({
  item,
  locale = "en",
  onBack,
  onOpenExpedition,
  onAddToToday,
  onMove,
  onMoveToBacklog,
  onDelete,
}: Props) {
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveBusy, setMoveBusy] = useState(false);
  const initialMoveValue = useMemo(() => getInitialMoveValue(item), [item]);
  const theme = getPlannedMarkPathTheme(isPathId(item.path.id) ? item.path.id : "career");

  return (
    <>
      <MarkDetailTemplate
        actionButtons={[
          { id: "today", label: locale === "vi" ? "Today" : "Today", variant: "primary", onPress: onAddToToday ? () => onAddToToday(item) : undefined },
          { id: "move", label: locale === "vi" ? "Move" : "Move", variant: "secondary", onPress: onMove ? () => setMoveOpen(true) : undefined },
          { id: "move-backlog", label: "Move to Backlog", variant: "secondary", onPress: onMoveToBacklog ? () => onMoveToBacklog(item) : undefined },
          { id: "delete", label: "Delete", variant: "secondary", onPress: onDelete ? () => onDelete(item) : undefined },
        ]}
        headerTitle="Weekly Detail"
        locale={locale}
        mark={item}
        onBack={onBack}
        onOpenExpedition={onOpenExpedition}
      />
      <Modal
        animationType="fade"
        onRequestClose={() => (!moveBusy ? setMoveOpen(false) : undefined)}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible={moveOpen}
      >
        <SafeAreaView edges={["top", "bottom"]} style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => (!moveBusy ? setMoveOpen(false) : undefined)} />
          <View style={styles.dialogWrap}>
            <PlannedMarkDateTimePickerDialog
              cancelLabel={locale === "vi" ? "Huy" : "Cancel"}
              dateLabel={locale === "vi" ? "Ngay" : "Date"}
              endLabel={locale === "vi" ? "Ket thuc" : "End"}
              hasEndTime
              initialValue={initialMoveValue}
              locale={locale}
              onCancel={() => (!moveBusy ? setMoveOpen(false) : undefined)}
              onSave={(value) => {
                if (!onMove) {
                  return;
                }
                void (async () => {
                  setMoveBusy(true);
                  try {
                    await onMove(item, value);
                    setMoveOpen(false);
                  } finally {
                    setMoveBusy(false);
                  }
                })();
              }}
              saveLabel={moveBusy ? (locale === "vi" ? "Dang luu..." : "Saving...") : locale === "vi" ? "Luu" : "Save"}
              startLabel={locale === "vi" ? "Bat dau" : "Start"}
              theme={theme}
              title={locale === "vi" ? "Doi lich mark" : "Move mark"}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function getInitialMoveValue(item: MarkDetailItem): MoveMarkValue {
  const schedule = item.metadata.find((entry) => entry.id === "schedule")?.value;
  const [startTime, endTime] = schedule?.match(/^\d{2}:\d{2}-\d{2}:\d{2}$/) ? schedule.split("-") : [];
  const date = typeof item.date === "string" ? item.date.slice(0, 10) : item.date.toISOString().slice(0, 10);

  return {
    date,
    startTime,
    endTime,
  };
}

function isPathId(value: MarkDetailItem["path"]["id"]): value is PathId {
  return value === "career" || value === "snag" || value === "health" || value === "family" || value === "character" || value === "golf" || value === "culture";
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
    backgroundColor: "rgba(43,42,34,0.42)",
  },
  dialogWrap: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
});
