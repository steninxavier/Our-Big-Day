"use client";

import { type ChangeEvent, type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./wedding-onboarding.module.css";

type FieldName = "brideName" | "groomName" | "weddingDate" | "city" | "title" | "description" | "timeZone";
type FieldErrors = Partial<Record<FieldName, string>>;

type WeddingApiResponse = {
  error?: {
    message?: string;
  };
};

const initialValues: Record<FieldName, string> = {
  brideName: "",
  groomName: "",
  weddingDate: "",
  city: "",
  title: "",
  description: "",
  timeZone: "Asia/Kolkata",
};

const fieldOrder: FieldName[] = [
  "brideName",
  "groomName",
  "weddingDate",
  "city",
  "timeZone",
  "title",
  "description",
];

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validateField(name: FieldName, values: Record<FieldName, string>) {
  const value = values[name].trim();

  if (name === "brideName" || name === "groomName") {
    if (!value) return `Enter the ${name === "brideName" ? "bride" : "groom"}’s name.`;
    if (value.length > 120) return "Use 120 characters or fewer.";
    return undefined;
  }

  if (name === "weddingDate") {
    if (!values.weddingDate) return "Choose the wedding date.";
    if (!isValidDate(values.weddingDate)) return "Choose a valid wedding date.";
    return undefined;
  }

  if (name === "city") {
    if (!value) return "Enter the city or wedding location.";
    if (value.length > 120) return "Use 120 characters or fewer.";
    return undefined;
  }

  if (name === "title" && value.length > 180) return "Use 180 characters or fewer.";
  if (name === "description" && value.length > 2_000) return "Use 2,000 characters or fewer.";
  if (name === "timeZone" && !value) return "Choose the wedding time zone.";

  return undefined;
}

function getFormErrors(values: Record<FieldName, string>): FieldErrors {
  return Object.fromEntries(
    Object.keys(values).map((name) => [name, validateField(name as FieldName, values)]),
  ) as FieldErrors;
}

function hasErrors(errors: FieldErrors) {
  return Object.values(errors).some(Boolean);
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p className={styles.fieldError} id={id} aria-live="polite">
      {message}
    </p>
  ) : null;
}

