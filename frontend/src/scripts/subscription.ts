/**
 * Shared subscription handler for Blockstories forms
 * Usage:
 *   1. Add data-form-id attribute to forms (e.g., data-form-id="news_sidebar")
 *   2. Add data-pub-id attribute if different from default
 *   3. Import and call initSubscriptionForms() or initSubscriptionPopup()
 */

interface SubscriptionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

interface CustomField {
  name: string;
  value: string;
}

interface QuickSubscribeOptions {
  submittingText?: string;
  successText?: string;
  errorText?: string;
  onSuccess?: (form: HTMLFormElement, data: unknown) => void;
  onError?: (form: HTMLFormElement, error: string) => void;
}

interface InitFormsOptions {
  formSelector?: string;
  submittingText?: string;
  successText?: string;
  errorText?: string;
  onSuccess?: (form: HTMLFormElement, data: unknown) => void;
  onError?: (form: HTMLFormElement, error: string) => void;
  beforeSubmit?: (form: HTMLFormElement, email: string) => boolean | void;
}

interface PopupOptions {
  triggerSelector?: string;
  popupId?: string;
  popupFormId?: string;
  closeBtnId?: string;
  emailInputId?: string;
}

/**
 * Submit a subscription to the API
 */
export async function submitSubscription(
  email: string,
  formId: string,
  pubId: string | null = null,
  customFields: CustomField[] = []
): Promise<SubscriptionResult> {
  try {
    const payload: Record<string, unknown> = {
      email,
      utmCampaign: formId,
    };

    if (pubId) payload.publicationId = pubId;
    if (customFields.length > 0) payload.customFields = customFields;

    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Subscription failed');
    }

    return { success: true, data };
  } catch (err) {
    console.error('[Subscription] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Quick subscribe - inline form submission without popup
 */
export async function quickSubscribe(
  form: HTMLFormElement,
  options: QuickSubscribeOptions = {}
): Promise<SubscriptionResult> {
  const {
    submittingText = 'Subscribing...',
    successText = 'Subscribed!',
    errorText = 'Failed - Try Again',
    onSuccess,
    onError
  } = options;

  const formId = form.dataset.formId || 'unknown';
  const pubId = form.dataset.pubId || null;
  const emailInput = form.querySelector('input[type="email"]') as HTMLInputElement | null;
  const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
  const email = emailInput?.value?.trim();

  if (!email) return { success: false, error: 'Email required' };

  const originalText = submitBtn?.textContent || 'Subscribe';

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = submittingText;
  }

  // Collect custom fields
  const customFieldInputs = form.querySelectorAll('[data-custom-field]');
  const customFields: CustomField[] = Array.from(customFieldInputs)
    .map(input => ({
      name: (input as HTMLElement).dataset.customField || '',
      value: (input as HTMLInputElement).value
    }))
    .filter(f => f.value);

  const result = await submitSubscription(email, formId, pubId, customFields);

  if (result.success) {
    if (submitBtn) submitBtn.textContent = successText;
    if (emailInput) emailInput.value = '';

    if (onSuccess) {
      onSuccess(form, result.data);
    } else {
      setTimeout(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }, 2000);
    }
  } else {
    if (submitBtn) {
      submitBtn.textContent = errorText;
      submitBtn.disabled = false;
    }

    if (onError) {
      onError(form, result.error || 'Unknown error');
    }
  }

  return result;
}

/**
 * Initialize subscription forms with handlers
 */
export function initSubscriptionForms(options: InitFormsOptions = {}): void {
  const {
    formSelector = '[data-form-id]',
    submittingText = 'Subscribing...',
    successText = 'Subscribed!',
    errorText = 'Failed - Try Again',
    onSuccess,
    onError,
    beforeSubmit
  } = options;

  const forms = document.querySelectorAll<HTMLFormElement>(formSelector);

  forms.forEach(form => {
    form.addEventListener('submit', async (e: Event) => {
      e.preventDefault();

      const formId = form.dataset.formId || 'unknown';
      const pubId = form.dataset.pubId || null;
      const emailInput = form.querySelector('input[type="email"]') as HTMLInputElement | null;
      const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
      const email = emailInput?.value?.trim();

      if (!email) return;

      // Allow pre-submission hook to prevent submission
      if (beforeSubmit && beforeSubmit(form, email) === false) {
        return;
      }

      const originalText = submitBtn?.textContent || 'Subscribe';

      // Disable button and show loading state
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = submittingText;
      }

      // Collect custom fields if present (data-custom-field attribute)
      const customFieldInputs = form.querySelectorAll('[data-custom-field]');
      const customFields: CustomField[] = Array.from(customFieldInputs)
        .map(input => ({
          name: (input as HTMLElement).dataset.customField || '',
          value: (input as HTMLInputElement).value
        }))
        .filter(f => f.value);

      const result = await submitSubscription(email, formId, pubId, customFields);

      if (result.success) {
        if (submitBtn) submitBtn.textContent = successText;
        if (emailInput) emailInput.value = '';

        if (onSuccess) {
          onSuccess(form, result.data);
        } else {
          // Default: reset after delay
          setTimeout(() => {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = originalText;
            }
          }, 2000);
        }
      } else {
        if (submitBtn) {
          submitBtn.textContent = errorText;
          submitBtn.disabled = false;
        }

        if (onError) {
          onError(form, result.error || 'Unknown error');
        }
      }
    });
  });
}

