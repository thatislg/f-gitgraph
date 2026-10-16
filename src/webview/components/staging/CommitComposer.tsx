import { useEffect, useRef } from "preact/hooks";

import { Checkbox } from "@/webview/components/ui/Checkbox";
import {
  canCommit,
  commit,
  commitAndPush,
  commitButtonLabel,
  commitDescription,
  commitSubject,
  isAmend,
  isCommitting,
  isSign,
  setAmend,
  subjectCounterColor,
  type SubjectCounterColor
} from "@/webview/lib/stores/staging.store";

/**
 * Bộ soạn thảo commit chuyên nghiệp: ô tiêu đề một dòng kèm bộ đếm 50 ký tự 3 mức
 * màu, ô mô tả co giãn tự động, tùy chọn Amend/Sign, nút Commit & Commit & Push,
 * phím tắt Ctrl/Cmd+Enter và phản hồi âm thanh khi commit thành công.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/02_Staging_UI_And_Composer_Component_Design.md (Mục 3.3).
 */

const COUNTER_TONE_CLASS: Record<SubjectCounterColor, string> = {
  idle: "text-counter-idle",
  warn: "text-counter-warn",
  danger: "text-counter-danger"
};

const SUBJECT_INPUT_CLASS =
  "h-[34px] w-full rounded-[4px] border bg-input px-[10px] py-[6px] text-[13px] text-input-fg " +
  "border-line placeholder:text-muted focus:border-cross-active " +
  "focus:outline-none focus:shadow-[0_0_6px_rgba(168,85,247,0.4)]";

const DESCRIPTION_INPUT_CLASS =
  "min-h-[60px] max-h-[160px] w-full resize-none overflow-y-auto rounded-[4px] border " +
  "border-line bg-input px-[10px] py-[6px] text-[13px] text-input-fg placeholder:text-muted " +
  "focus:border-cross-active focus:outline-none focus:shadow-[0_0_6px_rgba(168,85,247,0.4)]";

function autoGrow(target: EventTarget | null) {
  if (target instanceof HTMLTextAreaElement) {
    target.style.height = "auto";
    target.style.height = `${Math.min(Math.max(target.scrollHeight, 60), 160)}px`;
  }
}

export function CommitComposer() {
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Phím tắt toàn cục Ctrl/Cmd + Enter kích hoạt commit tức thì.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        commit();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const subject = commitSubject.value;
  const description = commitDescription.value;
  const amend = isAmend.value;
  const sign = isSign.value;
  const committing = isCommitting.value;

  return (
    <div class="flex flex-col gap-3" data-composer>
      <div class="relative">
        <input
          type="text"
          class={SUBJECT_INPUT_CLASS}
          placeholder="Commit header (Ctrl+Enter to commit)..."
          data-subject-input
          value={subject}
          onInput={(event) => {
            commitSubject.value = event.currentTarget.value;
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.ctrlKey && !event.metaKey) {
              event.preventDefault();
              descriptionRef.current?.focus();
            }
          }}
        />
        <span
          data-counter
          data-counter-tone={subjectCounterColor.value}
          class={[
            "pointer-events-none absolute top-1/2 right-[10px] -translate-y-1/2 font-mono text-[11px]",
            COUNTER_TONE_CLASS[subjectCounterColor.value]
          ].join(" ")}
        >
          ({subject.length}/50)
        </span>
      </div>

      <textarea
        ref={descriptionRef}
        class={DESCRIPTION_INPUT_CLASS}
        placeholder={`Commit content — becomes git commit -m "summary" -m "description"...`}
        data-description-input
        value={description}
        onInput={(event) => {
          commitDescription.value = event.currentTarget.value;
          autoGrow(event.currentTarget);
        }}
      />

      <div class="flex items-center gap-4">
        <Checkbox
          label="Amend previous commit"
          data-amend-checkbox
          checked={amend}
          onChange={(event) => setAmend(event.currentTarget.checked)}
        />
        <Checkbox
          label="Sign commit (GPG/SSH)"
          data-sign-checkbox
          checked={sign}
          onChange={(event) => {
            isSign.value = event.currentTarget.checked;
          }}
        />
      </div>

      <div class="flex items-center justify-end gap-2">
        <button
          type="button"
          class="h-8 rounded-[4px] border border-cross-active bg-transparent px-4 text-[13px] font-semibold text-cross-active focus:outline-1 focus:outline-focus hover:bg-btn-hover disabled:cursor-not-allowed disabled:opacity-40"
          data-action="commit-and-push"
          disabled={!canCommit.value || committing}
          onClick={commitAndPush}
        >
          Commit &amp; Push
        </button>
        <button
          type="button"
          class="flex h-8 items-center gap-2 rounded-[4px] px-4 text-[13px] font-semibold text-white focus:outline-1 focus:outline-focus disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: "linear-gradient(135deg, #a855f7, #7c3aed)"
          }}
          data-action="commit"
          data-button-label={commitButtonLabel.value}
          disabled={!canCommit.value || committing}
          onClick={commit}
        >
          {committing && (
            <span
              class="size-3 animate-spin rounded-full border-2 border-white/40 border-t-white"
              data-spinner
            />
          )}
          {commitButtonLabel.value}
        </button>
      </div>
    </div>
  );
}
