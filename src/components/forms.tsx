"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass, cx } from "./ui";

export type ActionState = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> } | undefined;
export type FormAction = (prev: ActionState, fd: FormData) => Promise<ActionState>;

const PendingContext = createContext(false);

export function SubmitButton({
  children,
  variant = "primary",
  className,
  pendingText = "שומר…",
  ...rest
}: { children: ReactNode; variant?: "primary" | "secondary" | "accent" | "danger" | "ghost"; className?: string; pendingText?: string } & ComponentProps<"button">) {
  const status = useFormStatus();
  const ctxPending = useContext(PendingContext);
  const pending = status.pending || ctxPending;
  return (
    <button type="submit" disabled={pending || rest.disabled} aria-busy={pending} className={buttonClass(variant, className)} {...rest}>
      {pending ? pendingText : children}
    </button>
  );
}

/**
 * Form wrapper for server actions: shows errors/success in an aria-live region,
 * so no submit ever fails silently.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
  onSuccess,
  encType,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
  encType?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const handled = useRef<ActionState>(undefined);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });
  useEffect(() => {
    // handle each successful result exactly once
    if (state?.ok && handled.current !== state) {
      handled.current = state;
      if (resetOnSuccess) ref.current?.reset();
      onSuccessRef.current?.();
    }
  }, [state, resetOnSuccess]);
  return (
    <form
      ref={ref}
      // submit via a transition instead of the `action` prop so React does not auto-reset
      // the form — user input must survive validation errors
      onSubmit={(e) => {
        e.preventDefault();
        if (isPending) return;
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
      className={className}
      encType={encType}
      aria-busy={isPending}
    >
      <PendingContext.Provider value={isPending}>{children}</PendingContext.Provider>
      <div aria-live="polite" className="empty:hidden mt-3">
        {state?.error && <p className="rounded-lg bg-danger-100 text-danger-700 px-3 py-2 text-sm">{state.error}</p>}
        {state?.ok && state.message && <p className="rounded-lg bg-olive-100 text-olive-800 px-3 py-2 text-sm">{state.message}</p>}
      </div>
    </form>
  );
}

export function FieldError({ state, name }: { state: ActionState; name: string }) {
  const e = state?.fieldErrors?.[name];
  return e ? <p className="text-xs text-danger-700 mt-1">{e}</p> : null;
}

const inputCls =
  "w-full rounded-xl border border-sand-300 bg-white px-3 min-h-11 py-2 text-[15px] text-charcoal-900 placeholder:text-charcoal-400 focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/30";

export function Field({ label, hint, children, className, htmlFor }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-charcoal-800">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-charcoal-500">{hint}</p>}
    </div>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}
export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea rows={3} {...props} className={cx(inputCls, "min-h-24", props.className)} />;
}
export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={cx(inputCls, "pe-8", props.className)} />;
}
