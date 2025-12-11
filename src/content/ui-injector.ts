// Inject "Save to Anki" button into Kagi Translate UI

export class UIInjector {
  private button: HTMLButtonElement | null = null;
  private toast: HTMLDivElement | null = null;
  private onSaveCallback: (() => void) | null = null;
  private observer: MutationObserver | null = null;
  private pageType: 'translate' | 'dictionary';

  constructor(pageType: 'translate' | 'dictionary' = 'translate') {
    this.pageType = pageType;
    this.injectButton();
    this.injectToastContainer();
  }

  private injectButton(): void {
    // For dictionary pages, inject floating button immediately
    if (this.pageType === 'dictionary') {
      this.injectFloatingButton();
      return;
    }

    // For translation pages, try toolbar injection
    const tryInjectToolbar = (): boolean => {
      if (this.button) return true; // Already injected

      // Look for the bottom toolbar that contains copy/download buttons (translation page)
      const toolbar = document.querySelector(".fixed.z-\\[25\\]");

      if (toolbar) {
        // Create button container to match Kagi's style
        const buttonWrapper = document.createElement("div");
        buttonWrapper.className = "svelte-11extwn";

        this.button = document.createElement("button");
        this.button.id = "kagi-to-anki-button";
        this.button.type = "button";
        this.button.className =
          "focus-visible:ring-focus-ring flex items-center justify-center rounded-md focus:outline-none focus-visible:ring-2 cursor-pointer hover:bg-general-hover-states h-[34px] px-3 svelte-12mfc9g kagi-to-anki-toolbar-btn";
        this.button.setAttribute("aria-label", "Save to Anki");
        this.button.innerHTML = '<span class="text-sm">Save to Anki</span>';
        this.button.style.display = "none"; // Hidden until translation is ready

        this.button.addEventListener("click", () => {
          if (this.onSaveCallback) {
            this.onSaveCallback();
          }
        });

        buttonWrapper.appendChild(this.button);

        // Insert into the toolbar - find the flex container with buttons
        const buttonContainer = toolbar.querySelector(
          ".flex.items-center.gap-2"
        );
        if (buttonContainer) {
          // Insert at the beginning (prepend) instead of end
          buttonContainer.insertBefore(
            buttonWrapper,
            buttonContainer.firstChild
          );
        } else {
          // Fallback: append to toolbar directly
          toolbar.appendChild(buttonWrapper);
        }

        this.stopObserving();
        return true;
      }

      return false;
    };

    // Try immediate toolbar injection
    if (tryInjectToolbar()) return;

    // Use MutationObserver to watch for toolbar appearance
    this.observer = new MutationObserver(() => {
      tryInjectToolbar();
    });

    // Observe the entire document body for changes
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // After 2 seconds, if toolbar not found, create floating button
    setTimeout(() => {
      if (!this.button) {
        this.injectFloatingButton();
      }
    }, 2000);
  }

  private injectFloatingButton(): void {
    if (this.button) return; // Already injected

    // Create a floating button for pages without the toolbar (e.g., dictionary page)
    this.button = document.createElement("button");
    this.button.id = "kagi-to-anki-button";
    this.button.type = "button";
    this.button.className = "kagi-to-anki-floating-btn";
    this.button.setAttribute("aria-label", "Save to Anki");
    this.button.innerHTML = "Save to Anki";
    this.button.style.display = "none"; // Hidden until entry is ready

    this.button.addEventListener("click", () => {
      if (this.onSaveCallback) {
        this.onSaveCallback();
      }
    });

    document.body.appendChild(this.button);
    this.stopObserving();
  }

  private stopObserving(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  private injectToastContainer(): void {
    this.toast = document.createElement("div");
    this.toast.id = "kagi-to-anki-toast";
    this.toast.className = "kagi-to-anki-toast";
    document.body.appendChild(this.toast);
  }

  public showButton(): void {
    if (this.button) {
      this.button.style.display = "inline-flex";
    }
  }

  public hideButton(): void {
    if (this.button) {
      this.button.style.display = "none";
    }
  }

  public setLoading(loading: boolean): void {
    if (!this.button) return;

    if (loading) {
      this.button.disabled = true;
      this.button.innerHTML = "Saving...";
    } else {
      this.button.disabled = false;
      this.button.innerHTML = "Save to Anki";
    }
  }

  public showToast(
    message: string,
    type: "success" | "error" = "success"
  ): void {
    if (!this.toast) return;

    this.toast.textContent = message;
    this.toast.className = `kagi-to-anki-toast ${type} show`;

    setTimeout(() => {
      this.toast?.classList.remove("show");
    }, 3000);
  }

  public onSave(callback: () => void): void {
    this.onSaveCallback = callback;
  }

  public updateButtonText(text: string): void {
    if (this.button && !this.button.disabled) {
      this.button.innerHTML = text;
    }
  }
}
