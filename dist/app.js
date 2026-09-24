const launchCodes = ["CUL-210", "BAK-108", "BAK-107", "CUL-205", "CUL-202"];
const launchOrder = new Map(launchCodes.map((code, index) => [code, index]));
const imageUrl = id => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;
const feeText = fee => `S$${new Intl.NumberFormat("en-SG", { maximumFractionDigits: 0 }).format(fee)}`;
const grid = document.querySelector("#course-grid");
const count = document.querySelector("#results-count");
const empty = document.querySelector("#empty-state");
const error = document.querySelector("#load-error");
const search = document.querySelector("#course-search");
const chips = [...document.querySelectorAll(".filter-chip")];
const dialog = document.querySelector("#course-assistant");
const openAssistant = document.querySelector("#open-assistant");
const closeAssistant = document.querySelector("#close-assistant");
const assistantForm = document.querySelector("#assistant-form");
const assistantResults = document.querySelector("#assistant-results");
const signupDialog = document.querySelector("#signup-dialog");
const signupForm = document.querySelector("#signup-form");
const signupSuccess = document.querySelector("#signup-success");
const allergyWarning = document.querySelector("#allergy-warning");
const signupStorageError = document.querySelector("#signup-storage-error");
let courses = [];
let category = "All";
let selectedCourse = null;
let signupTrigger = null;

function element(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
}

function detail(list, label, value, className = "") {
  const wrap = element("div", className);
  wrap.append(element("dt", "", label), element("dd", "", value));
  list.append(wrap);
}

function card(course) {
  const article = element("article", "course-card");
  article.id = `course-${course.code.toLowerCase()}`;
  const imageWrap = element("div", "course-image");
  const image = element("img");
  image.src = imageUrl(course.img);
  image.alt = `${course.title} course food`;
  image.width = 900;
  image.height = 580;
  image.loading = "lazy";
  imageWrap.append(image);
  const body = element("div", "course-body");
  const top = element("div", "course-topline");
  [course.code, course.level, course.campus].forEach(value => top.append(element("span", "", value)));
  body.append(top);
  if (launchOrder.has(course.code)) body.append(element("span", "launch-label", "Start here"));
  body.append(element("h3", "", course.title), element("p", "course-summary", course.summary));
  const details = element("dl", "course-details");
  detail(details, "Length", `${course.weeks} ${course.weeks === 1 ? "week" : "weeks"}`);
  detail(details, "Sessions", String(course.weeks));
  detail(details, "Schedule", course.when, "schedule");
  body.append(details);
  const fee = element("div", "course-fee");
  fee.append(element("span", "", "Total fee"), element("strong", "", feeText(course.fee)));
  body.append(fee);
  const signUp = element("button", "button button-primary card-signup", "Sign up");
  signUp.type = "button";
  signUp.setAttribute("aria-label", `Sign up for ${course.title}`);
  signUp.addEventListener("click", () => openSignup(course, signUp));
  body.append(signUp);
  article.append(imageWrap, body);
  return article;
}

function clearProblem(field) {
  field.removeAttribute("aria-invalid");
  const message = document.querySelector(`#${field.id}-error`);
  if (message) { message.textContent = ""; message.hidden = true; }
}

function showProblem(field, message) {
  field.setAttribute("aria-invalid", "true");
  const inline = document.querySelector(`#${field.id}-error`);
  inline.textContent = message;
  inline.hidden = false;
  field.focus();
}

function updateAllergyWarning() {
  allergyWarning.hidden = !(/nut/i.test(document.querySelector("#signup-allergies").value) && /nut/i.test(selectedCourse?.allergens || ""));
}

