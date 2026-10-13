type Action = "copy" | "retry" | "exportLabel" | "deleteLabel";
type ActionState = Action | "copied" | "failedCopy";

declare global {
  interface Window {
    OpenAkitaChatActions: {
      createButton(action: Action): HTMLButtonElement;
      setState(button: HTMLButtonElement, state: ActionState): void;
    };
  }
}

const paths: Record<ActionState, string[]> = {
  copy: ["M9 9h11v11H9z", "M5 15H3V3h12v2"],
  retry: ["M20 7v5h-5", "M20 12a8 8 0 1 0-2.3 5.7"],
  exportLabel: ["M12 3v12", "m8 11 4 4 4-4", "M5 16v4h14v-4"],
  deleteLabel: ["M4 6h16", "M9 6V3h6v3", "m6 6 1 15h10l1-15", "M10 10v7", "M14 10v7"],
  copied: ["m5 12 4 4L19 6"],
  failedCopy: ["M12 8v5", "M12 17h.01", "m12 3 10 18H2z"],
};
const timers = new WeakMap<HTMLButtonElement, ReturnType<typeof setTimeout>>();

export function setState(button: HTMLButtonElement, state: ActionState): void {
  clearTimeout(timers.get(button));
  const label = window.OpenAkitaChatI18n.t(state);
  button.setAttribute("aria-label", label); button.title = label;
  button.dataset.state = state;
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24"); icon.setAttribute("aria-hidden", "true");
  for (const value of paths[state]) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", value); icon.append(path);
  }
  const status = document.createElement("span"); status.className = "visually-hidden";
  status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
  button.replaceChildren(icon, status);
  status.textContent = state === "copied" || state === "failedCopy" ? label : "";
  if (state === "copied" || state === "failedCopy") {
    timers.set(button, setTimeout(() => { if (button.isConnected) setState(button, "copy"); }, 2000));
  }
}

export function createButton(action: Action): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button"; button.className = "chat-action-icon";
  setState(button, action); return button;
}

window.OpenAkitaChatActions = Object.freeze({ createButton, setState });
