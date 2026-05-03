(function () {
  const configReady = Boolean(
    window.ETHIOSTAY_SUPABASE_URL &&
    window.ETHIOSTAY_SUPABASE_KEY &&
    !window.ETHIOSTAY_SUPABASE_URL.includes("PASTE_YOUR")
  );
  const db = configReady && window.supabase
    ? window.supabase.createClient(window.ETHIOSTAY_SUPABASE_URL, window.ETHIOSTAY_SUPABASE_KEY)
    : null;

  const forms = document.querySelectorAll("[data-login-role]");
  const roleEmailFallbacks = {
    admin: ["yonasmtena@gmail.com"],
    owner: ["yonastena100@gmail.com"],
  };

  function normalizeRole(role) {
    return String(role || "").trim().toLowerCase();
  }

  function emailHasRole(email, role) {
    const allowed = roleEmailFallbacks[normalizeRole(role)] || [];
    return allowed.includes(String(email || "").trim().toLowerCase());
  }

  forms.forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const email = String(data.get("email") || "").trim();
      const password = String(data.get("password") || "").trim();
      const error = form.querySelector("[data-login-error]");
      const button = form.querySelector("button[type='submit']");
      const setError = (message) => {
        if (error) {
          error.textContent = message;
          error.classList.remove("hidden");
        }
      };
      if (!email || !password) {
        setError("Enter an email and password to continue.");
        return;
      }
      if (!db) {
        setError("Supabase is not configured yet. Add your project URL and publishable key in supabase-config.js.");
        return;
      }
      if (button) button.disabled = true;
      const { data: authData, error: authError } = await db.auth.signInWithPassword({ email, password });
      if (authError || !authData.user) {
        setError(authError ? authError.message : "Login failed.");
        if (button) button.disabled = false;
        return;
      }
      const { data: profile, error: profileError } = await db
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();
      const expectedRole = normalizeRole(form.dataset.loginRole);
      const actualRole = normalizeRole(profile && profile.role);
      const emailAllowed = emailHasRole(authData.user.email, expectedRole);
      if ((profileError || !profile || actualRole !== expectedRole) && !emailAllowed) {
        await db.auth.signOut();
        setError(profileError || !profile
          ? "Login worked, but this account does not have an owner/admin profile yet."
          : "This account is set as " + actualRole + ", not " + expectedRole + "."
        );
        if (button) button.disabled = false;
        return;
      }
      window.location.href = form.dataset.target || "index.html";
    });
  });

  const requiredRole = document.body.dataset.protectedRole;
  async function protectPage() {
    if (!requiredRole) return;
    if (!db) {
      window.location.href = requiredRole === "admin" ? "admin-login.html" : "owner-login.html";
      return;
    }
    const { data: authData } = await db.auth.getUser();
    if (!authData.user) {
      window.location.href = requiredRole === "admin" ? "admin-login.html" : "owner-login.html";
      return;
    }
    const { data: profile } = await db
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();
    const hasProfileRole = profile && normalizeRole(profile.role) === normalizeRole(requiredRole);
    const hasEmailRole = emailHasRole(authData.user.email, requiredRole);
    if (!hasProfileRole && !hasEmailRole) {
      await db.auth.signOut();
      window.location.href = requiredRole === "admin" ? "admin-login.html" : "owner-login.html";
    }
  }
  protectPage();

  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", async () => {
      const role = document.body.dataset.protectedRole;
      if (db) await db.auth.signOut();
      window.location.href = role === "admin" ? "admin-login.html" : "owner-login.html";
    });
  });

  const availabilityForm = document.querySelector("[data-availability-form]");
  const availabilityList = document.querySelector("[data-availability-list]");
  const saveMessage = document.querySelector("[data-save-message]");

  function statusClass(status) {
    if (status === "Booked") return "bg-[#ffdad8] text-[#b52330]";
    if (status === "Maintenance") return "bg-[#f0eded] text-[#5a403f]";
    return "bg-[#78fac4] text-[#006c4c]";
  }

  async function renderAvailability() {
    if (!availabilityList) return;
    let saved = JSON.parse(localStorage.getItem("ethiostayAvailability") || "[]");
    if (db) {
      const { data } = await db
        .from("owner_availability")
        .select("property_name, available_from, available_to, nightly_price, status")
        .order("updated_at", { ascending: false })
        .limit(20);
      saved = (data || []).map((item) => ({
        property: item.property_name,
        from: item.available_from,
        to: item.available_to,
        price: item.nightly_price,
        status: item.status,
      }));
    }
    if (!saved.length) return;
    availabilityList.innerHTML = saved.map((item) => (
      `<tr class="border-t border-[#f0eded]">` +
      `<td class="p-4 font-semibold">${item.property}</td>` +
      `<td class="p-4">${item.from} - ${item.to}</td>` +
      `<td class="p-4">ETB ${Number(item.price).toLocaleString()}</td>` +
      `<td class="p-4"><span class="px-2 py-1 rounded-full ${statusClass(item.status)} text-xs font-bold">${item.status}</span></td>` +
      `</tr>`
    )).join("");
  }

  if (availabilityForm) {
    renderAvailability();
    availabilityForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(availabilityForm);
      const next = {
        property: String(data.get("property") || ""),
        from: String(data.get("from") || ""),
        to: String(data.get("to") || ""),
        price: String(data.get("price") || ""),
        status: String(data.get("status") || "Available"),
      };
      if (db) {
        const { data: authData } = await db.auth.getUser();
        if (authData.user) {
          const { error } = await db.from("owner_availability").insert({
            owner_id: authData.user.id,
            property_name: next.property,
            available_from: next.from,
            available_to: next.to,
            nightly_price: next.price,
            status: next.status,
          });
          if (error) {
            if (saveMessage) {
              saveMessage.textContent = error.message;
              saveMessage.classList.remove("hidden");
            }
            return;
          }
        }
      } else {
        const saved = JSON.parse(localStorage.getItem("ethiostayAvailability") || "[]");
        saved.unshift(next);
        localStorage.setItem("ethiostayAvailability", JSON.stringify(saved.slice(0, 20)));
      }
      await renderAvailability();
      if (saveMessage) {
        saveMessage.textContent = db ? "Availability saved." : "Availability saved on this device.";
        saveMessage.classList.remove("hidden");
        setTimeout(() => saveMessage.classList.add("hidden"), 2500);
      }
      availabilityForm.reset();
    });
  }

  async function renderAdminBookings() {
    if (!db) return;
    const bookingsList = document.querySelector("[data-bookings-list]");
    const bookingCount = document.querySelector("[data-booking-count]");
    const pendingCount = document.querySelector("[data-pending-count]");
    if (!bookingsList) return;
    const { data } = await db
      .from("bookings")
      .select("guest_name, property_name, booking_status, deposit_status")
      .order("created_at", { ascending: false })
      .limit(20);
    if (!data) return;
    bookingCount && (bookingCount.textContent = String(data.length));
    pendingCount && (pendingCount.textContent = String(data.filter((item) => item.deposit_status === "Pending").length));
    if (data.length) {
      bookingsList.innerHTML = data.map((item) => (
        `<tr class="border-t border-[#f0eded]">` +
        `<td class="p-4 font-semibold">${item.guest_name}</td>` +
        `<td class="p-4">${item.property_name}</td>` +
        `<td class="p-4"><span class="px-2 py-1 rounded-full bg-[#ffdad8] text-[#b52330] text-xs font-bold">${item.booking_status}</span></td>` +
        `<td class="p-4">${item.deposit_status}</td>` +
        `</tr>`
      )).join("");
    }
  }
  renderAdminBookings();
})();