function openSignup(course, trigger) {
  selectedCourse = course;
  signupTrigger = trigger;
  signupForm.reset();
  signupForm.hidden = false;
  signupSuccess.hidden = true;
  signupStorageError.hidden = true;
  signupStorageError.textContent = "";
  signupForm.querySelectorAll("[aria-invalid]").forEach(clearProblem);
  document.querySelector("#signup-course-code").textContent = course.code;
  document.querySelector("#signup-course-title").textContent = course.title;
  document.querySelector("#signup-course-fee").textContent = feeText(course.fee);
  document.querySelector("#signup-course-weeks").textContent = `${course.weeks} ${course.weeks === 1 ? "week" : "weeks"}`;
  document.querySelector("#signup-course-schedule").textContent = course.when;
  document.querySelector("#signup-course-campus").textContent = course.campus;
  const intake = document.querySelector("#signup-intake");
  intake.replaceChildren(...course.intakes.map(date => {
    const option = element("option", "", date);
    option.value = date;
    return option;
  }));
  updateAllergyWarning();
  signupDialog.showModal();
  intake.focus();
}

function singaporeDate() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = type => parts.find(item => item.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function storedSignups() {
  const saved = localStorage.getItem("cb_signups");
  if (!saved) return [];
  const signups = JSON.parse(saved);
  if (!Array.isArray(signups)) throw new Error("Invalid sign-up data");
  return signups;
}

function nextReference(signups, date) {
  const prefix = `CB-${date.replaceAll("-", "")}-`;
  const largest = signups.reduce((max, signup) => signup.ref?.startsWith(prefix) ? Math.max(max, Number(signup.ref.slice(prefix.length)) || 0) : max, 0);
  if (largest >= 9999) throw new Error("Reference numbers are full for today");
  return `${prefix}${String(largest + 1).padStart(4, "0")}`;
}

function mailtoFor(signup) {
  const subject = `Course sign-up ${signup.ref}`;
  const body = [
    `Reference: ${signup.ref}`, `Course: ${signup.course_code} — ${signup.course_title}`,
    `Intake: ${signup.intake}`, `Fee: ${feeText(signup.fee)}`, `Length: ${signup.weeks} ${signup.weeks === 1 ? "week" : "weeks"}`,
    `Schedule: ${signup.schedule}`, `Campus: ${signup.campus}`, `Full name: ${signup.full_name}`,
    `Email: ${signup.email}`, `Mobile: ${signup.mobile}`, `Experience: ${signup.experience}`,
    `Allergies: ${signup.allergies || "None given"}`, `Contact consent: yes`, `Newsletter opt-in: ${signup.marketing_opt_in}`
  ].join("\n");
  return `mailto:enrol@cookbakeacademy.sg?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

signupForm.addEventListener("input", event => {
  if (event.target.id) clearProblem(event.target);
  if (event.target.id === "signup-allergies") updateAllergyWarning();
});
signupForm.addEventListener("change", event => { if (event.target.id) clearProblem(event.target); });
document.querySelectorAll("[data-close-signup]").forEach(button => button.addEventListener("click", () => signupDialog.close()));
signupDialog.addEventListener("click", event => { if (event.target === signupDialog) signupDialog.close(); });
signupDialog.addEventListener("close", () => { if (signupTrigger?.isConnected) signupTrigger.focus(); });

signupForm.addEventListener("submit", event => {
  event.preventDefault();
  const intake = document.querySelector("#signup-intake");
  const name = document.querySelector("#signup-name");
  const email = document.querySelector("#signup-email");
  const mobile = document.querySelector("#signup-mobile");
  const consent = document.querySelector("#signup-consent");
  const allergies = document.querySelector("#signup-allergies");
  for (const field of [intake, name, email, mobile, consent]) clearProblem(field);
  if (!selectedCourse.intakes.includes(intake.value)) return showProblem(intake, "Choose an intake date.");
  if (Array.from(name.value.trim()).length < 2) return showProblem(name, "Enter your full name (at least 2 characters).");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) return showProblem(email, "Enter a valid email address.");
  if (!/^(?:\+65 ?)?[689]\d{3} ?\d{4}$/.test(mobile.value.trim())) return showProblem(mobile, "Enter a Singapore mobile such as +65 9123 4567 or 91234567.");
  if (!consent.checked) return showProblem(consent, "Agree to be contacted about this sign-up.");
  updateAllergyWarning();
  try {
    const signups = storedSignups();
    const submitted = singaporeDate();
    const signup = {
      ref: nextReference(signups, submitted), submitted,
      course_code: selectedCourse.code, course_title: selectedCourse.title,
      fee: selectedCourse.fee, weeks: selectedCourse.weeks, schedule: selectedCourse.when, campus: selectedCourse.campus,
      intake: intake.value, full_name: name.value.trim(), email: email.value.trim(), mobile: mobile.value.trim(),
      experience: document.querySelector("#signup-experience").value, allergies: allergies.value.trim(),
      consent: true, marketing_opt_in: document.querySelector("#signup-newsletter").checked ? "yes" : "no", paid: "no"
    };
    localStorage.setItem("cb_signups", JSON.stringify([...signups, signup]));
    document.querySelector("#signup-reference").textContent = signup.ref;
    document.querySelector("#signup-mailto").href = mailtoFor(signup);
    signupForm.hidden = true;
    signupSuccess.hidden = false;
    document.querySelector("#signup-mailto").focus();
  } catch {
    signupStorageError.textContent = "We couldn't save this sign-up on this device. Check your browser storage and try again.";
    signupStorageError.hidden = false;
  }
});

function setCategory(next) {
  category = next;
  chips.forEach(chip => {
    const active = chip.dataset.category === next;
    chip.classList.toggle("is-active", active);
    chip.setAttribute("aria-pressed", String(active));
  });
  render();
}

function render() {
  const query = search.value.trim().toLocaleLowerCase("en-SG");
  const matches = courses.filter(course => (category === "All" || course.cat === category) &&
    [course.code, course.title, course.summary, course.level, course.campus].some(value => value.toLocaleLowerCase("en-SG").includes(query)));
  grid.replaceChildren(...matches.map(card));
  count.textContent = `Showing ${matches.length} of ${courses.length} courses`;
  empty.hidden = matches.length !== 0 || courses.length === 0;
}

chips.forEach(chip => chip.addEventListener("click", () => setCategory(chip.dataset.category)));
search.addEventListener("input", render);
openAssistant.addEventListener("click", () => dialog.showModal());
closeAssistant.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener("close", () => openAssistant.focus());

assistantForm.addEventListener("submit", event => {
  event.preventDefault();
  const interest = document.querySelector("#assistant-interest").value;
  const level = document.querySelector("#assistant-level").value;
  const matches = courses.filter(course => (interest === "All" || course.cat === interest) && (level === "Any" || course.level === level)).slice(0, 3);
  assistantResults.replaceChildren(element("h3", "", "A few classes to consider"));
  if (!matches.length) {
    assistantResults.append(element("p", "assistant-empty", "No courses match those choices. Try another level or interest."));
    return;
  }
  const list = element("ul", "assistant-list");
  matches.forEach(course => {
    const item = element("li");
    item.append(element("strong", "", course.title), element("span", "", `${course.level} · ${course.campus} · ${course.weeks} ${course.weeks === 1 ? "week" : "weeks"} · ${feeText(course.fee)}`));
    const button = element("button", "", "View in catalogue");
    button.type = "button";
    button.setAttribute("aria-label", `View ${course.title} in catalogue`);
    button.addEventListener("click", () => {
      search.value = course.code;
      setCategory("All");
      dialog.close();
      document.querySelector("#courses").scrollIntoView();
      search.focus();
    });
    item.append(button);
    list.append(item);
  });
  assistantResults.append(list);
});

fetch("data/courses.json")
  .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
  .then(data => {
    if (!Array.isArray(data)) throw new Error("Expected course list");
    courses = data.sort((a, b) => (launchOrder.get(a.code) ?? 100) - (launchOrder.get(b.code) ?? 100));
    render();
  })
  .catch(() => {
    count.textContent = "";
    error.hidden = false;
    openAssistant.disabled = true;
  });
