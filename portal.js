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

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char]));
  }

  function fallbackPropertyImage() {
    return "https://lh3.googleusercontent.com/aida-public/AB6AXuA_KhMWlEiqFZvJLfZ18JU2pntwt5Nm-SPrvucPzCCxNUoe73N5ox13JLV9zWmFLpiCVHeOek9801Nh76NERlspf3vrCQKY1dvZThix8acrheD7XDkraZhpUWlXucHfv6LSI6uRroBcSx7_VF0hGefxTEumKAsboMT1FxNfvp9l0qa6-ylo-HVl2P9BPdFCJrrJtsnpS2HJdWjtmRqOPLPpWkC1kLKtvIIzU-RYStHt9QAplSuKbBD9Dpq1AEUMTMkUjB95R9hSes8b";
  }

  async function uploadListingPhoto(file, userId) {
    if (!db || !file || !file.size) return null;
    if (!file.type.startsWith("image/")) {
      throw new Error("Please choose an image file.");
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${userId || "admin"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext || "jpg"}`;
    const { error } = await db.storage.from("guesthouse").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
    const { data } = db.storage.from("guesthouse").getPublicUrl(path);
    return data.publicUrl;
  }

  async function uploadListingPhotos(files, userId) {
    const selected = Array.from(files || []).filter((file) => file && file.size);
    if (!selected.length) return [];
    if (selected.length > 4) {
      throw new Error("Please choose 4 pictures or fewer.");
    }
    const urls = [];
    for (const file of selected) {
      urls.push(await uploadListingPhoto(file, userId));
    }
    return urls;
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
      `<td class="p-4 font-semibold">${escapeHtml(item.property)}</td>` +
      `<td class="p-4">${escapeHtml(item.from)} - ${escapeHtml(item.to)}</td>` +
      `<td class="p-4">ETB ${Number(item.price).toLocaleString()}</td>` +
      `<td class="p-4"><span class="px-2 py-1 rounded-full ${statusClass(item.status)} text-xs font-bold">${escapeHtml(item.status)}</span></td>` +
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
      const photosInput = availabilityForm.querySelector("input[name='photos']");
      if (db) {
        const { data: authData } = await db.auth.getUser();
        if (authData.user) {
          let imageUrls = [];
          try {
            imageUrls = await uploadListingPhotos(photosInput ? photosInput.files : [], authData.user.id);
          } catch (error) {
            if (saveMessage) {
              saveMessage.textContent = "Photo upload failed, saving listing without pictures.";
              saveMessage.classList.remove("hidden");
            }
            imageUrls = [];
          }
          const listingPayload = {
            owner_id: authData.user.id,
            property_name: next.property,
            available_from: next.from,
            available_to: next.to,
            nightly_price: next.price,
            status: next.status,
          };
          const { error } = await db.from("owner_availability").insert({
            ...listingPayload,
            image_url: imageUrls[0] || null,
            image_urls: imageUrls,
          });
          if (error) {
            if (error.message && error.message.includes("image_url")) {
              const { error: fallbackError } = await db.from("owner_availability").insert(listingPayload);
              if (!fallbackError) {
                await renderAvailability();
                if (saveMessage) {
                  saveMessage.textContent = "Listing saved without pictures. Add the image columns in Supabase to save photos.";
                  saveMessage.classList.remove("hidden");
                  setTimeout(() => saveMessage.classList.add("hidden"), 3500);
                }
                availabilityForm.reset();
                return;
              }
            }
            if (saveMessage) {
              saveMessage.textContent = "Listing save failed: " + error.message;
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
        saveMessage.textContent = availabilityForm.dataset.saveSuccess || (db ? "Availability saved." : "Availability saved on this device.");
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

  const hostForm = document.querySelector("[data-host-form]");
  const hostList = document.querySelector("[data-host-list]");
  const hostMessage = document.querySelector("[data-host-message]");
  const hostCount = document.querySelector("[data-host-count]");

  function hostStatusClass(status) {
    if (status === "Approved") return "bg-[#78fac4] text-[#006c4c]";
    if (status === "Rejected") return "bg-[#ffdad8] text-[#b52330]";
    if (status === "Contacted") return "bg-[#8eeff4] text-[#00696d]";
    return "bg-[#f0eded] text-[#5a403f]";
  }

  async function renderHosts() {
    if (!hostList) return;
    let hosts = JSON.parse(localStorage.getItem("ethiostayHosts") || "[]");
    if (db) {
      const { data } = await db
        .from("host_applications")
        .select("host_name, host_email, host_phone, property_name, host_status")
        .order("created_at", { ascending: false })
        .limit(30);
      hosts = (data || []).map((item) => ({
        name: item.host_name,
        email: item.host_email,
        phone: item.host_phone,
        property: item.property_name,
        status: item.host_status,
      }));
    }
    if (hostCount) hostCount.textContent = String(hosts.length);
    if (!hosts.length) {
      hostList.innerHTML = `<tr class="border-t border-[#f0eded]"><td class="p-4 text-[#8e706f]" colspan="4">No hosts added yet.</td></tr>`;
      return;
    }
    hostList.innerHTML = hosts.map((item) => (
      `<tr class="border-t border-[#f0eded]">` +
      `<td class="p-4 font-semibold">${escapeHtml(item.name)}</td>` +
      `<td class="p-4">${escapeHtml(item.property)}</td>` +
      `<td class="p-4">${escapeHtml(item.email || item.phone || "No contact")}</td>` +
      `<td class="p-4"><span class="px-2 py-1 rounded-full ${hostStatusClass(item.status)} text-xs font-bold">${escapeHtml(item.status)}</span></td>` +
      `</tr>`
    )).join("");
  }

  if (hostForm) {
    renderHosts();
    hostForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(hostForm);
      const next = {
        name: String(data.get("host_name") || "").trim(),
        email: String(data.get("host_email") || "").trim(),
        phone: String(data.get("host_phone") || "").trim(),
        property: String(data.get("property_name") || "").trim(),
        status: String(data.get("host_status") || "New"),
      };
      if (db) {
        const { error } = await db.from("host_applications").insert({
          host_name: next.name,
          host_email: next.email || null,
          host_phone: next.phone || null,
          property_name: next.property,
          host_status: next.status,
        });
        if (error) {
          if (hostMessage) {
            hostMessage.textContent = error.message;
            hostMessage.classList.remove("hidden");
          }
          return;
        }
      } else {
        const hosts = JSON.parse(localStorage.getItem("ethiostayHosts") || "[]");
        hosts.unshift(next);
        localStorage.setItem("ethiostayHosts", JSON.stringify(hosts.slice(0, 30)));
      }
      await renderHosts();
      if (hostMessage) {
        hostMessage.textContent = db ? "Host saved." : "Host saved on this device.";
        hostMessage.classList.remove("hidden");
        setTimeout(() => hostMessage.classList.add("hidden"), 2500);
      }
      hostForm.reset();
    });
  }

  async function renderPublicAvailability() {
    const publicList = document.querySelector("[data-public-availability-list]");
    if (!publicList || !db) return;
    let { data, error } = await db
      .from("owner_availability")
      .select("property_name, available_from, available_to, nightly_price, status, image_url, image_urls")
      .eq("status", "Available")
      .order("updated_at", { ascending: false })
      .limit(12);
    if (error && error.message && error.message.includes("image_url")) {
      const fallback = await db
        .from("owner_availability")
        .select("property_name, available_from, available_to, nightly_price, status")
        .eq("status", "Available")
        .order("updated_at", { ascending: false })
        .limit(12);
      data = fallback.data;
      error = fallback.error;
    }
    if (error || !data || !data.length) return;
    publicList.innerHTML = data.map((item) => (
      `<div class="bg-white rounded-2xl overflow-hidden shadow-sm border border-surface-container group cursor-pointer" onclick="window.location.href='property.html'">` +
      `<div class="relative aspect-[4/3] overflow-hidden bg-secondary-container">` +
      `<img alt="${escapeHtml(item.property_name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${escapeHtml(item.image_url || (item.image_urls && item.image_urls[0]) || fallbackPropertyImage())}"/>` +
      `<div class="absolute top-4 left-4 flex items-center gap-1 px-2.5 py-1 bg-tertiary-fixed text-on-tertiary-fixed rounded-full shadow-lg">` +
      `<span class="text-[10px] font-bold tracking-wide uppercase">${escapeHtml(item.status)}</span>` +
      `</div>` +
      `</div>` +
      `<div class="p-stack-md">` +
      `<h3 class="font-h3 text-on-surface group-hover:text-primary transition-colors">${escapeHtml(item.property_name)}</h3>` +
      `<p class="flex items-center gap-1 text-outline text-body-md mb-stack-md mt-unit">` +
      `<span class="material-symbols-outlined text-[16px]">calendar_today</span>${escapeHtml(item.available_from)} - ${escapeHtml(item.available_to)}</p>` +
      `<div class="flex items-end justify-between border-t border-surface-container pt-stack-md">` +
      `<div class="flex flex-col"><span class="text-[10px] font-bold text-outline uppercase tracking-wider">Per Night</span>` +
      `<span class="font-h2 text-primary">ETB ${Number(item.nightly_price).toLocaleString()}</span></div>` +
      `<button class="px-6 py-2 bg-primary text-white font-label-bold rounded-lg hover:bg-primary/90 active:scale-95 transition-all" onclick="event.stopPropagation(); window.location.href='property.html'">Book</button>` +
      `</div></div></div>`
    )).join("");
  }
  renderPublicAvailability();
})();
