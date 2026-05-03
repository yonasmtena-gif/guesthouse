(function () {
  const forms = document.querySelectorAll("[data-login-role]");
  forms.forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const email = String(data.get("email") || "").trim();
      const password = String(data.get("password") || "").trim();
      const error = form.querySelector("[data-login-error]");
      if (!email || !password) {
        error && error.classList.remove("hidden");
        return;
      }
      localStorage.setItem("ethiostayRole", form.dataset.loginRole || "");
      localStorage.setItem("ethiostayUser", email);
      window.location.href = form.dataset.target || "index.html";
    });
  });

  const requiredRole = document.body.dataset.protectedRole;
  if (requiredRole && localStorage.getItem("ethiostayRole") !== requiredRole) {
    window.location.href = requiredRole === "admin" ? "admin-login.html" : "owner-login.html";
  }

  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", () => {
      const role = localStorage.getItem("ethiostayRole");
      localStorage.removeItem("ethiostayRole");
      localStorage.removeItem("ethiostayUser");
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

  function renderAvailability() {
    if (!availabilityList) return;
    const saved = JSON.parse(localStorage.getItem("ethiostayAvailability") || "[]");
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
    availabilityForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(availabilityForm);
      const next = {
        property: String(data.get("property") || ""),
        from: String(data.get("from") || ""),
        to: String(data.get("to") || ""),
        price: String(data.get("price") || ""),
        status: String(data.get("status") || "Available"),
      };
      const saved = JSON.parse(localStorage.getItem("ethiostayAvailability") || "[]");
      saved.unshift(next);
      localStorage.setItem("ethiostayAvailability", JSON.stringify(saved.slice(0, 20)));
      renderAvailability();
      if (saveMessage) {
        saveMessage.classList.remove("hidden");
        setTimeout(() => saveMessage.classList.add("hidden"), 2500);
      }
      availabilityForm.reset();
    });
  }
})();