export default function WeddingOnboardingForm() {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  function updateField(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const name = event.target.name as FieldName;
    const value = event.target.value;
    const nextValues = { ...values, [name]: value };

    setValues(nextValues);
    setFormError("");

    if (touched[name]) {
      setErrors((current) => ({ ...current, [name]: validateField(name, nextValues) }));
    }
  }

  function markTouched(name: FieldName) {
    setTouched((current) => ({ ...current, [name]: true }));
    setErrors((current) => ({ ...current, [name]: validateField(name, values) }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = getFormErrors(values);
    setTouched({
      brideName: true,
      groomName: true,
      weddingDate: true,
      city: true,
      title: true,
      description: true,
      timeZone: true,
    });
    setErrors(nextErrors);
    setFormError("");

    if (hasErrors(nextErrors)) {
      setFormError("Please correct the highlighted fields and try again.");

      // `hasErrors(nextErrors)` guarantees that one of the ordered fields is invalid.
      const firstInvalidField = fieldOrder.find((name) => Boolean(nextErrors[name]))!;
      window.requestAnimationFrame(() => document.getElementById(firstInvalidField)?.focus());

      return;
    }

    setIsSubmitting(true);

    try {
      const title = values.title.trim();
      const description = values.description.trim();
      const city = values.city.trim();
      const response = await fetch("/api/wedding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brideName: values.brideName.trim(),
          groomName: values.groomName.trim(),
          weddingDate: values.weddingDate,
          timeZone: values.timeZone,
          location: {
            city,
            formattedAddress: city,
          },
          ...(title ? { title } : {}),
          ...(description ? { description } : {}),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as WeddingApiResponse;

      if (!response.ok) {
        setFormError(payload.error?.message ?? "We could not create your wedding. Please try again.");
        return;
      }

      router.replace("/dashboard");
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
        <div className={styles.formError} role="alert">
          <svg className={styles.formErrorIcon} aria-hidden="true" viewBox="0 0 20 20">
            <path d="M10 6.3v4.5M10 14.2v.1M8.16 2.9 1.93 14.05A2.1 2.1 0 0 0 3.77 17h12.46a2.1 2.1 0 0 0 1.84-2.95L11.84 2.9a2.1 2.1 0 0 0-3.68 0Z" />
          </svg>
          <p>{formError}</p>
        </div>
      ) : null}

      <div className={styles.fieldGrid}>
        <div className={styles.fieldGroup}>
          <label htmlFor="brideName">
            <span>Bride’s name</span>
            <em>Required</em>
          </label>
          <input
            aria-describedby={errors.brideName && touched.brideName ? "brideName-error" : undefined}
            aria-invalid={Boolean(errors.brideName && touched.brideName)}
            autoComplete="given-name"
            id="brideName"
            maxLength={120}
            name="brideName"
            onBlur={() => markTouched("brideName")}
            onChange={updateField}
            placeholder="e.g. Liya"
            required
            type="text"
            value={values.brideName}
          />
          <FieldError id="brideName-error" message={touched.brideName ? errors.brideName : undefined} />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="groomName">
            <span>Groom’s name</span>
            <em>Required</em>
          </label>
          <input
            aria-describedby={errors.groomName && touched.groomName ? "groomName-error" : undefined}
            aria-invalid={Boolean(errors.groomName && touched.groomName)}
            autoComplete="given-name"
            id="groomName"
            maxLength={120}
            name="groomName"
            onBlur={() => markTouched("groomName")}
            onChange={updateField}
            placeholder="e.g. John"
            required
            type="text"
            value={values.groomName}
          />
          <FieldError id="groomName-error" message={touched.groomName ? errors.groomName : undefined} />
        </div>
      </div>

      <div className={styles.fieldGrid}>
        <div className={styles.fieldGroup}>
          <label htmlFor="weddingDate">
            <span>Wedding date</span>
            <em>Required</em>
          </label>
          <input
            aria-describedby={errors.weddingDate && touched.weddingDate ? "weddingDate-error" : undefined}
            aria-invalid={Boolean(errors.weddingDate && touched.weddingDate)}
            id="weddingDate"
            name="weddingDate"
            onBlur={() => markTouched("weddingDate")}
            onChange={updateField}
            required
            type="date"
            value={values.weddingDate}
          />
          <FieldError id="weddingDate-error" message={touched.weddingDate ? errors.weddingDate : undefined} />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="city">
            <span>City or wedding location</span>
            <em>Required</em>
          </label>
          <input
            aria-describedby={errors.city && touched.city ? "city-error" : undefined}
            aria-invalid={Boolean(errors.city && touched.city)}
            autoComplete="address-level2"
            id="city"
            maxLength={120}
            name="city"
            onBlur={() => markTouched("city")}
            onChange={updateField}
            placeholder="e.g. Kochi, Kerala"
            required
            type="text"
            value={values.city}
          />
          <FieldError id="city-error" message={touched.city ? errors.city : undefined} />
        </div>
      </div>

      <div className={styles.fieldGrid}>
        <div className={styles.fieldGroup}>
          <label htmlFor="timeZone">
            <span>Wedding time zone</span>
            <em>Required</em>
          </label>
          <select
            aria-describedby={errors.timeZone && touched.timeZone ? "timeZone-error" : undefined}
            aria-invalid={Boolean(errors.timeZone && touched.timeZone)}
            id="timeZone"
            name="timeZone"
            onBlur={() => markTouched("timeZone")}
            onChange={updateField}
            required
            value={values.timeZone}
          >
            <option value="Asia/Kolkata">India Standard Time · Asia/Kolkata</option>
            <option value="Asia/Dubai">Gulf Standard Time · Asia/Dubai</option>
            <option value="Europe/London">United Kingdom · Europe/London</option>
            <option value="Europe/Berlin">Central European Time · Europe/Berlin</option>
            <option value="America/New_York">Eastern Time · America/New_York</option>
            <option value="America/Los_Angeles">Pacific Time · America/Los_Angeles</option>
            <option value="Australia/Sydney">Australian Eastern Time · Australia/Sydney</option>
          </select>
          <FieldError id="timeZone-error" message={touched.timeZone ? errors.timeZone : undefined} />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="title">
            <span>Wedding title</span>
            <em>Optional</em>
          </label>
          <input
            aria-describedby={errors.title && touched.title ? "title-error" : undefined}
            aria-invalid={Boolean(errors.title && touched.title)}
            id="title"
            maxLength={180}
            name="title"
            onBlur={() => markTouched("title")}
            onChange={updateField}
            placeholder="e.g. Liya & John"
            type="text"
            value={values.title}
          />
          <FieldError id="title-error" message={touched.title ? errors.title : undefined} />
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <label htmlFor="description">
          <span>A note about your celebration</span>
          <em>Optional</em>
        </label>
        <textarea
          aria-describedby={errors.description && touched.description ? "description-error" : "description-hint"}
          aria-invalid={Boolean(errors.description && touched.description)}
          id="description"
          maxLength={2_000}
          name="description"
          onBlur={() => markTouched("description")}
          onChange={updateField}
          placeholder="A few words for your wedding space…"
          rows={3}
          value={values.description}
        />
        <p className={styles.deferredNote} id="description-hint">
          <svg className={styles.deferredIcon} aria-hidden="true" viewBox="0 0 20 20">
            <path d="M10 3.2a6.8 6.8 0 1 0 6.8 6.8M10 6.4v4.1l2.7 1.6" />
          </svg>
          <span>You can add a cover image later, once private wedding photo storage is available.</span>
        </p>
        <FieldError id="description-error" message={touched.description ? errors.description : undefined} />
      </div>

      <button className={styles.submitButton} disabled={isSubmitting} type="submit">
        <span>{isSubmitting ? "Creating your wedding…" : "Create wedding space"}</span>
        <svg aria-hidden="true" viewBox="0 0 16 16">
          <path d="M2.75 8h9.5M8.75 4.5 12.25 8l-3.5 3.5" />
        </svg>
      </button>

      <p className={styles.formPrivacy}>
        Your details are private and used only to create your wedding space.
      </p>
    </form>
  );
}
