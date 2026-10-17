"use client";

import { type ChangeEvent, type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./login.module.css";

type FieldName = "email" | "password";
type FieldErrors = Partial<Record<FieldName, string>>;

type LoginApiResponse = {
  data?: {
    hasWedding?: boolean;
  };
  error?: {
    message?: string;
  };
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maxPasswordBytes = 72;

function validateField(name: FieldName, value: string): string | undefined {
  if (name === "email") {
    if (!value.trim()) return "Enter your email address.";
    if (!emailPattern.test(value.trim())) return "Enter a valid email address.";
    return undefined;
  }

  if (!value) return "Enter your password.";
  if (new TextEncoder().encode(value).byteLength > maxPasswordBytes) {
    return `Use ${maxPasswordBytes} UTF-8 bytes or fewer.`;
  }
  return undefined;
}

function getFormErrors(values: Record<FieldName, string>): FieldErrors {
  return {
    email: validateField("email", values.email),
    password: validateField("password", values.password),
  };
}

function hasErrors(errors: FieldErrors) {
  return Object.values(errors).some(Boolean);
}

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M3.5 12s3.15-5 8.5-5 8.5 5 8.5 5-3.15 5-8.5 5-8.5-5-8.5-5Z" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m4 4 16 16" />
      <path d="M9.9 7.2A9.9 9.9 0 0 1 12 7c5.35 0 8.5 5 8.5 5a16 16 0 0 1-3 3.35M6.3 9.1A16.8 16.8 0 0 0 3.5 12s3.15 5 8.5 5c.72 0 1.39-.09 2.01-.25" />
      <path d="M9.7 9.7a3.25 3.25 0 0 0 4.6 4.6" />
    </svg>
  );
}

export default function LoginForm({ next }: { next?: string } = {}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<FieldName, string>>({ email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  function updateField(event: ChangeEvent<HTMLInputElement>) {
    const name = event.target.name as FieldName;
    const value = event.target.value;

    setValues((current) => ({ ...current, [name]: value }));
    setFormError("");

    if (touched[name]) {
      setErrors((current) => ({ ...current, [name]: validateField(name, value) }));
    }
  }

  function markTouched(name: FieldName) {
    setTouched((current) => ({ ...current, [name]: true }));
    setErrors((current) => ({ ...current, [name]: validateField(name, values[name]) }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = getFormErrors(values);
    setTouched({ email: true, password: true });
    setErrors(nextErrors);
    setFormError("");

    if (hasErrors(nextErrors)) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email.trim(), password: values.password }),
      });
      const payload = (await response.json().catch(() => ({}))) as LoginApiResponse;

      if (!response.ok) {
        setFormError(payload.error?.message ?? "We could not sign you in. Please try again.");
        return;
      }

      router.replace(next ?? (payload.data?.hasWedding ? "/dashboard" : "/onboarding"));
      router.refresh();
    } catch {
      setFormError("We could not reach your wedding space. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} noValidate onSubmit={submit} aria-busy={isSubmitting}>
      {formError ? (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      ) : null}

      <div className={styles.fieldGroup}>
        <label htmlFor="email">Couple space email</label>
        <div className={`${styles.inputWrap} ${errors.email && touched.email ? styles.inputInvalid : ""}`}>
          <svg className={styles.fieldIcon} aria-hidden="true" viewBox="0 0 24 24">
            <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
            <path d="m4.5 7 7.5 5.5L19.5 7" />
          </svg>
          <input
            aria-describedby={errors.email && touched.email ? "email-error" : undefined}
            aria-invalid={Boolean(errors.email && touched.email)}
            autoComplete="email"
            id="email"
            inputMode="email"
            name="email"
            onBlur={() => markTouched("email")}
            onChange={updateField}
            placeholder="you@example.com"
            required
            type="email"
            value={values.email}
          />
        </div>
        {errors.email && touched.email ? <p className={styles.fieldError} id="email-error">{errors.email}</p> : null}
      </div>

      <div className={styles.fieldGroup}>
        <div className={styles.labelRow}>
          <label htmlFor="password">Private key</label>
          <span>8–72 characters</span>
        </div>
        <div className={`${styles.inputWrap} ${errors.password && touched.password ? styles.inputInvalid : ""}`}>
          <svg className={styles.fieldIcon} aria-hidden="true" viewBox="0 0 24 24">
            <rect x="5.5" y="10.5" width="13" height="9" rx="1.8" />
            <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14v2" />
          </svg>
          <input
            aria-describedby={errors.password && touched.password ? "password-error" : undefined}
            aria-invalid={Boolean(errors.password && touched.password)}
            autoComplete="current-password"
            id="password"
            maxLength={maxPasswordBytes}
            minLength={8}
            name="password"
            onBlur={() => markTouched("password")}
            onChange={updateField}
            placeholder="Enter your password"
            required
            type={isPasswordVisible ? "text" : "password"}
            value={values.password}
          />
          <button
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            className={styles.passwordToggle}
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            type="button"
          >
            <EyeIcon visible={isPasswordVisible} />
          </button>
        </div>
        {errors.password && touched.password ? <p className={styles.fieldError} id="password-error">{errors.password}</p> : null}
      </div>

      <button className={styles.submitButton} disabled={isSubmitting} type="submit">
        {isSubmitting ? "Signing in…" : "Sign in to wedding space"}
        <svg aria-hidden="true" viewBox="0 0 16 16">
          <path d="M2.75 8h9.5M8.75 4.5 12.25 8l-3.5 3.5" />
        </svg>
      </button>
    </form>
  );
}