// ═══ POPUP SUBSCRIPTION FLOW ═══

/**
 * Initialize popup-based subscription flow.
 *
 * Required HTML on your page:
 *   <div id="subPopup" class="news-popup" style="display:none;">
 *     <div class="news-popup__overlay"></div>
 *     <div class="news-popup__content">
 *       <button class="news-popup__close" id="subPopupClose">&times;</button>
 *       <h4>Complete Your Subscription</h4>
 *       <form id="subPopupForm">
 *         <input type="email" id="subEmail" name="email" readonly>
 *         <input type="text" name="role" placeholder="Role (optional)">
 *         <input type="text" name="company" placeholder="Company" required>
 *         <input type="text" name="location" placeholder="Location (optional)">
 *         <button type="submit">Subscribe</button>
 *       </form>
 *     </div>
 *   </div>
 */
export function initSubscriptionPopup(options: PopupOptions = {}): void {
  const {
    triggerSelector = '[data-use-popup]',
    popupId = 'subPopup',
    popupFormId = 'subPopupForm',
    closeBtnId = 'subPopupClose',
    emailInputId = 'subEmail'
  } = options;

  const popup = document.getElementById(popupId);
  const popupForm = document.getElementById(popupFormId) as HTMLFormElement | null;
  const closeBtn = document.getElementById(closeBtnId);
  const emailInput = document.getElementById(emailInputId) as HTMLInputElement | null;

  if (!popup || !popupForm) {
    console.warn('[Subscription Popup] Popup HTML not found. Skipping popup init.');
    return;
  }

  let activeForm: HTMLFormElement | null = null;
  let activeFormId = 'unknown';

  function openPopup(email: string, formId: string): void {
    activeFormId = formId;
    if (emailInput) emailInput.value = email;
    popup.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closePopup(): void {
    popup.style.display = 'none';
    document.body.style.overflow = '';
    activeForm = null;
    activeFormId = 'unknown';
    popupForm.reset();
  }

  // Close handlers
  closeBtn?.addEventListener('click', closePopup);
  popup.querySelector('.news-popup__overlay')?.addEventListener('click', closePopup);
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') closePopup();
  });

  // Intercept trigger forms
  const triggerForms = document.querySelectorAll<HTMLFormElement>(triggerSelector);
  triggerForms.forEach(form => {
    form.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]') as HTMLInputElement | null;
      const email = input?.value?.trim();
      if (!email) return;

      activeForm = form;
      const formId = form.dataset.formId || 'unknown';
      openPopup(email, formId);
    });
  });

  // Popup form submission
  popupForm.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    const formData = new FormData(popupForm);
    const email = formData.get('email') as string;
    const role = formData.get('role') as string;
    const company = formData.get('company') as string;
    const location = formData.get('location') as string;

    const submitBtn = popupForm.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    const originalText = submitBtn?.textContent || 'Subscribe';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Subscribing...';
    }

    const customFields: CustomField[] = [
      ...(role ? [{ name: 'Role', value: role }] : []),
      ...(company ? [{ name: 'Company', value: company }] : []),
      ...(location ? [{ name: 'Location', value: location }] : [])
    ];

    const result = await submitSubscription(email, activeFormId, null, customFields);

    if (result.success) {
      if (submitBtn) submitBtn.textContent = 'Subscribed!';
      // Clear original form
      const origInput = activeForm?.querySelector('input[type="email"]') as HTMLInputElement | null;
      if (origInput) origInput.value = '';

      setTimeout(() => {
        closePopup();
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }, 1500);
    } else {
      console.error('[Subscribe] Error:', result.error);
      if (submitBtn) {
        submitBtn.textContent = 'Failed - Try Again';
        submitBtn.disabled = false;
      }
    }
  });
}

// Auto-initialize on DOM ready if data-auto-init is present
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('[data-form-id][data-auto-init]')) {
    initSubscriptionForms();
  }
  // Auto-init popup if popup HTML exists
  if (document.getElementById('subPopup')) {
    initSubscriptionPopup();
  }
});
